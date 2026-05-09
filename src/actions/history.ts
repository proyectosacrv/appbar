"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBarAccess } from "@/lib/auth-helpers";
import type { Order } from "@/types/database";

// "Bar day" cutoff: orders before this hour count toward the previous service
// day. Configurable per bar via bars.bar_day_cutoff_hour (default 6).
function barDayKey(iso: string, cutoffHours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() - cutoffHours);
  return d.toISOString().slice(0, 10);
}

export interface HistorySession {
  sessionId: string;
  tableNumber: number;
  subOrders: Order[];
  totalAmount: number;
  firstCreatedAt: string;
  paidAt: string;
  // Time deltas in seconds (null if data missing)
  prepSeconds: number | null;
  kitchenSeconds: number | null;
  totalSeconds: number;
  // Whether this session crossed bar days (excluded from averages)
  crossesBarDay: boolean;
}

export interface HistoryResponse {
  sessions: HistorySession[];
  totals: {
    sessionCount: number;
    revenue: number;
    avgPrepSeconds: number | null;
    avgKitchenSeconds: number | null;
    avgTotalSeconds: number | null;
  };
}

export async function getPaidSessions(
  barId: string,
  startISO: string,
  endISO: string
): Promise<{ data?: HistoryResponse; error?: string }> {
  const parsed = z
    .object({
      barId: z.string().uuid(),
      startISO: z.string().datetime(),
      endISO: z.string().datetime(),
    })
    .safeParse({ barId, startISO, endISO });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireBarAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  // Read the bar's day cutoff for the metric eligibility filter
  const { data: bar } = await supabase
    .from("bars")
    .select("bar_day_cutoff_hour")
    .eq("id", parsed.data.barId)
    .single();
  const cutoffHours =
    (bar as { bar_day_cutoff_hour?: number } | null)?.bar_day_cutoff_hour ?? 6;

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("bar_id", parsed.data.barId)
    .eq("status", "entregado")
    .not("paid_at", "is", null)
    .gte("paid_at", parsed.data.startISO)
    .lte("paid_at", parsed.data.endISO)
    .order("paid_at", { ascending: false });

  if (error) return { error: "Error al obtener el historial" };

  const sessionMap = new Map<string, Order[]>();
  for (const order of (orders ?? []) as unknown as Order[]) {
    const arr = sessionMap.get(order.session_id) ?? [];
    arr.push(order);
    sessionMap.set(order.session_id, arr);
  }

  const sessions: HistorySession[] = [];
  for (const [sessionId, subOrders] of sessionMap.entries()) {
    const sorted = [...subOrders].sort(
      (a, b) => a.sub_order_number - b.sub_order_number
    );
    const totalAmount = sorted.reduce((sum, o) => sum + o.total, 0);

    const firstCreatedAt = sorted.reduce(
      (oldest, o) =>
        new Date(o.created_at) < new Date(oldest) ? o.created_at : oldest,
      sorted[0].created_at
    );
    // Use the latest paid_at across sub-orders (they should be the same)
    const paidAt = sorted.reduce(
      (latest, o) =>
        o.paid_at && new Date(o.paid_at) > new Date(latest)
          ? o.paid_at
          : latest,
      sorted[0].paid_at as string
    );

    // Latest delivered_at across the session
    const lastDeliveredAt = sorted.reduce<string | null>((latest, o) => {
      if (!o.delivered_at) return latest;
      if (!latest || new Date(o.delivered_at) > new Date(latest))
        return o.delivered_at;
      return latest;
    }, null);
    // Latest ready_at across the session
    const lastReadyAt = sorted.reduce<string | null>((latest, o) => {
      if (!o.ready_at) return latest;
      if (!latest || new Date(o.ready_at) > new Date(latest))
        return o.ready_at;
      return latest;
    }, null);

    const start = new Date(firstCreatedAt).getTime();
    const prepSeconds = lastReadyAt
      ? Math.round((new Date(lastReadyAt).getTime() - start) / 1000)
      : null;
    const kitchenSeconds = lastDeliveredAt
      ? Math.round((new Date(lastDeliveredAt).getTime() - start) / 1000)
      : null;
    const totalSeconds = Math.round(
      (new Date(paidAt).getTime() - start) / 1000
    );

    const crossesBarDay =
      barDayKey(firstCreatedAt, cutoffHours) !== barDayKey(paidAt, cutoffHours);

    sessions.push({
      sessionId,
      tableNumber: sorted[0].table_number,
      subOrders: sorted,
      totalAmount,
      firstCreatedAt,
      paidAt,
      prepSeconds,
      kitchenSeconds,
      totalSeconds,
      crossesBarDay,
    });
  }

  // Most recent first
  sessions.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );

  const sessionCount = sessions.length;
  const revenue = sessions.reduce((sum, s) => sum + s.totalAmount, 0);

  // Sessions that don't cross bar days contribute to time averages.
  const eligibleForAvg = sessions.filter((s) => !s.crossesBarDay);
  const avg = (
    pick: (s: HistorySession) => number | null
  ): number | null => {
    const values = eligibleForAvg.map(pick).filter((v): v is number => v != null);
    if (values.length === 0) return null;
    return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  };

  return {
    data: {
      sessions,
      totals: {
        sessionCount,
        revenue,
        avgPrepSeconds: avg((s) => s.prepSeconds),
        avgKitchenSeconds: avg((s) => s.kitchenSeconds),
        avgTotalSeconds: avg((s) => s.totalSeconds),
      },
    },
  };
}
