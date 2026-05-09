"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Receipt,
  Clock,
  ChefHat,
  Banknote,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatShortTime,
  formatDuration,
} from "@/lib/utils";
import { getPaidSessions, type HistoryResponse } from "@/actions/history";
import type { PaymentMethod } from "@/types/database";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  bizum: "Bizum",
  otro: "Otro",
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface HistoryViewProps {
  barId: string;
}

export function HistoryView({ barId }: HistoryViewProps) {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const startISO = new Date(`${from}T00:00:00`).toISOString();
    const endISO = new Date(`${to}T23:59:59.999`).toISOString();
    const result = await getPaidSessions(barId, startISO, endISO);
    if (result.data) setData(result.data);
    setLoading(false);
  }, [barId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const setPreset = (preset: "today" | "yesterday" | "7d" | "30d") => {
    const d = new Date();
    const fmt = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (preset === "today") {
      setFrom(fmt(d));
      setTo(fmt(d));
    } else if (preset === "yesterday") {
      const y = new Date(d);
      y.setDate(d.getDate() - 1);
      setFrom(fmt(y));
      setTo(fmt(y));
    } else if (preset === "7d") {
      const start = new Date(d);
      start.setDate(d.getDate() - 6);
      setFrom(fmt(start));
      setTo(fmt(d));
    } else {
      const start = new Date(d);
      start.setDate(d.getDate() - 29);
      setFrom(fmt(start));
      setTo(fmt(d));
    }
  };

  const toggleExpanded = (sessionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm"
          />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setPreset("today")}>
            Hoy
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("yesterday")}>
            Ayer
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("7d")}>
            7 días
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("30d")}>
            30 días
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando historial...
        </div>
      )}

      {!loading && data && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Receipt className="h-4 w-4" />}
              label="Mesas cobradas"
              value={data.totals.sessionCount.toString()}
            />
            <StatCard
              icon={<Banknote className="h-4 w-4" />}
              label="Ingresos"
              value={formatCurrency(data.totals.revenue)}
            />
            <StatCard
              icon={<ChefHat className="h-4 w-4" />}
              label="Cocina (medio)"
              value={formatDuration(data.totals.avgKitchenSeconds)}
              hint="created → entregado"
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Hasta cobro (medio)"
              value={formatDuration(data.totals.avgTotalSeconds)}
              hint="created → pagado"
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Los promedios excluyen sesiones que cruzan el día del bar (corte
            6:00).
          </p>

          {/* Sessions list */}
          {data.sessions.length === 0 ? (
            <div className="rounded-xl border py-12 text-center text-muted-foreground">
              No hay pedidos cobrados en este rango
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              {data.sessions.map((session) => {
                const isExpanded = expanded.has(session.sessionId);
                return (
                  <div
                    key={session.sessionId}
                    className="border-b last:border-b-0"
                  >
                    {/* Row header */}
                    <button
                      onClick={() => toggleExpanded(session.sessionId)}
                      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-semibold text-sm shrink-0">
                        {session.tableNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            Mesa {session.tableNumber}
                          </span>
                          {session.subOrders.length > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {session.subOrders.length} sub-pedidos
                            </Badge>
                          )}
                          {session.crossesBarDay && (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1 border-amber-300 text-amber-700"
                              title="La mesa se abrió en una jornada y se cerró en otra. No cuenta para los promedios de tiempo."
                            >
                              <AlertCircle className="h-3 w-3" />
                              Sin cierre en jornada
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                          <span>
                            Pedido {formatShortTime(session.firstCreatedAt)}
                          </span>
                          <span>·</span>
                          <span>
                            Cobro {formatShortTime(session.paidAt)}
                            {session.subOrders[0]?.payment_method && (
                              <span className="ml-1 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                {PAYMENT_LABELS[session.subOrders[0].payment_method as PaymentMethod]}
                              </span>
                            )}
                          </span>
                          <span>·</span>
                          <span title="Tiempo de cocina (creación → entregado)">
                            <ChefHat className="inline h-3 w-3 mr-1" />
                            {formatDuration(session.kitchenSeconds)}
                          </span>
                          <span>·</span>
                          <span title="Tiempo total (creación → pagado)">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatDuration(session.totalSeconds)}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-sm shrink-0">
                        {formatCurrency(session.totalAmount)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="bg-muted/30 px-4 py-3 border-t space-y-3">
                        {session.subOrders.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-md bg-background border p-3 space-y-1"
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">
                                Sub-pedido #{order.sub_order_number}
                              </span>
                              <span>·</span>
                              <span>{formatShortTime(order.created_at)}</span>
                            </div>
                            <div className="space-y-0.5 text-sm">
                              {(order.order_items ?? []).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between"
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
                                    {formatCurrency(
                                      item.unit_price * item.quantity
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {order.notes && (
                              <p className="text-xs italic text-muted-foreground border-t pt-1 mt-1">
                                Nota: {order.notes}
                              </p>
                            )}
                            <div className="flex justify-between font-semibold text-sm border-t pt-1 mt-1">
                              <span>Sub-total</span>
                              <span>{formatCurrency(order.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
