"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, AlertTriangle, PackageX, PackageCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockToggle } from "./StockToggle";
import { ProductForm } from "./ProductForm";
import { deleteProduct, toggleCategoryStock } from "@/actions/products";
import { toast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import type { Product, Category } from "@/types/database";

interface MenuManagerProps {
  barId: string;
  barSlug: string;
  products: Product[];
  categories: Category[];
}

interface CategoryGroup {
  id: string | null;
  name: string;
  sortOrder: number;
  products: Product[];
}

export function MenuManager({
  barId,
  barSlug,
  products: initialProducts,
  categories,
}: MenuManagerProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const outOfStockCount = products.filter((p) => !p.in_stock).length;

  const groups: CategoryGroup[] = [];

  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  for (const cat of sortedCategories) {
    const catProducts = products.filter((p) => p.category_id === cat.id);
    if (catProducts.length > 0) {
      groups.push({ id: cat.id, name: cat.name, sortOrder: cat.sort_order, products: catProducts });
    }
  }

  const uncategorized = products.filter((p) => !p.category_id);
  if (uncategorized.length > 0) {
    groups.push({ id: null, name: "Sin categoría", sortOrder: 9999, products: uncategorized });
  }

  const toggleCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleBulkStock = async (categoryId: string | null, inStock: boolean) => {
    const key = categoryId ?? "__null__";
    setTogglingCategory(key);
    const result = await toggleCategoryStock(categoryId, inStock, barId, barSlug);
    setTogglingCategory(null);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setProducts((prev) =>
        prev.map((p) => {
          const matches = categoryId === null ? !p.category_id : p.category_id === categoryId;
          return matches ? { ...p, in_stock: inStock } : p;
        })
      );
      toast({
        title: inStock ? "Categoría marcada con stock" : "Categoría marcada sin stock",
        variant: "success",
      });
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    const result = await deleteProduct(product.id, barSlug);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setProducts(products.filter((p) => p.id !== product.id));
      toast({ title: "Producto eliminado", variant: "success" });
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingProduct(null);
    window.location.reload();
  };

  if (showForm || editingProduct) {
    return (
      <div className="max-w-lg">
        <h2 className="text-lg font-semibold mb-4">
          {editingProduct ? "Editar producto" : "Nuevo producto"}
        </h2>
        <ProductForm
          barId={barId}
          barSlug={barSlug}
          categories={categories}
          product={editingProduct ?? undefined}
          onSaved={handleSaved}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir producto
        </Button>
        {outOfStockCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {outOfStockCount} producto{outOfStockCount > 1 ? "s" : ""} sin stock
            </span>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-xl border-dashed">
          <p>No hay productos en la carta</p>
          <p className="text-sm mt-1">Añade el primero para que los clientes puedan pedirlo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const groupKey = group.id ?? "__null__";
            const collapsed = collapsedGroups.has(groupKey);
            const allInStock = group.products.every((p) => p.in_stock);
            const allOutOfStock = group.products.every((p) => !p.in_stock);
            const isBulkToggling = togglingCategory === groupKey;

            return (
              <div key={groupKey} className="rounded-xl border overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-2 bg-muted/40 px-4 py-2">
                  <button
                    className="flex items-center gap-2 flex-1 text-left"
                    onClick={() => toggleCollapse(groupKey)}
                  >
                    {collapsed ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">{group.name}</span>
                    <Badge variant="outline" className="text-xs ml-1">
                      {group.products.length}
                    </Badge>
                    {group.products.some((p) => !p.in_stock) && (
                      <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                        {group.products.filter((p) => !p.in_stock).length} sin stock
                      </Badge>
                    )}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 gap-1"
                    disabled={isBulkToggling || allInStock}
                    onClick={() => handleBulkStock(group.id, true)}
                    title="Activar stock en toda la categoría"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    Todo con stock
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 gap-1"
                    disabled={isBulkToggling || allOutOfStock}
                    onClick={() => handleBulkStock(group.id, false)}
                    title="Desactivar stock en toda la categoría"
                  >
                    <PackageX className="h-3.5 w-3.5" />
                    Todo sin stock
                  </Button>
                </div>

                {/* Products */}
                {!collapsed && (
                  <div className="divide-y">
                    {group.products.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-4 p-4 ${!product.in_stock ? "opacity-60" : ""}`}
                      >
                        {product.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-14 w-14 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{product.name}</p>
                            {!product.in_stock && (
                              <Badge variant="secondary" className="text-xs">Sin stock</Badge>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {product.description}
                            </p>
                          )}
                          <p className="text-sm font-semibold mt-1">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StockToggle
                            productId={product.id}
                            inStock={product.in_stock}
                            barSlug={barSlug}
                            onToggle={(inStock) =>
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.id === product.id ? { ...p, in_stock: inStock } : p
                                )
                              )
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingProduct(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
