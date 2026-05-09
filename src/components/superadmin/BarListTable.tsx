"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Power, PowerOff, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleBarStatus } from "@/actions/bars";
import { toast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import type { Bar } from "@/types/database";

export function BarListTable({ bars: initialBars }: { bars: Bar[] }) {
  const [bars, setBars] = useState<Bar[]>(initialBars);

  const handleToggle = async (bar: Bar) => {
    const newStatus = !bar.is_active;
    const action = newStatus ? "activar" : "suspender";

    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${bar.name}"?`))
      return;

    const result = await toggleBarStatus(bar.id, newStatus);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setBars(
        bars.map((b) => (b.id === bar.id ? { ...b, is_active: newStatus } : b))
      );
      toast({
        title: newStatus ? `${bar.name} activado` : `${bar.name} suspendido`,
        variant: newStatus ? "success" : "default",
      });
    }
  };

  if (bars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        No hay bares registrados. Crea el primero.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 font-medium">Bar</th>
            <th className="text-left p-4 font-medium">Email dueño</th>
            <th className="text-left p-4 font-medium">Estado</th>
            <th className="text-left p-4 font-medium">Creado</th>
            <th className="text-left p-4 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bars.map((bar) => (
            <tr key={bar.id} className="hover:bg-muted/30 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/30 flex items-center justify-center">
                    {bar.logo_url ? (
                      <Image
                        src={bar.logo_url}
                        alt=""
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{bar.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{bar.slug}</p>
                  </div>
                </div>
              </td>
              <td className="p-4 text-muted-foreground">{bar.owner_email}</td>
              <td className="p-4">
                <Badge variant={bar.is_active ? "success" : "destructive"}>
                  {bar.is_active ? "Activo" : "Suspendido"}
                </Badge>
              </td>
              <td className="p-4 text-muted-foreground">
                {formatDate(bar.created_at)}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1"
                  >
                    <Link href={`/superadmin/bars/${bar.id}`}>
                      <ExternalLink className="h-3 w-3" />
                      Ver
                    </Link>
                  </Button>
                  <Button
                    variant={bar.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggle(bar)}
                    className="gap-1"
                  >
                    {bar.is_active ? (
                      <>
                        <PowerOff className="h-3 w-3" />
                        Suspender
                      </>
                    ) : (
                      <>
                        <Power className="h-3 w-3" />
                        Activar
                      </>
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
