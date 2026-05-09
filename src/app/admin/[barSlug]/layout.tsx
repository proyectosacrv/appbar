import { notFound, redirect } from "next/navigation";
import { getAdminBarContext } from "@/lib/admin-context";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/toaster";
import { BarConfigProvider } from "@/lib/bar-config";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ barSlug: string }>;
}

export default async function AdminBarLayout({ children, params }: AdminLayoutProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);

  if (!ctx) {
    // Could be: no user, no profile, wrong role, or bar not found
    return notFound();
  }
  // Defensive: if middleware somehow let through an unauth user, kick them out
  if (!ctx.user.id) redirect("/login");

  const { bar, profile } = ctx;

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

  const themeColor = bar.theme_color;
  const logoUrl = bar.logo_url;
  const themeStyle = themeColor
    ? ({ ["--primary" as string]: themeColor } as React.CSSProperties)
    : undefined;

  return (
    <BarConfigProvider
      config={{
        barId: bar.id,
        barSlug: bar.slug,
        cartMaxQuantity: bar.cart_max_quantity ?? 20,
        oldOrderThresholdMin: bar.old_order_threshold_min ?? 15,
      }}
    >
      <div
        className="flex min-h-screen md:h-screen md:overflow-hidden"
        style={themeStyle}
      >
        <AdminSidebar
          barSlug={bar.slug}
          barName={bar.name}
          logoUrl={logoUrl}
          role={profile.role}
        />
        <main className="flex-1 w-full bg-background md:overflow-y-auto">
          <div className="p-4 pt-16 md:p-6">{children}</div>
        </main>
        <Toaster />
      </div>
    </BarConfigProvider>
  );
}
