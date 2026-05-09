"use client";

import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useBarConfig } from "@/lib/bar-config";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductCardProps {
  product: Product;
  readOnly?: boolean;
}

export function ProductCard({ product, readOnly }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const { cartMaxQuantity } = useBarConfig();
  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  if (!product.in_stock) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 opacity-60">
        <div className="flex gap-3">
          {product.image_url && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover grayscale"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <p className="font-semibold">{product.name}</p>
              {product.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold">{formatCurrency(product.price)}</span>
              <Badge variant="secondary">Sin existencias</Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex gap-3">
        {product.image_url && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <p className="font-semibold">{product.name}</p>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-lg">{formatCurrency(product.price)}</span>
            {!readOnly && (
              quantity === 0 ? (
                <Button
                  size="sm"
                  onClick={() => addItem(product)}
                  className="h-8 w-8 rounded-full p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold">{quantity}</span>
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={quantity >= cartMaxQuantity}
                    title={quantity >= cartMaxQuantity ? `Máximo ${cartMaxQuantity} unidades` : undefined}
                    onClick={() => addItem(product)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
