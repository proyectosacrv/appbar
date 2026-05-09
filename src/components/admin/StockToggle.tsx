"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toggleProductStock } from "@/actions/products";
import { toast } from "@/hooks/useToast";

interface StockToggleProps {
  productId: string;
  inStock: boolean;
  barSlug: string;
  onToggle?: (inStock: boolean) => void;
}

export function StockToggle({ productId, inStock, barSlug, onToggle }: StockToggleProps) {
  const [checked, setChecked] = useState(inStock);
  const [loading, setLoading] = useState(false);

  const handleChange = async (value: boolean) => {
    setChecked(value);
    setLoading(true);
    const result = await toggleProductStock(productId, value, barSlug);
    setLoading(false);
    if (result.error) {
      setChecked(!value);
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      onToggle?.(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={handleChange}
        disabled={loading}
        id={`stock-${productId}`}
      />
      <Label htmlFor={`stock-${productId}`} className="text-sm cursor-pointer">
        {checked ? "Disponible" : "Sin stock"}
      </Label>
    </div>
  );
}
