"use client";

import { useState, useEffect } from "react";
import { Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cobrarSession } from "@/actions/orders";
import { toast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";

interface CobrarDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  tableNumber: number;
  totalAmount: number;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: "efectivo", label: "Efectivo", icon: <Banknote className="h-5 w-5" /> },
  { id: "tarjeta",  label: "Tarjeta",  icon: <CreditCard className="h-5 w-5" /> },
  { id: "bizum",    label: "Bizum",    icon: <Smartphone className="h-5 w-5" /> },
  { id: "otro",     label: "Otro",     icon: <Wallet className="h-5 w-5" /> },
];

export function CobrarDialog({
  open,
  onClose,
  sessionId,
  tableNumber,
  totalAmount,
  onSuccess,
}: CobrarDialogProps) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod(null);
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setSaving(true);
    const result = await cobrarSession(sessionId, method);
    setSaving(false);
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: `Mesa ${tableNumber} cobrada — ${formatCurrency(totalAmount)}`,
      variant: "success",
    });
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar mesa {tableNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Método de pago (opcional)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const selected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(selected ? null : m.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5 font-medium"
                        : "hover:bg-accent"
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Útil para cuadrar caja al final del día. Puedes dejarlo en blanco
              y registrar solo el cobro.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Cobrando..." : "Confirmar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
