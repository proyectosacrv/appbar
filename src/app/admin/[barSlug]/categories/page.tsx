import { createClient } from "@/lib/supabase/server";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

interface CategoriesPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("slug", barSlug)
    .single();

  if (!bar) return null;

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("bar_id", bar.id)
    .order("sort_order")
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categorías</h1>
      <CategoriesManager
        barId={bar.id}
        barSlug={barSlug}
        categories={categories ?? []}
      />
    </div>
  );
}
