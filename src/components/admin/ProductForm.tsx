"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct, uploadProductImage } from "@/actions/products";
import { toast } from "@/hooks/useToast";
import type { Product, Category } from "@/types/database";

interface ProductFormProps {
  barId: string;
  barSlug: string;
  categories: Category[];
  product?: Product;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProductForm({
  barId,
  barSlug,
  categories,
  product,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price.toString() ?? "",
    categoryId: product?.category_id ?? "none",
    imageUrl: product?.image_url ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialFormRef = useRef(form);

  const isDirty =
    form.name !== initialFormRef.current.name ||
    form.description !== initialFormRef.current.description ||
    form.price !== initialFormRef.current.price ||
    form.categoryId !== initialFormRef.current.categoryId ||
    form.imageUrl !== initialFormRef.current.imageUrl;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const { url, error } = await uploadProductImage(formData, barId);
    setUploading(false);
    if (error) {
      toast({ title: "Error al subir imagen", description: error, variant: "destructive" });
    } else if (url) {
      setForm((f) => ({ ...f, imageUrl: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;

    setSaving(true);
    const data = {
      barId,
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      categoryId: (form.categoryId && form.categoryId !== "none") ? form.categoryId : null,
      imageUrl: form.imageUrl || undefined,
    };

    const result = product
      ? await updateProduct(product.id, data, barSlug)
      : await createProduct(data, barSlug);

    setSaving(false);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({
        title: product ? "Producto actualizado" : "Producto creado",
        variant: "success",
      });
      onSaved();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Precio (€) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={form.categoryId}
            onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Imagen</Label>
        {form.imageUrl && (
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.imageUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploading}
        />
        {uploading && <p className="text-sm text-muted-foreground">Subiendo imagen...</p>}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">O pega una URL de imagen</Label>
          <Input
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isDirty && !confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) return;
            onCancel();
          }}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || uploading} className="flex-1">
          {saving ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
