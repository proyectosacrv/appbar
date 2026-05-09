import { createClient } from "@/lib/supabase/server";
import { getAdminBarContext } from "@/lib/admin-context";
import { MenuManager } from "@/components/admin/MenuManager";
import type { Product, Category } from "@/types/database";

interface MenuPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);
  if (!ctx) return null;

  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(id, name, sort_order, bar_id, created_at)")
      .eq("bar_id", ctx.bar.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("categories")
      .select("*")
      .eq("bar_id", ctx.bar.id)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Carta</h1>
      <MenuManager
        barId={ctx.bar.id}
        barSlug={barSlug}
        products={(products ?? []) as unknown as Product[]}
        categories={(categories ?? []) as unknown as Category[]}
      />
    </div>
  );
}
