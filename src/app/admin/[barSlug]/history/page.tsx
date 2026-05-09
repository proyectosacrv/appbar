import { getAdminBarContext } from "@/lib/admin-context";
import { HistoryView } from "@/components/admin/HistoryView";

interface HistoryPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);
  if (!ctx) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-muted-foreground text-sm">
          Pedidos cobrados, métricas de tiempo y detalle por mesa
        </p>
      </div>
      <HistoryView barId={ctx.bar.id} />
    </div>
  );
}
