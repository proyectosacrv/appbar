"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";
import { toast } from "@/hooks/useToast";
import type { Category } from "@/types/database";

interface CategoriesManagerProps {
  barId: string;
  barSlug: string;
  categories: Category[];
}

export function CategoriesManager({
  barId,
  barSlug,
  categories: initialCategories,
}: CategoriesManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const result = await createCategory(barId, newName.trim(), barSlug);
    setSaving(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setNewName("");
      window.location.reload();
      toast({ title: "Categoría creada", variant: "success" });
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    const result = await updateCategory(id, editingName.trim(), barSlug);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setCategories(
        categories.map((c) =>
          c.id === id ? { ...c, name: editingName.trim() } : c
        )
      );
      setEditingId(null);
      toast({ title: "Categoría actualizada", variant: "success" });
    }
  };

  const handleDelete = async (cat: Category) => {
    if (
      !confirm(
        `¿Eliminar la categoría "${cat.name}"?\nLos productos de esta categoría pasarán a "Sin categoría" automáticamente.`
      )
    )
      return;
    const result = await deleteCategory(cat.id, barSlug);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setCategories(categories.filter((c) => c.id !== cat.id));
      const reassigned = result.reassigned ?? 0;
      const extra =
        reassigned > 0
          ? ` ${reassigned} producto${reassigned > 1 ? "s" : ""} pasado${reassigned > 1 ? "s" : ""} a Sin categoría.`
          : "";
      toast({ title: `Categoría eliminada.${extra}`, variant: "success" });
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      {/* Create */}
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la categoría"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Añadir
        </Button>
      </div>

      {/* List */}
      {categories.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground border rounded-xl border-dashed">
          No hay categorías. Crea la primera para organizar tu carta.
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 p-3">
              {editingId === cat.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleUpdate(cat.id)}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditingName(cat.name);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
