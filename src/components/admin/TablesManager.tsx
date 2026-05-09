"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeCard } from "./QRCodeCard";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/useToast";
import type { Table } from "@/types/database";

interface TablesManagerProps {
  barId: string;
  barSlug: string;
  tables: Table[];
  appUrl: string;
}

export function TablesManager({
  barId,
  barSlug,
  tables: initialTables,
  appUrl,
}: TablesManagerProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [newNumber, setNewNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddTable = async () => {
    const num = parseInt(newNumber);
    if (!num || num <= 0) return;

    if (tables.find((t) => t.table_number === num)) {
      toast({ title: "Esa mesa ya existe", variant: "destructive" });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tables")
      .insert({
        bar_id: barId,
        table_number: num,
        label: `Mesa ${num}`,
      })
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      toast({ title: "Error al crear mesa", variant: "destructive" });
    } else {
      setTables([...tables, data as Table].sort((a, b) => a.table_number - b.table_number));
      setNewNumber("");
      toast({ title: `Mesa ${num} creada`, variant: "success" });
    }
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(`¿Eliminar Mesa ${table.table_number}?`)) return;
    const supabase = createClient();
    await supabase.from("tables").delete().eq("id", table.id);
    setTables(tables.filter((t) => t.id !== table.id));
    toast({ title: `Mesa ${table.table_number} eliminada`, variant: "success" });
  };

  const handleBulkCreate = async () => {
    const count = parseInt(prompt("¿Cuántas mesas quieres crear? (se añadirán del 1 al N)") ?? "0");
    if (!count || count <= 0 || count > 100) return;

    setSaving(true);
    const supabase = createClient();
    const existing = new Set(tables.map((t) => t.table_number));
    const toCreate = [];

    for (let i = 1; i <= count; i++) {
      if (!existing.has(i)) {
        toCreate.push({ bar_id: barId, table_number: i, label: `Mesa ${i}` });
      }
    }

    if (toCreate.length === 0) {
      toast({ title: "Todas esas mesas ya existen", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data, error } = await supabase.from("tables").insert(toCreate).select();
    setSaving(false);

    if (error) {
      toast({ title: "Error al crear mesas", variant: "destructive" });
    } else {
      setTables(
        [...tables, ...(data as Table[])].sort((a, b) => a.table_number - b.table_number)
      );
      toast({ title: `${toCreate.length} mesas creadas`, variant: "success" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            placeholder="Nº de mesa"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            className="w-32"
            onKeyDown={(e) => e.key === "Enter" && handleAddTable()}
          />
          <Button onClick={handleAddTable} disabled={saving || !newNumber}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir mesa
          </Button>
        </div>
        <Button variant="outline" onClick={handleBulkCreate} disabled={saving}>
          Crear varias mesas
        </Button>
      </div>

      {/* QR Grid */}
      {tables.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-xl border-dashed">
          No hay mesas configuradas. Añade mesas para generar los QR.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <div key={table.id} className="relative">
              <QRCodeCard
                tableNumber={table.table_number}
                barSlug={barSlug}
                appUrl={appUrl}
              />
              <button
                onClick={() => handleDelete(table)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:opacity-90"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
