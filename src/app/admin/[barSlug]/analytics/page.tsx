import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { redirect } from "next/navigation";

interface AnalyticsPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect(`/admin/${barSlug}/orders`);
  }

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("slug", barSlug)
    .single();

  if (!bar) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Análisis</h1>
      <AnalyticsDashboard barId={bar.id} />
    </div>
  );
}
