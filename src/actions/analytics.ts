"use server";

import { createClient } from "@/lib/supabase/server";

export interface AnalyticsData {
  // KPIs principales
  total_orders: number;       // sub-pedidos en el rango
  total_sessions: number;     // mesas distintas atendidas
  total_revenue: number;      // ingresos totales (paid)
  avg_order_value: number;
  total_items: number;
  avg_items_per_order: number;

  // Comparativa con período anterior (mismo número de días anterior)
  prev_period: {
    total_orders: number;
    total_revenue: number;
  };

  // Hora punta: 24 valores (00..23) — número de pedidos por hora
  orders_by_hour: number[];

  // Día semana: 7 valores (Lun..Dom) — ingresos por día de la semana
  revenue_by_dow: number[];

  // Distribución por categoría — incluye desglose de productos por categoría
  revenue_by_category: {
    category_id: string | null;
    name: string;
    revenue: number;
    percentage: number;
    products: {
      name: string;
      quantity: number;
      revenue: number;
      percentage_of_category: number;
    }[];
  }[];

  // Top 10 productos
  top_products: { name: string; quantity: number; revenue: number }[];

  // Productos con menor demanda (activos, los 10 menos pedidos del rango,
  // incluyendo 0 ventas)
  least_demanded: {
    id: string;
    name: string;
    category_name: string | null;
    quantity: number;
  }[];

  // Mesa más rentable (top 10)
  top_tables: {
    table_number: number;
    revenue: number;
    sessions: number;
  }[];

  // % de sesiones con 2+ sub-pedidos
  repeat_order_rate: number;

  // % de sub-pedidos editados al menos una vez
  edit_rate: number;
}

type OrderRow = {
  id: string;
  table_number: number;
  session_id: string;
  total: number;
  paid_at: string | null;
  created_at: string;
  edit_count: number;
  order_items:
    | {
        product_id: string | null;
        product_name: string;
        unit_price: number;
        quantity: number;
      }[]
    | null;
};

export async function getAnalytics(
  barId: string,
  startISO: string,
  endISO: string
): Promise<{ data?: AnalyticsData; error?: string }> {
  const supabase = await createClient();

  // 1) Pedidos del rango actual
  const { data: rangeOrders, error: rangeErr } = (await supabase
    .from("orders")
    .select(
      "id, table_number, session_id, total, paid_at, created_at, edit_count, order_items(product_id, product_name, unit_price, quantity)"
    )
    .eq("bar_id", barId)
    .gte("created_at", startISO)
    .lte("created_at", endISO)) as unknown as {
    data: OrderRow[] | null;
    error: { message: string } | null;
  };

  if (rangeErr) return { error: "Error al obtener datos" };
  const orders = rangeOrders ?? [];

  // 2) Pedidos del período anterior (mismo número de días, justo antes)
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const prevEndMs = startMs - 1;
  const prevStartMs = prevEndMs - (endMs - startMs);
  const { data: prevOrders } = await supabase
    .from("orders")
    .select("total")
    .eq("bar_id", barId)
    .gte("created_at", new Date(prevStartMs).toISOString())
    .lte("created_at", new Date(prevEndMs).toISOString());

  // 3) Catálogo (activo e inactivo) + categorías — dos queries planas
  // para evitar problemas de shape en los joins anidados.
  const [{ data: catalog }, { data: cats }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category_id, is_active")
      .eq("bar_id", barId),
    supabase
      .from("categories")
      .select("id, name")
      .eq("bar_id", barId),
  ]);
  type CatalogRow = {
    id: string;
    name: string;
    category_id: string | null;
    is_active: boolean;
  };
  type CatRow = { id: string; name: string };
  const catalogRows = (catalog ?? []) as CatalogRow[];
  const catRows = (cats ?? []) as CatRow[];

  // Mapas de lookup
  const categoryNameById = new Map<string, string>();
  for (const c of catRows) categoryNameById.set(c.id, c.name);
  const productCategoryMap = new Map<string, string | null>();
  for (const p of catalogRows) productCategoryMap.set(p.id, p.category_id);

  // ============================================================
  // KPIs principales
  // ============================================================
  const total_orders = orders.length;
  const sessionIds = new Set(orders.map((o) => o.session_id));
  const total_sessions = sessionIds.size;
  // Ingresos = solo pagado en el rango (más fiel para "facturación real")
  const paidOrders = orders.filter((o) => o.paid_at != null);
  const total_revenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const avg_order_value =
    paidOrders.length > 0 ? total_revenue / paidOrders.length : 0;

  let total_items = 0;
  for (const o of orders) {
    for (const it of o.order_items ?? []) total_items += it.quantity;
  }
  const avg_items_per_order =
    orders.length > 0 ? total_items / orders.length : 0;

  // ============================================================
  // Comparativa
  // ============================================================
  const prev_total_orders = (prevOrders ?? []).length;
  const prev_total_revenue = (prevOrders ?? []).reduce(
    (sum, o) => sum + (o.total ?? 0),
    0
  );

  // ============================================================
  // Hora punta (created_at en hora local)
  // ============================================================
  const orders_by_hour = new Array(24).fill(0);
  for (const o of orders) {
    const h = new Date(o.created_at).getHours();
    orders_by_hour[h]++;
  }

  // ============================================================
  // Ingresos por día de la semana (Lunes..Domingo)
  // ============================================================
  const revenue_by_dow = new Array(7).fill(0);
  for (const o of paidOrders) {
    const d = new Date(o.created_at);
    // getDay: 0=Dom, 1=Lun..6=Sáb. Convertimos a 0=Lun..6=Dom
    const idx = (d.getDay() + 6) % 7;
    revenue_by_dow[idx] += o.total;
  }

  // ============================================================
  // % por categoría (con desglose de productos)
  // ============================================================
  type CatAgg = {
    revenue: number;
    products: Map<string, { name: string; quantity: number; revenue: number }>;
  };
  const categoryAgg = new Map<string | null, CatAgg>();
  for (const o of paidOrders) {
    for (const it of o.order_items ?? []) {
      const catId = it.product_id
        ? productCategoryMap.get(it.product_id) ?? null
        : null;
      const subtotal = it.unit_price * it.quantity;
      const ex = categoryAgg.get(catId) ?? { revenue: 0, products: new Map() };
      ex.revenue += subtotal;
      const prod = ex.products.get(it.product_name);
      if (prod) {
        prod.quantity += it.quantity;
        prod.revenue += subtotal;
      } else {
        ex.products.set(it.product_name, {
          name: it.product_name,
          quantity: it.quantity,
          revenue: subtotal,
        });
      }
      categoryAgg.set(catId, ex);
    }
  }
  const revenue_by_category = Array.from(categoryAgg.entries())
    .map(([catId, agg]) => ({
      category_id: catId,
      name: catId
        ? categoryNameById.get(catId) ?? "Sin categoría"
        : "Sin categoría",
      revenue: agg.revenue,
      percentage: total_revenue > 0 ? (agg.revenue / total_revenue) * 100 : 0,
      products: Array.from(agg.products.values())
        .map((p) => ({
          ...p,
          percentage_of_category:
            agg.revenue > 0 ? (p.revenue / agg.revenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ============================================================
  // Top productos
  // ============================================================
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  for (const o of orders) {
    for (const it of o.order_items ?? []) {
      const ex = productMap.get(it.product_name);
      if (ex) {
        ex.quantity += it.quantity;
        ex.revenue += it.unit_price * it.quantity;
      } else {
        productMap.set(it.product_name, {
          name: it.product_name,
          quantity: it.quantity,
          revenue: it.unit_price * it.quantity,
        });
      }
    }
  }
  const top_products = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // ============================================================
  // Productos con menor demanda (los 10 productos activos menos pedidos,
  // incluyendo los que tienen 0 ventas en el rango)
  // ============================================================
  const productSalesById = new Map<string, number>();
  for (const o of orders) {
    for (const it of o.order_items ?? []) {
      if (it.product_id) {
        productSalesById.set(
          it.product_id,
          (productSalesById.get(it.product_id) ?? 0) + it.quantity
        );
      }
    }
  }
  const least_demanded = catalogRows
    .filter((p) => p.is_active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category_name: p.category_id
        ? categoryNameById.get(p.category_id) ?? null
        : null,
      quantity: productSalesById.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))
    .slice(0, 10);

  // ============================================================
  // Mesa más rentable (top 10)
  // ============================================================
  const tableStats = new Map<
    number,
    { revenue: number; sessions: Set<string> }
  >();
  for (const o of paidOrders) {
    const ex = tableStats.get(o.table_number) ?? {
      revenue: 0,
      sessions: new Set<string>(),
    };
    ex.revenue += o.total;
    ex.sessions.add(o.session_id);
    tableStats.set(o.table_number, ex);
  }
  const top_tables = Array.from(tableStats.entries())
    .map(([table_number, s]) => ({
      table_number,
      revenue: s.revenue,
      sessions: s.sessions.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ============================================================
  // Frecuencia de re-pedido (% sesiones con 2+ sub-pedidos)
  // ============================================================
  const sessionSizes = new Map<string, number>();
  for (const o of orders) {
    sessionSizes.set(o.session_id, (sessionSizes.get(o.session_id) ?? 0) + 1);
  }
  const sessionsWithRepeat = Array.from(sessionSizes.values()).filter(
    (n) => n > 1
  ).length;
  const repeat_order_rate =
    total_sessions > 0 ? (sessionsWithRepeat / total_sessions) * 100 : 0;

  // ============================================================
  // Tasa de edición (% de sub-pedidos con edit_count > 0)
  // ============================================================
  const editedOrders = orders.filter((o) => (o.edit_count ?? 0) > 0).length;
  const edit_rate =
    orders.length > 0 ? (editedOrders / orders.length) * 100 : 0;

  return {
    data: {
      total_orders,
      total_sessions,
      total_revenue,
      avg_order_value,
      total_items,
      avg_items_per_order,
      prev_period: {
        total_orders: prev_total_orders,
        total_revenue: prev_total_revenue,
      },
      orders_by_hour,
      revenue_by_dow,
      revenue_by_category,
      top_products,
      least_demanded,
      top_tables,
      repeat_order_rate,
      edit_rate,
    },
  };
}
