import { createClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/admin/MenuManager";
import type { Product, Category } from "@/types/database";

interface MenuPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("slug", barSlug)
    .single();

  if (!bar) return null;

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(id, name, sort_order, bar_id, created_at)")
      .eq("bar_id", bar.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("categories")
      .select("*")
      .eq("bar_id", bar.id)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Carta</h1>
      <MenuManager
        barId={bar.id}
        barSlug={barSlug}
        products={(products ?? []) as unknown as Product[]}
        categories={(categories ?? []) as unknown as Category[]}
      />
    </div>
  );
}
