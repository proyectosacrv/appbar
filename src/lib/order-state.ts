import type { Order } from "@/types/database";

// A sub-order is "active" when the kitchen still has work to do OR the
// payment has not been recorded yet. Used to decide what shows on the
// admin board and what counts as an open session for table-level merging.
export function isActiveOrder(o: Pick<Order, "status" | "paid_at">): boolean {
  return o.status !== "entregado" || o.paid_at == null;
}

// PostgREST `.or()` filter equivalent for the same predicate.
// Server actions use this to keep the SQL filter and the JS filter aligned.
export const ACTIVE_ORDER_OR_FILTER = "status.neq.entregado,paid_at.is.null";

// A session is fully complete when every sub-order is delivered AND paid.
export function isSessionComplete(
  subOrders: ReadonlyArray<Pick<Order, "status" | "paid_at">>
): boolean {
  return subOrders.every((o) => !isActiveOrder(o));
}
