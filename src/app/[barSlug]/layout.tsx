import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/toaster";
import { BarConfigProvider } from "@/lib/bar-config";

interface BarLayoutProps {
  children: React.ReactNode;
  params: Promise<{ barSlug: string }>;
}

export default async function BarLayout({ children, params }: BarLayoutProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select(
      "id, name, is_active, logo_url, theme_color, cart_max_quantity, old_order_threshold_min"
    )
    .eq("slug", barSlug)
    .single();

  if (!bar) return notFound();

  if (!bar.is_active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Servicio no disponible</h1>
        <p className="text-muted-foreground max-w-sm">
          Este servicio no está disponible en este momento. Por favor, contacta con el personal del local.
        </p>
      </div>
    );
  }

  const themeColor = (bar.theme_color as string | null) ?? null;
  const logoUrl = (bar.logo_url as string | null) ?? null;
  // Inline style override of --primary so buttons/accents take the bar's brand
  // color. Only applied when configured — otherwise the global default sticks.
  const themeStyle = themeColor
    ? ({ ["--primary" as string]: themeColor } as React.CSSProperties)
    : undefined;

  return (
    <BarConfigProvider
      config={{
        barId: bar.id as string,
        barSlug,
        cartMaxQuantity: (bar.cart_max_quantity as number | null) ?? 20,
        oldOrderThresholdMin:
          (bar.old_order_threshold_min as number | null) ?? 15,
      }}
    >
      <div className="min-h-screen bg-background pb-24" style={themeStyle}>
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
            {logoUrl && (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                <Image
                  src={logoUrl}
                  alt=""
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <h1 className="text-lg font-bold">{bar.name as string}</h1>
          </div>
        </header>

        <main className="container mx-auto max-w-2xl px-4 py-4">
          {children}
        </main>

        <Toaster />
      </div>
    </BarConfigProvider>
  );
}
