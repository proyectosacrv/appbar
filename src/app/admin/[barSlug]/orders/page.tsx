import { createClient } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/admin/OrdersBoard";

interface OrdersPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function OrdersPage({ params }: OrdersPageProps) {
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
        <h1 className="text-2xl font-bold">Pedidos en curso</h1>
        <p className="text-muted-foreground text-sm">Se actualiza en tiempo real</p>
      </div>
      <OrdersBoard barId={bar.id} barSlug={barSlug} />
    </div>
  );
}
