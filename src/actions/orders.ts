"use server";

import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireBarAccess } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import type {
  CartItem,
  OrderStatus,
  PaymentMethod,
} from "@/types/database";

// ============================================================
// Validation schemas
// ============================================================
const itemSchema = z.object({
  product_id: z.string().uuid().nullable(),
  product_name: z.string().min(1).max(200),
  unit_price: z.number().nonnegative().max(9999),
  quantity: z.number().int().positive().max(99),
  notes: z.string().max(500).optional().nullable(),
});

const orderStatusSchema = z.enum([
  "pendiente",
  "preparando",
  "listo",
  "entregado",
]);

const paymentMethodSchema = z.enum(["efectivo", "tarjeta", "bizum", "otro"]);

const createOrderSchema = z.object({
  barId: z.string().uuid(),
  tableNumber: z.number().int().min(0).max(9999),
  items: z.array(itemSchema).min(1).max(50),
  notes: z.string().max(500).optional().nullable(),
});

// ============================================================
// Helpers
// ============================================================

// Verifies the bar exists and is active. Public flows must call this before
// using the admin client, since the admin client bypasses the RLS check.
async function assertBarActive(barId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: bar } = await supabase
    .from("bars")
    .select("id, is_active")
    .eq("id", barId)
    .single();
  if (!bar) return { error: "Bar no encontrado" };
  if (!bar.is_active) return { error: "Servicio no disponible" };
  return {};
}

interface NormalizedItem {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
}

interface CreateOrderResult {
  success?: true;
  merged?: boolean;
  error?: string;
}

// Atomic core via Postgres RPC (single transaction with row lock).
// Used by both the public createOrder and the admin createOrderAdmin.
async function createOrderCore(
  barId: string,
  tableNumber: number,
  items: NormalizedItem[],
  notes: string | null
): Promise<CreateOrderResult & { orderId?: string }> {
  const adminSupabase = await createAdminClient();
  // RPC output columns are prefixed with `o_` to avoid collisions with the
  // `orders` table columns of the same name (Postgres raises 42702 otherwise).
  type RpcRow = {
    o_order_id: string;
    o_merged: boolean;
    o_session_id: string;
    o_sub_order_number: number;
  };

  const rpcResponse = await adminSupabase.rpc("create_order_atomic", {
    p_bar_id: barId,
    p_table_number: tableNumber,
    p_items: items,
    p_notes: notes,
  });

  if (rpcResponse.error) {
    return {
      error: `RPC error: ${rpcResponse.error.message ?? "unknown"}`,
    };
  }

  // The RPC returns SETOF (RETURNS TABLE), so data is an array of rows.
  // Defensive: handle both array and single-object shapes.
  const raw = rpcResponse.data as unknown;
  const row = Array.isArray(raw)
    ? (raw[0] as RpcRow | undefined)
    : (raw as RpcRow | null);

  if (!row || !row.o_order_id) {
    return {
      error: "No se pudo crear el pedido (respuesta vacía del servidor)",
    };
  }

  return { success: true, merged: row.o_merged, orderId: row.o_order_id };
}

// ============================================================
// Public action — customer creates an order from the menu
// ============================================================

interface CreateOrderInput {
  barId: string;
  tableNumber: number;
  items: CartItem[];
  notes?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const parsed = createOrderSchema.safeParse({
    barId: input.barId,
    tableNumber: input.tableNumber,
    items: input.items.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      unit_price: i.product.price,
      quantity: i.quantity,
      notes: i.notes || null,
    })),
    notes: input.notes ?? null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Defense-in-depth: admin client bypasses RLS, so re-validate the bar.
  const barCheck = await assertBarActive(parsed.data.barId);
  if (barCheck.error) return { error: barCheck.error };

  const normalizedItems: NormalizedItem[] = parsed.data.items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    unit_price: i.unit_price,
    quantity: i.quantity,
    notes: i.notes ?? null,
  }));

  const result = await createOrderCore(
    parsed.data.barId,
    parsed.data.tableNumber,
    normalizedItems,
    parsed.data.notes ?? null
  );

  if (result.success && result.orderId) {
    await logAudit({
      barId: parsed.data.barId,
      actorId: null,
      actorRole: "customer",
      action: "order.created",
      entity: "order",
      entityId: result.orderId,
      payload: { merged: result.merged, table: parsed.data.tableNumber },
    });
  }
  return result;
}

// ============================================================
// Admin action — staff creates an order from the dashboard
// ============================================================

interface CreateOrderAdminInput {
  barId: string;
  barSlug: string;
  tableNumber: number;
  items: NormalizedItem[];
  notes?: string | null;
}

export async function createOrderAdmin(input: CreateOrderAdminInput) {
  const auth = await requireBarAccess(input.barId);
  if ("error" in auth) return { error: auth.error };

  const parsed = createOrderSchema.safeParse({
    barId: input.barId,
    tableNumber: input.tableNumber,
    items: input.items,
    notes: input.notes ?? null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const normalizedItems: NormalizedItem[] = parsed.data.items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    unit_price: i.unit_price,
    quantity: i.quantity,
    notes: i.notes ?? null,
  }));

  const result = await createOrderCore(
    parsed.data.barId,
    parsed.data.tableNumber,
    normalizedItems,
    parsed.data.notes ?? null
  );

  if (result.success && result.orderId) {
    await logAudit({
      barId: parsed.data.barId,
      actorId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "order.created",
      entity: "order",
      entityId: result.orderId,
      payload: { merged: result.merged, table: parsed.data.tableNumber },
    });
  }
  revalidatePath(`/admin/${input.barSlug}/orders`);
  return result;
}

// ============================================================
// Single-order status update (legacy, used by older code paths)
// ============================================================

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const parsed = z
    .object({ orderId: z.string().uuid(), status: orderStatusSchema })
    .safeParse({ orderId, status });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: "No se pudo actualizar el estado" };
  return { success: true };
}

// ============================================================
// Bulk advance (used by the kitchen board to move a status group)
// Records ready_at / delivered_at the first time each milestone is reached.
// ============================================================

export async function advanceStatusGroup(
  orderIds: string[],
  newStatus: OrderStatus
) {
  const parsed = z
    .object({
      orderIds: z.array(z.string().uuid()).min(1).max(100),
      newStatus: orderStatusSchema,
    })
    .safeParse({ orderIds, newStatus });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (newStatus === "listo") {
    const { error: stampError } = await supabase
      .from("orders")
      .update({ ready_at: now })
      .in("id", orderIds)
      .is("ready_at", null);
    if (stampError) return { error: "No se pudo actualizar el estado" };
  } else if (newStatus === "entregado") {
    const { error: stampError } = await supabase
      .from("orders")
      .update({ delivered_at: now })
      .in("id", orderIds)
      .is("delivered_at", null);
    if (stampError) return { error: "No se pudo actualizar el estado" };
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: now })
    .in("id", orderIds)
    .select("id, bar_id, status");

  if (error) return { error: "No se pudo actualizar el estado" };

  // Audit (best-effort — bar_id is the same for all in a group)
  if (updated && updated.length > 0) {
    const barId = updated[0].bar_id as string;
    await logAudit({
      barId,
      actorId: null, // populated by caller via auth context if needed
      actorRole: null,
      action: "order.status_advanced",
      entity: "order",
      entityId: orderIds.join(","),
      payload: { newStatus, count: orderIds.length },
    });
  }

  return { success: true };
}

// ============================================================
// Cobrar session — record payment without changing kitchen status
// ============================================================

export async function cobrarSession(
  sessionId: string,
  paymentMethod: PaymentMethod | null = null
) {
  const parsed = z
    .object({
      sessionId: z.string().uuid(),
      paymentMethod: paymentMethodSchema.nullable().optional(),
    })
    .safeParse({ sessionId, paymentMethod });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      paid_at: now,
      payment_method: parsed.data.paymentMethod ?? null,
      updated_at: now,
    })
    .eq("session_id", sessionId)
    .is("paid_at", null)
    .select("id, bar_id, total");

  if (error) return { error: "No se pudo cobrar la mesa" };

  if (updated && updated.length > 0) {
    const total = updated.reduce(
      (s, o) => s + ((o.total as number) ?? 0),
      0
    );
    await logAudit({
      barId: updated[0].bar_id as string,
      actorId: null,
      actorRole: null,
      action: "session.cobrada",
      entity: "session",
      entityId: sessionId,
      payload: {
        total,
        sub_orders: updated.length,
        method: parsed.data.paymentMethod ?? null,
      },
    });
  }

  return { success: true };
}

// ============================================================
// Hard-deletes
// ============================================================

export async function deleteOrder(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("orders")
    .select("bar_id, session_id")
    .eq("id", orderId)
    .single();

  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) return { error: "No se pudo eliminar el pedido" };

  if (existing) {
    await logAudit({
      barId: (existing as { bar_id: string }).bar_id,
      actorId: null,
      actorRole: null,
      action: "order.deleted",
      entity: "order",
      entityId: orderId,
    });
  }
  return { success: true };
}

export async function deleteSession(sessionId: string) {
  const parsed = z.string().uuid().safeParse(sessionId);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createClient();

  const { data: subOrders } = await supabase
    .from("orders")
    .select("bar_id")
    .eq("session_id", sessionId)
    .limit(1);

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("session_id", sessionId);
  if (error) return { error: "No se pudo eliminar la mesa" };

  if (subOrders && subOrders.length > 0) {
    await logAudit({
      barId: (subOrders[0] as { bar_id: string }).bar_id,
      actorId: null,
      actorRole: null,
      action: "session.deleted",
      entity: "session",
      entityId: sessionId,
    });
  }

  return { success: true };
}

// ============================================================
// Edit order (diff-based: keep existing items, add new, remove missing)
// edit_count is incremented atomically via RPC.
// ============================================================

interface EditOrderInput {
  orderId: string;
  barSlug: string;
  items: Array<{
    id?: string;
    product_id: string | null;
    product_name: string;
    unit_price: number;
    quantity: number;
    notes?: string | null;
  }>;
  notes?: string | null;
}

const editItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().uuid().nullable(),
  product_name: z.string().min(1).max(200),
  unit_price: z.number().nonnegative().max(9999),
  quantity: z.number().int().positive().max(99),
  notes: z.string().max(500).optional().nullable(),
});

export async function editOrder(input: EditOrderInput) {
  const parsed = z
    .object({
      orderId: z.string().uuid(),
      barSlug: z.string().min(1).max(80),
      items: z.array(editItemSchema).max(50),
      notes: z.string().max(500).optional().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Atomic increment via RPC (avoids race conditions when two staff edit at once)
  const { error: incError } = await supabase.rpc("increment_order_edit_count", {
    p_order_id: parsed.data.orderId,
  });
  if (incError) return { error: "No se pudo registrar la edición" };

  // Diff-based update: keep existing items by id, add new ones, remove missing
  const { data: currentItems } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", parsed.data.orderId);
  const currentIds = new Set(
    ((currentItems ?? []) as { id: string }[]).map((i) => i.id)
  );
  const submittedIds = new Set(
    parsed.data.items
      .map((i) => i.id)
      .filter((id): id is string => Boolean(id) && !id!.startsWith("new-"))
  );

  // Remove items that no longer appear
  const toRemove = [...currentIds].filter((id) => !submittedIds.has(id));
  if (toRemove.length > 0) {
    await supabase.from("order_items").delete().in("id", toRemove);
  }

  // Update items that survived
  for (const item of parsed.data.items) {
    if (item.id && !item.id.startsWith("new-") && currentIds.has(item.id)) {
      await supabase
        .from("order_items")
        .update({
          product_id: item.product_id,
          product_name: item.product_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          notes: item.notes || null,
        })
        .eq("id", item.id);
    }
  }

  // Insert new items
  const newRows = parsed.data.items
    .filter((item) => !item.id || item.id.startsWith("new-"))
    .map((item) => ({
      order_id: parsed.data.orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      notes: item.notes || null,
    }));
  if (newRows.length > 0) {
    const { error } = await supabase.from("order_items").insert(newRows);
    if (error) return { error: "Error al añadir nuevos productos" };
  }

  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  const { data: updated } = await supabase
    .from("orders")
    .update({
      total,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orderId)
    .select("bar_id")
    .single();

  if (updated) {
    await logAudit({
      barId: (updated as { bar_id: string }).bar_id,
      actorId: null,
      actorRole: null,
      action: "order.edited",
      entity: "order",
      entityId: parsed.data.orderId,
      payload: { item_count: parsed.data.items.length, total },
    });
  }

  revalidatePath(`/admin/${parsed.data.barSlug}/orders`);
  return { success: true };
}

