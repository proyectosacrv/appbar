"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { TableSessionCard } from "./TableSessionCard";
import { CreateOrderDialog } from "./CreateOrderDialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShoppingBag,
  Plus,
  History,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playNewOrderSound } from "@/lib/notifications";
import { isSessionComplete } from "@/lib/order-state";
import type { Order, TableSession } from "@/types/database";

function groupOrdersIntoSessions(orders: Order[]): TableSession[] {
  const sessionMap = new Map<string, Order[]>();

  for (const order of orders) {
    const existing = sessionMap.get(order.session_id) ?? [];
    existing.push(order);
    sessionMap.set(order.session_id, existing);
  }

  const sessions: TableSession[] = [];
  for (const [sessionId, subOrders] of sessionMap.entries()) {
    if (isSessionComplete(subOrders)) continue;

    const sorted = [...subOrders].sort(
      (a, b) => a.sub_order_number - b.sub_order_number
    );
    const totalAmount = sorted.reduce((sum, o) => sum + o.total, 0);
    const oldestCreatedAt = sorted.reduce(
      (oldest, o) =>
        new Date(o.created_at) < new Date(oldest) ? o.created_at : oldest,
      sorted[0].created_at
    );
    sessions.push({
      sessionId,
      tableNumber: sorted[0].table_number,
      subOrders: sorted,
      totalAmount,
      oldestCreatedAt,
    });
  }

  return sessions.sort(
    (a, b) =>
      new Date(a.oldestCreatedAt).getTime() -
      new Date(b.oldestCreatedAt).getTime()
  );
}

interface OrdersBoardProps {
  barId: string;
  barSlug: string;
}

export function OrdersBoard({ barId, barSlug }: OrdersBoardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleNewOrder = useCallback(() => {
    if (soundEnabled) playNewOrderSound();
  }, [soundEnabled]);

  const { orders, loading, refetchOrder, removeOrdersLocal } = useRealtimeOrders(
    barId,
    handleNewOrder
  );

  const sessions = useMemo(() => groupOrdersIntoSessions(orders), [orders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo pedido
        </Button>

        <Button
          variant="outline"
          size="icon"
          title={
            soundEnabled ? "Silenciar notificaciones" : "Activar notificaciones"
          }
          onClick={() => setSoundEnabled((v) => !v)}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-2 ml-auto"
        >
          <Link href={`/admin/${barSlug}/history`}>
            <History className="h-4 w-4" />
            Historial
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando pedidos...
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">No hay pedidos activos</p>
          <p className="text-sm">
            Los nuevos pedidos aparecerán aquí automáticamente
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <TableSessionCard
              key={session.sessionId}
              session={session}
              barSlug={barSlug}
              onRefetch={refetchOrder}
              onLocalRemove={removeOrdersLocal}
            />
          ))}
        </div>
      )}

      <CreateOrderDialog
        barId={barId}
        barSlug={barSlug}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
