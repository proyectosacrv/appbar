import type { OrderStatus } from "@/types/database";

// Single source of truth for the kitchen status flow.
// Update this list to add/remove states; everything else derives from it.
export const STATUS_FLOW = [
  "pendiente",
  "preparando",
  "listo",
  "entregado",
] as const satisfies readonly OrderStatus[];

export const statusLabels: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
};

// Action labels (what the staff button says to advance)
export const advanceLabels: Record<OrderStatus, string> = {
  pendiente: "Empezar a preparar",
  preparando: "Marcar listo",
  listo: "Marcar entregado",
  entregado: "",
};

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(status);
  if (idx < 0 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export function previousStatus(status: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(status);
  if (idx <= 0) return null;
  return STATUS_FLOW[idx - 1];
}
