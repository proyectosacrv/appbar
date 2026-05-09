"use client";

import { useState } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useBarConfig } from "@/lib/bar-config";
import { formatCurrency } from "@/lib/utils";

interface CartDrawerProps {
  barSlug: string;
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ barSlug, open, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems, tableNumber } =
    useCart();
  const { cartMaxQuantity } = useBarConfig();

  const handleConfirmOrder = () => {
    onClose();
    router.push(`/${barSlug}/order`);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Tu pedido</h2>
            {tableNumber && (
              <p className="text-sm text-muted-foreground">Mesa {tableNumber}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Tu carrito está vacío
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.product.price)} c/u
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      Nota: {item.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    disabled={item.quantity >= cartMaxQuantity}
                    title={item.quantity >= cartMaxQuantity ? `Máximo ${cartMaxQuantity} unidades` : undefined}
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-20 text-right font-semibold">
                  {formatCurrency(item.product.price * item.quantity)}
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(getTotalPrice())}</span>
            </div>
            <Button className="w-full h-12 text-base" onClick={handleConfirmOrder}>
              Confirmar pedido ({getTotalItems()})
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export function CartButton({ barSlug }: { barSlug: string }) {
  const { getTotalItems, getTotalPrice } = useCart();
  const [open, setOpen] = useState(false);
  const totalItems = getTotalItems();

  if (totalItems === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="font-semibold">
          {totalItems} {totalItems === 1 ? "producto" : "productos"}
        </span>
        <span className="font-bold">{formatCurrency(getTotalPrice())}</span>
      </button>

      <CartDrawer
        barSlug={barSlug}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
