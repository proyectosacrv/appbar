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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrderAdmin } from "@/actions/orders";
import { toast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface NewItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
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

interface CreateOrderDialogProps {
  barId: string;
  barSlug: string;
  open: boolean;
  onClose: () => void;
}

export function CreateOrderDialog({
  barId,
  barSlug,
  open,
  onClose,
}: CreateOrderDialogProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [items, setItems] = useState<NewItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTableNumber("");
    setItems([]);
    setNotes("");

    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, price, category_id, categories(id, name, sort_order)")
      .eq("bar_id", barId)
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
  }, [open, barId]);

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
      );
    }
  };

  const addProduct = (product: ProductRow) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setItems((prev) => [
        ...prev,
        {
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

  const handleCreate = async () => {
    const table = parseInt(tableNumber, 10);
    if (!tableNumber || isNaN(table) || table < 0) {
      toast({ title: "Indica un número de mesa válido", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Añade al menos un producto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await createOrderAdmin({
        barId,
        barSlug,
        tableNumber: table,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          notes: null,
        })),
        notes: notes || null,
      });

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Pedido creado", variant: "success" });
        onClose();
      }
    } catch (err) {
      console.error("createOrderAdmin failed:", err);
      toast({
        title: "Error de conexión",
        description: err instanceof Error ? err.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo pedido</DialogTitle>
        </DialogHeader>

        {/* Mesa */}
        <div className="flex items-center gap-3">
          <Label htmlFor="table" className="shrink-0 w-24">
            Nº de mesa
          </Label>
          <Input
            id="table"
            type="number"
            min="0"
            placeholder="Ej: 5"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-32"
          />
        </div>

        {/* Product browser */}
        {categoryGroups.length > 0 && (
          <div className="space-y-2 border rounded-lg p-3">
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

            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
              {visibleProducts.map((product) => {
                const inOrder = items.find(
                  (i) => i.product_id === product.id
                );
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
                        ×{inOrder.quantity} añadido
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Current items summary */}
        {items.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-hide">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.product_name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 text-xs"
                    onClick={() =>
                      updateQuantity(item.product_id, item.quantity - 1)
                    }
                  >
                    −
                  </Button>
                  <span className="w-5 text-center text-sm">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    className="h-6 w-6 text-xs"
                    onClick={() =>
                      updateQuantity(item.product_id, item.quantity + 1)
                    }
                  >
                    +
                  </Button>
                </div>
                <span className="w-14 text-right text-sm font-medium shrink-0">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
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
          <Button onClick={handleCreate} disabled={saving || items.length === 0}>
            {saving ? "Creando..." : "Crear pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
