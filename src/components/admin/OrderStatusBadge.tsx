import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/database";

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "warning" | "success" | "info" | "destructive" | "outline" }
> = {
  pendiente: { label: "Pendiente", variant: "warning" },
  preparando: { label: "Preparando", variant: "info" },
  listo: { label: "Listo", variant: "success" },
  entregado: { label: "Entregado", variant: "secondary" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
