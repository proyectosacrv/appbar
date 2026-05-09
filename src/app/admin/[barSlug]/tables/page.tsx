import { createClient } from "@/lib/supabase/server";
import { TablesManager } from "@/components/admin/TablesManager";

interface TablesPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function TablesPage({ params }: TablesPageProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("slug", barSlug)
    .single();

  if (!bar) return null;

  const { data: tables } = await supabase
    .from("tables")
    .select("*")
    .eq("bar_id", bar.id)
    .order("table_number");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mesas y códigos QR</h1>
      <p className="text-muted-foreground text-sm">
        Genera los QR de cada mesa para que los clientes puedan ver la carta y hacer pedidos.
      </p>
      <TablesManager
        barId={bar.id}
        barSlug={barSlug}
        tables={tables ?? []}
        appUrl={appUrl}
      />
    </div>
  );
}
