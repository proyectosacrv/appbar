"use client";

import { useState } from "react";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBarStatus } from "@/actions/bars";
import { toast } from "@/hooks/useToast";
import type { Bar } from "@/types/database";

export function BarStatusToggle({ bar }: { bar: Bar }) {
  const [isActive, setIsActive] = useState(bar.is_active);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const newStatus = !isActive;
    const action = newStatus ? "activar" : "suspender";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el acceso a este bar?`))
      return;

    setLoading(true);
    const result = await toggleBarStatus(bar.id, newStatus);
    setLoading(false);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setIsActive(newStatus);
      toast({
        title: newStatus ? "Bar activado" : "Bar suspendido",
        description: newStatus
          ? "El bar y sus clientes tienen acceso completo"
          : "El bar y sus clientes no pueden acceder al sistema",
        variant: newStatus ? "success" : "default",
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {isActive
          ? "El local está activo. La carta y el panel son accesibles."
          : "El local está suspendido. La carta y el panel están bloqueados."}
      </div>
      <Button
        variant={isActive ? "destructive" : "default"}
        onClick={handleToggle}
        disabled={loading}
        className="gap-2"
      >
        {isActive ? (
          <>
            <PowerOff className="h-4 w-4" />
            Suspender acceso
          </>
        ) : (
          <>
            <Power className="h-4 w-4" />
            Activar acceso
          </>
        )}
      </Button>
    </div>
  );
}
