import { createClient } from "@/lib/supabase/server";
import { HistoryView } from "@/components/admin/HistoryView";

interface HistoryPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("slug", barSlug)
    .single();

  if (!bar) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-muted-foreground text-sm">
          Pedidos cobrados, métricas de tiempo y detalle por mesa
        </p>
      </div>
      <HistoryView barId={bar.id} />
    </div>
  );
}
