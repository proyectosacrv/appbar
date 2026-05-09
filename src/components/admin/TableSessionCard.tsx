"use client";

import { useState } from "react";
import {
  Clock,
  AlertTriangle,
  X,
  Edit2,
  ChevronDown,
  ChevronUp,
  Banknote,
  Trash2,
  BadgeEuro,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { EditOrderDialog } from "./EditOrderDialog";
import { CobrarDialog } from "./CobrarDialog";
import {
  advanceStatusGroup,
  deleteOrder,
  deleteSession,
} from "@/actions/orders";
import { formatShortTime, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import { useBarConfig } from "@/lib/bar-config";
import {
  STATUS_FLOW,
  advanceLabels,
  nextStatus,
  previousStatus,
  statusLabels,
} from "@/lib/order-status";
import type { Order, OrderStatus, TableSession } from "@/types/database";

interface StatusGroup {
  status: OrderStatus;
  orders: Order[];
}

interface TableSessionCardProps {
  session: TableSession;
  barSlug: string;
  onRefetch: (orderId: string) => void;
  onLocalRemove?: (orderIds: string[]) => void;
}

export function TableSessionCard({
  session,
  barSlug,
  onRefetch,
  onLocalRemove,
}: TableSessionCardProps) {
  const { oldOrderThresholdMin } = useBarConfig();
  const [collapsed, setCollapsed] = useState(false);
  const [advancingGroup, setAdvancingGroup] = useState<OrderStatus | null>(null);
  const [revertingGroup, setRevertingGroup] = useState<OrderStatus | null>(null);
  const [cobroOpen, setCobroOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Group sub-orders by status (only active statuses, most advanced first)
  const statusGroups: StatusGroup[] = [...STATUS_FLOW]
    .reverse()
    .map((status) => ({
      status,
      orders: session.subOrders.filter((o) => o.status === status),
    }))
    .filter((g) => g.orders.length > 0);

  const oldestMinutes = Math.floor(
    (Date.now() - new Date(session.oldestCreatedAt).getTime()) / 60000
  );
  const isOld = oldestMinutes >= oldOrderThresholdMin;

  const allPaid = session.subOrders.every((o) => o.paid_at != null);
  const allDelivered = session.subOrders.every(
    (o) => o.status === "entregado"
  );

  const handleAdvanceGroup = async (group: StatusGroup) => {
    const next = nextStatus(group.status);
    if (!next) return;
    setAdvancingGroup(group.status);
    const result = await advanceStatusGroup(
      group.orders.map((o) => o.id),
      next
    );
    setAdvancingGroup(null);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({
        title: `${group.orders.length > 1 ? `${group.orders.length} sub-pedidos` : "Sub-pedido"}: ${advanceLabels[group.status]}`,
        variant: "success",
      });
      group.orders.forEach((o) => onRefetch(o.id));
    }
  };

  const handleRevertGroup = async (group: StatusGroup) => {
    const prev = previousStatus(group.status);
    if (!prev) return;
    const count = group.orders.length;
    const target = statusLabels[prev];
    if (
      !window.confirm(
        `¿Revertir ${count} sub-pedido${count > 1 ? "s" : ""} a "${target}"? Solo deberías hacerlo para corregir un error.`
      )
    ) {
      return;
    }
    setRevertingGroup(group.status);
    const result = await advanceStatusGroup(
      group.orders.map((o) => o.id),
      prev
    );
    setRevertingGroup(null);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({
        title: `${count > 1 ? `${count} sub-pedidos` : "Sub-pedido"} revertido${count > 1 ? "s" : ""} a "${target}"`,
        variant: "success",
      });
      group.orders.forEach((o) => onRefetch(o.id));
    }
  };

  const handleCobroSuccess = () => {
    // Refresh all sub-orders so paid_at is reflected.
    // If everything is also delivered, the next render will hide the session.
    session.subOrders.forEach((o) => onRefetch(o.id));
  };

  const handleDeleteSession = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    setDeletingSession(true);
    const orderIds = session.subOrders.map((o) => o.id);
    const result = await deleteSession(session.sessionId);
    if (result.error) {
      setDeletingSession(false);
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      // Optimistic local removal so the card disappears immediately
      onLocalRemove?.(orderIds);
      toast({
        title: `Mesa ${session.tableNumber} eliminada`,
        variant: "success",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string, subOrderNumber: number) => {
    if (
      !window.confirm(
        `¿Eliminar el sub-pedido #${subOrderNumber}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setDeletingOrderId(orderId);
    const result = await deleteOrder(orderId);
    if (result.error) {
      setDeletingOrderId(null);
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      onLocalRemove?.([orderId]);
      toast({
        title: `Sub-pedido #${subOrderNumber} eliminado`,
        variant: "success",
      });
    }
  };

  return (
    <>
      <div
        className={`rounded-xl border bg-card overflow-hidden ${isOld ? "border-red-400" : "border-border"}`}
      >
        {/* Old order alert */}
        {isOld && (
          <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Mesa esperando {oldestMinutes} min</span>
          </div>
        )}

        {/* Session header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setCollapsed((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-lg ${
                isOld
                  ? "bg-red-500 text-white"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {session.tableNumber}
            </div>
            <div>
              <p className="font-semibold">Mesa {session.tableNumber}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatShortTime(session.oldestCreatedAt)}
                </div>
                {session.subOrders.length > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {session.subOrders.length} sub-pedidos
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">
              {formatCurrency(session.totalAmount)}
            </span>
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Status groups */}
        {!collapsed && (
          <div className="border-t divide-y">
            {statusGroups.map((group) => {
              const next = nextStatus(group.status);
              const prev = previousStatus(group.status);
              const isAdvancing = advancingGroup === group.status;

              return (
                <div key={group.status} className="p-4 space-y-3">
                  {/* Group status header */}
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={group.status} />
                  </div>

                  {/* Items grouped by sub-order, separated by thin dashed divider */}
                  <div className="space-y-3">
                    {group.orders.map((order, idx) => (
                      <div key={order.id}>
                        {idx > 0 && (
                          <div className="border-t border-dashed border-muted-foreground/25 mb-3" />
                        )}
                        {/* Sub-order header: number + time + edit/delete buttons + paid badge */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                          <span className="font-medium">
                            Sub-pedido #{order.sub_order_number}
                          </span>
                          <span>·</span>
                          <span>{formatShortTime(order.created_at)}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0 ml-1"
                            title={`Editar sub-pedido #${order.sub_order_number}`}
                            onClick={() => setEditingOrder(order)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                            title={`Eliminar sub-pedido #${order.sub_order_number}`}
                            disabled={deletingOrderId === order.id}
                            onClick={() =>
                              handleDeleteOrder(order.id, order.sub_order_number)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {order.paid_at && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-medium">
                              <BadgeEuro className="h-3 w-3" />
                              Pagado
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {(order.order_items ?? []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>
                                <span className="font-medium">
                                  {item.quantity}×
                                </span>{" "}
                                {item.product_name}
                                {item.notes && (
                                  <span className="ml-2 text-xs italic text-muted-foreground">
                                    ({item.notes})
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {formatCurrency(item.unit_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Advance / revert controls */}
                  {(next || prev) && (
                    <div className="flex gap-2">
                      {prev && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 shrink-0 text-muted-foreground"
                          title={`Revertir a "${statusLabels[prev]}"`}
                          disabled={
                            revertingGroup === group.status || isAdvancing
                          }
                          onClick={() => handleRevertGroup(group)}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                      {next && (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={
                            isAdvancing || revertingGroup === group.status
                          }
                          onClick={() => handleAdvanceGroup(group)}
                        >
                          {isAdvancing
                            ? "Actualizando..."
                            : group.orders.length > 1
                            ? `${advanceLabels[group.status]} (${group.orders.length})`
                            : advanceLabels[group.status]}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Cobrar toda la sesión */}
            <div className="p-3 bg-muted/30 space-y-2">
              {allPaid ? (
                <div className="flex items-center justify-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700">
                  <BadgeEuro className="h-4 w-4" />
                  Mesa pagada — {formatCurrency(session.totalAmount)}
                  {!allDelivered && (
                    <span className="text-xs font-normal text-emerald-600">
                      (esperando entrega)
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 font-semibold"
                  onClick={() => setCobroOpen(true)}
                >
                  <Banknote className="h-4 w-4" />
                  Cobrar mesa {session.tableNumber} —{" "}
                  {formatCurrency(session.totalAmount)}
                </Button>
              )}

              {confirmingDelete ? (
                <>
                  <p className="text-sm font-medium text-center text-destructive">
                    ¿Eliminar mesa {session.tableNumber} y todos sus sub-pedidos?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1"
                      onClick={handleDeleteSession}
                      disabled={deletingSession}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Sí, eliminar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeleteSession}
                  disabled={deletingSession}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar mesa
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {editingOrder && (
        <EditOrderDialog
          order={editingOrder}
          barSlug={barSlug}
          open={true}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            onRefetch(editingOrder.id);
            setEditingOrder(null);
          }}
        />
      )}

      <CobrarDialog
        open={cobroOpen}
        onClose={() => setCobroOpen(false)}
        sessionId={session.sessionId}
        tableNumber={session.tableNumber}
        totalAmount={session.totalAmount}
        onSuccess={handleCobroSuccess}
      />
    </>
  );
}
