"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingBag,
  Euro,
  Package,
  Repeat,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalytics, type AnalyticsData } from "@/actions/analytics";
import { formatCurrency } from "@/lib/utils";
import { BarChartVertical } from "./charts/BarChartVertical";
import { CategoryPieChart } from "./charts/CategoryPieChart";

interface AnalyticsDashboardProps {
  barId: string;
}

const DOW_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export function AnalyticsDashboard({ barId }: AnalyticsDashboardProps) {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const startISO = new Date(`${from}T00:00:00`).toISOString();
    const endISO = new Date(`${to}T23:59:59.999`).toISOString();
    const result = await getAnalytics(barId, startISO, endISO);
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

  return (
    <div className="space-y-6">
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
        <div className="flex flex-wrap gap-1">
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

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando análisis...
        </div>
      )}

      {!loading && data && data.total_orders === 0 && (
        <div className="rounded-xl border py-12 text-center text-muted-foreground">
          No hay pedidos registrados en este rango
        </div>
      )}

      {!loading && data && data.total_orders > 0 && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<ShoppingBag className="h-4 w-4" />}
              label="Pedidos atendidos"
              value={data.total_orders.toString()}
              hint={`${data.total_sessions} mesas`}
              delta={pctChange(data.total_orders, data.prev_period.total_orders)}
            />
            <Kpi
              icon={<Euro className="h-4 w-4" />}
              label="Ingresos"
              value={formatCurrency(data.total_revenue)}
              hint="solo pagados"
              delta={pctChange(data.total_revenue, data.prev_period.total_revenue)}
            />
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label="Ticket medio"
              value={formatCurrency(data.avg_order_value)}
            />
            <Kpi
              icon={<Package className="h-4 w-4" />}
              label="Items por pedido"
              value={data.avg_items_per_order.toFixed(1)}
              hint={`${data.total_items} en total`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Distribución horaria de pedidos"
              subtitle="Nº de pedidos recibidos por franja horaria"
            >
              <BarChartVertical
                values={data.orders_by_hour}
                labels={Array.from({ length: 24 }, (_, i) =>
                  String(i).padStart(2, "0")
                )}
                formatValue={(v) => v.toString()}
                color="bg-primary"
                hoverColor="bg-blue-700"
                showEveryNthLabel={3}
              />
            </Card>
            <Card
              title="Facturación por día de la semana"
              subtitle="Ingresos acumulados por jornada"
            >
              <BarChartVertical
                values={data.revenue_by_dow}
                labels={DOW_LABELS}
                formatValue={(v) => formatCurrency(v)}
                formatValueShort={(v) => `${Math.round(v)}€`}
                color="bg-emerald-500"
                hoverColor="bg-emerald-700"
              />
            </Card>
          </div>

          {data.revenue_by_category.length > 0 && (
            <Card
              title="% de ventas por categoría"
              subtitle="Pulsa un sector para ver los productos que lo componen"
            >
              <CategoryPieChart categories={data.revenue_by_category} />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top productos" subtitle="Más vendidos por cantidad">
              {data.top_products.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin ventas
                </p>
              ) : (
                <div className="divide-y">
                  {data.top_products.map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground w-6 text-center">
                        #{i + 1}
                      </span>
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {p.quantity} uds
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Productos con menor demanda"
              subtitle="Candidatos a revisar o reemplazar en la carta"
            >
              {data.least_demanded.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay productos activos
                </p>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto scrollbar-hide">
                  {data.least_demanded.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 py-2 text-sm"
                    >
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span
                        className={`text-xs tabular-nums w-12 text-right ${
                          p.quantity === 0
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {p.quantity} uds
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Mesas más rentables" subtitle="Top 10 por ingresos">
              {data.top_tables.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin datos
                </p>
              ) : (
                <div className="divide-y">
                  {data.top_tables.map((t, i) => (
                    <div
                      key={t.table_number}
                      className="flex items-center gap-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground w-6 text-center">
                        #{i + 1}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-semibold text-xs">
                        {t.table_number}
                      </div>
                      <span className="flex-1 text-muted-foreground">
                        {t.sessions} {t.sessions === 1 ? "sesión" : "sesiones"}
                      </span>
                      <span className="font-semibold tabular-nums w-20 text-right">
                        {formatCurrency(t.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
              <Card title="Frecuencia de re-pedido" subtitle="Mesas que piden más de una vez">
                <div className="flex items-baseline gap-2 py-2">
                  <Repeat className="h-5 w-5 text-emerald-600" />
                  <span className="text-3xl font-bold">
                    {data.repeat_order_rate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    de {data.total_sessions} sesiones
                  </span>
                </div>
              </Card>
              <Card title="Tasa de edición" subtitle="Sub-pedidos editados tras crearse">
                <div className="flex items-baseline gap-2 py-2">
                  <Pencil className="h-5 w-5 text-amber-600" />
                  <span className="text-3xl font-bold">
                    {data.edit_rate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    de {data.total_orders} pedidos
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {delta != null && <DeltaBadge delta={delta} />}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        sin cambios
      </span>
    );
  }
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-red-600"
      }`}
      title="Comparativa con el período anterior del mismo tamaño"
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {delta.toFixed(0)}%
    </span>
  );
}
