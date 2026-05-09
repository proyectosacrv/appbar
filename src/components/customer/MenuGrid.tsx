"use client";

import { useState } from "react";
import { CategoryTabs } from "./CategoryTabs";
import { ProductCard } from "./ProductCard";
import type { Product, Category } from "@/types/database";

interface MenuGridProps {
  products: Product[];
  categories: Category[];
  readOnly?: boolean;
}

export function MenuGrid({ products, categories, readOnly }: MenuGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <CategoryTabs
          categories={categories}
          selected={selectedCategory}
          onChange={setSelectedCategory}
        />
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground space-y-1">
          {products.length === 0 ? (
            <>
              <p className="text-base font-medium">La carta está vacía por el momento</p>
              <p className="text-sm">El local aún no ha publicado sus productos. Vuelve más tarde o pregunta al personal.</p>
            </>
          ) : (
            <p>No hay productos disponibles en esta categoría</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} readOnly={readOnly} />
          ))}
        </div>
      )}
    </div>
  );
}
