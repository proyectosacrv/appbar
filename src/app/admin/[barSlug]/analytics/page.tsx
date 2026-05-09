import { redirect } from "next/navigation";
import { getAdminBarContext } from "@/lib/admin-context";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

interface AnalyticsPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);
  if (!ctx) return null;

  if (ctx.profile.role !== "owner") {
    redirect(`/admin/${barSlug}/orders`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Análisis</h1>
      <AnalyticsDashboard barId={ctx.bar.id} />
    </div>
  );
}
