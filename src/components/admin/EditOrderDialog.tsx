"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { editOrder } from "@/actions/orders";
import { toast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types/database";

interface EditableItem {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes?: string | null;
}

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  categories: { id: string; name: string; sort_order: number } | null;
};

type CategoryGroup = {
  id: string | null;
  name: string;
  sort_order: number;
  products: ProductRow[];
};

interface EditOrderDialogProps {
  order: Order;
  barSlug: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditOrderDialog({
  order,
  barSlug,
  open,
  onClose,
  onSaved,
}: EditOrderDialogProps) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState(order.notes || "");
  const [saving, setSaving] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Initialize from DB snapshot when dialog opens.
    // Intentionally not listing `order` as dependency — the polling in
    // useRealtimeOrders recreates the order object every 5 s, which would
    // reset the user's unsaved edits mid-session.
    setItems(
      (order.order_items || []).map((i) => ({
        id: i.id,
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        notes: i.notes,
      }))
    );
    setNotes(order.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, price, category_id, categories(id, name, sort_order)")
      .eq("bar_id", order.bar_id)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (!data) return;
        const products = data as unknown as ProductRow[];
        const groupMap = new Map<string | null, CategoryGroup>();

        for (const p of products) {
          const key = p.category_id ?? null;
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              id: key,
              name: p.categories?.name ?? "Sin categoría",
              sort_order: p.categories?.sort_order ?? 999,
              products: [],
            });
          }
          groupMap.get(key)!.products.push(p);
        }

        const groups = Array.from(groupMap.values()).sort(
          (a, b) => a.sort_order - b.sort_order
        );
        setCategoryGroups(groups);
        setActiveCategory(groups[0]?.id ?? null);
      });
  }, [open, order.bar_id]);

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    }
  };

  const addProduct = (product: ProductRow) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      updateQuantity(existing.id, existing.quantity + 1);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `new-${product.id}`,
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
        },
      ]);
    }
  };

  const visibleProducts =
    categoryGroups.find((g) => g.id === activeCategory)?.products ?? [];

  const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSave = async () => {
    setSaving(true);
    const result = await editOrder({ orderId: order.id, barSlug, items, notes });
    setSaving(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pedido actualizado", variant: "success" });
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar pedido — Mesa {order.table_number}</DialogTitle>
        </DialogHeader>

        {/* Current items */}
        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border p-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.unit_price)} c/u
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-xs"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  −
                </Button>
                <span className="w-5 text-center text-sm">{item.quantity}</span>
                <Button
                  size="icon"
                  className="h-6 w-6 text-xs"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  +
                </Button>
              </div>
              <span className="w-14 text-right text-sm font-medium shrink-0">
                {formatCurrency(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Sin productos. El pedido se cancelará al guardar.
            </p>
          )}
        </div>

        {/* Product browser */}
        {categoryGroups.length > 0 && (
          <div className="space-y-2 border rounded-lg p-3">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5">
              {categoryGroups.map((group) => (
                <button
                  key={group.id ?? "none"}
                  onClick={() => setActiveCategory(group.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    activeCategory === group.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {group.name}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
              {visibleProducts.map((product) => {
                const inOrder = items.find((i) => i.product_id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className={cn(
                      "flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent",
                      inOrder && "border-primary bg-primary/5"
                    )}
                  >
                    <span className="text-xs font-medium leading-tight line-clamp-2">
                      {product.name}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(product.price)}
                    </span>
                    {inOrder && (
                      <span className="mt-0.5 text-xs font-semibold text-primary">
                        ×{inOrder.quantity} en pedido
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes + total */}
        <div className="space-y-2">
          <Textarea
            placeholder="Notas del pedido..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className="flex items-center justify-between font-bold text-sm">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
