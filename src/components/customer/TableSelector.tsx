"use client";

import { useEffect } from "react";
import { MapPin, QrCode } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface TableSelectorProps {
  barSlug: string;
  initialTableNumber: number | null;
  readOnly?: boolean;
}

export function TableSelector({
  barSlug,
  initialTableNumber,
  readOnly,
}: TableSelectorProps) {
  const { tableNumber, setTable, resetForNewContext } = useCart();

  useEffect(() => {
    if (!initialTableNumber) return;

    const cartBarSlug = useCart.getState().barSlug;
    const cartTable = useCart.getState().tableNumber;

    // Si el carrito viene de otro bar o de otra mesa, vaciamos y fijamos contexto.
    if (
      (cartBarSlug && cartBarSlug !== barSlug) ||
      (cartTable !== null && cartTable !== initialTableNumber)
    ) {
      resetForNewContext(initialTableNumber, barSlug);
      return;
    }

    if (!cartTable) {
      setTable(initialTableNumber, barSlug);
    }
  }, [initialTableNumber, barSlug, setTable, resetForNewContext]);

  // Browse-only mode: no QR param in URL
  if (readOnly) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-3">
        <QrCode className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Estás viendo la carta.{" "}
          <span className="font-medium text-foreground">
            Escanea el QR de tu mesa para hacer un pedido.
          </span>
        </p>
      </div>
    );
  }

  const effectiveTable = tableNumber ?? initialTableNumber;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-2">
      <MapPin className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Mesa {effectiveTable}</span>
    </div>
  );
}
