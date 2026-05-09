import { createClient } from "@/lib/supabase/server";
import { getAdminBarContext } from "@/lib/admin-context";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

interface CategoriesPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("bar_id", ctx.bar.id)
    .order("sort_order")
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categorías</h1>
      <CategoriesManager
        barId={ctx.bar.id}
        barSlug={barSlug}
        categories={categories ?? []}
      />
    </div>
  );
}
