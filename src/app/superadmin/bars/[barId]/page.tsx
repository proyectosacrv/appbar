import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { BarStatusToggle } from "@/components/superadmin/BarStatusToggle";
import { OwnerCredentialsCard } from "@/components/superadmin/OwnerCredentialsCard";
import { BrandingForm } from "@/components/admin/BrandingForm";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarDetailPageProps {
  params: Promise<{ barId: string }>;
}

export default async function BarDetailPage({ params }: BarDetailPageProps) {
  const { barId } = await params;
  const supabase = await createClient();

  const { data: bar } = await supabase
    .from("bars")
    .select("*")
    .eq("id", barId)
    .single();

  if (!bar) return notFound();

  const { data: ordersStats } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("bar_id", barId);

  const totalOrders = ordersStats?.length ?? 0;
  const totalRevenue =
    ordersStats?.reduce((sum, o) => sum + (o.total || 0), 0) ?? 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/superadmin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted/30 flex items-center justify-center">
          {bar.logo_url ? (
            <Image
              src={bar.logo_url}
              alt=""
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{bar.name}</h1>
        <Badge variant={bar.is_active ? "success" : "destructive"}>
          {bar.is_active ? "Activo" : "Suspendido"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Slug</p>
          <p className="font-mono">{bar.slug}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Email del dueño</p>
          <p>{bar.owner_email}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Pedidos totales</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Creado</p>
          <p>{formatDate(bar.created_at)}</p>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-3">Control de acceso</h2>
        <BarStatusToggle bar={bar} />
      </div>

      <OwnerCredentialsCard
        barId={bar.id}
        barName={bar.name}
        ownerEmail={bar.owner_email}
      />

      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Identidad del local</h2>
          <p className="text-xs text-muted-foreground">
            Logo y color principal. El dueño no puede cambiar esto desde su
            panel — debe solicitarlo a soporte.
          </p>
        </div>
        <BrandingForm
          barId={bar.id}
          currentLogoUrl={bar.logo_url}
          currentThemeColor={bar.theme_color}
        />
      </div>
    </div>
  );
}
