"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

interface CategoryTabsProps {
  categories: Category[];
  selected: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryTabs({ categories, selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          selected === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        )}
      >
        Todo
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            selected === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
