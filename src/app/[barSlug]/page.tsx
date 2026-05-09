import { createClient } from "@/lib/supabase/server";
import { MenuGrid } from "@/components/customer/MenuGrid";
import { CartButton } from "@/components/customer/CartDrawer";
import { TableSelector } from "@/components/customer/TableSelector";
import type { Product, Category } from "@/types/database";

interface MenuPageProps {
  params: Promise<{ barSlug: string }>;
  searchParams: Promise<{ mesa?: string }>;
}

export default async function MenuPage({ params, searchParams }: MenuPageProps) {
  const { barSlug } = await params;
  const { mesa } = await searchParams;
  const tableNumber = mesa ? parseInt(mesa) : null;

  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select("id, name")
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

  const readOnly = tableNumber === null;

  return (
    <>
      <TableSelector
        barSlug={barSlug}
        initialTableNumber={tableNumber}
        readOnly={readOnly}
      />
      <MenuGrid
        products={(products ?? []) as unknown as Product[]}
        categories={(categories ?? []) as unknown as Category[]}
        readOnly={readOnly}
      />
      {!readOnly && <CartButton barSlug={barSlug} />}
    </>
  );
}
