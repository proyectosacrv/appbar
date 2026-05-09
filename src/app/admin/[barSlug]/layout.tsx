import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/toaster";
import { BarConfigProvider } from "@/lib/bar-config";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ barSlug: string }>;
}

export default async function AdminBarLayout({ children, params }: AdminLayoutProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bar_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "staff")) {
    redirect("/login");
  }

  const { data: bar } = await supabase
    .from("bars")
    .select(
      "id, name, slug, is_active, logo_url, theme_color, cart_max_quantity, old_order_threshold_min"
    )
    .eq("slug", barSlug)
    .eq("id", profile.bar_id!)
    .single();

  if (!bar) return notFound();

  if (!bar.is_active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Cuenta suspendida</h1>
        <p className="text-muted-foreground max-w-sm">
          Tu cuenta está temporalmente suspendida. Contacta con el soporte para regularizar tu suscripción.
        </p>
      </div>
    );
  }

  const themeColor = (bar.theme_color as string | null) ?? null;
  const logoUrl = (bar.logo_url as string | null) ?? null;
  const themeStyle = themeColor
    ? ({ ["--primary" as string]: themeColor } as React.CSSProperties)
    : undefined;

  return (
    <BarConfigProvider
      config={{
        barId: bar.id as string,
        barSlug: bar.slug as string,
        cartMaxQuantity: (bar.cart_max_quantity as number | null) ?? 20,
        oldOrderThresholdMin:
          (bar.old_order_threshold_min as number | null) ?? 15,
      }}
    >
      <div
        className="flex min-h-screen md:h-screen md:overflow-hidden"
        style={themeStyle}
      >
        <AdminSidebar
          barSlug={bar.slug as string}
          barName={bar.name as string}
          logoUrl={logoUrl}
          role={profile.role as "owner" | "staff"}
        />
        <main className="flex-1 w-full bg-background md:overflow-y-auto">
          <div className="p-4 pt-16 md:p-6">{children}</div>
        </main>
        <Toaster />
      </div>
    </BarConfigProvider>
  );
}
