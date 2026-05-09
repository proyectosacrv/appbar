import { createClient } from "@/lib/supabase/server";
import { getAdminBarContext } from "@/lib/admin-context";
import { TablesManager } from "@/components/admin/TablesManager";

interface TablesPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function TablesPage({ params }: TablesPageProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: tables } = await supabase
    .from("tables")
    .select("*")
    .eq("bar_id", ctx.bar.id)
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
        barId={ctx.bar.id}
        barSlug={barSlug}
        tables={tables ?? []}
        appUrl={appUrl}
      />
    </div>
  );
}
