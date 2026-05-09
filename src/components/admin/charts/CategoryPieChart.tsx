"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

export interface CategoryPieData {
  category_id: string | null;
  name: string;
  revenue: number;
  percentage: number;
  products: {
    name: string;
    quantity: number;
    revenue: number;
    percentage_of_category: number;
  }[];
}

export function CategoryPieChart({
  categories,
}: {
  categories: CategoryPieData[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const total = categories.reduce((s, c) => s + c.revenue, 0);
  if (total === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Sin ventas en este rango
      </p>
    );
  }

  let cumPct = 0;
  const segments = categories.map((c, i) => {
    const startPct = cumPct;
    cumPct += c.revenue / total;
    return {
      ...c,
      key: c.category_id ?? `none-${i}`,
      color: PIE_COLORS[i % PIE_COLORS.length],
      startPct,
      endPct: cumPct,
    };
  });

  const selectedSegment =
    selected != null ? segments.find((s) => s.key === selected) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex justify-center items-center">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-56 h-56 -rotate-90">
          {segments.map((s) => {
            const isHovered = hovered === s.key;
            const isSelected = selected === s.key;
            const isFullCircle = s.endPct - s.startPct >= 0.999;
            const r = isHovered || isSelected ? 1.05 : 1;
            return (
              <path
                key={s.key}
                d={
                  isFullCircle
                    ? `M ${0} ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${r} ${r} 0 0 1 0 ${-r} Z`
                    : describeArcPath(s.startPct, s.endPct, r)
                }
                fill={s.color}
                stroke="white"
                strokeWidth="0.02"
                opacity={
                  selected != null && !isSelected && !isHovered ? 0.4 : 1
                }
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() =>
                  setSelected(selected === s.key ? null : s.key)
                }
              />
            );
          })}
        </svg>
      </div>

      <div className="space-y-2">
        {!selectedSegment ? (
          <div className="space-y-1.5">
            {segments.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelected(s.key)}
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                  hovered === s.key ? "bg-muted" : ""
                }`}
              >
                <span
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 font-medium truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(s.revenue)}
                </span>
                <span className="font-semibold tabular-nums w-10 text-right">
                  {s.percentage.toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: selectedSegment.color }}
              />
              <span className="font-semibold flex-1">
                {selectedSegment.name}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:underline"
              >
                ← Volver
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(selectedSegment.revenue)} ·{" "}
              {selectedSegment.percentage.toFixed(0)}% del total
            </p>
            <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-hide">
              {selectedSegment.products.map((p) => (
                <div
                  key={p.name}
                  className="space-y-0.5 rounded-md bg-muted/40 px-2 py-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {p.quantity} uds ·{" "}
                      <span className="font-semibold text-foreground">
                        {p.percentage_of_category.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${p.percentage_of_category}%`,
                        backgroundColor: selectedSegment.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function describeArcPath(
  startPct: number,
  endPct: number,
  r: number = 1
): string {
  const startAngle = startPct * 2 * Math.PI;
  const endAngle = endPct * 2 * Math.PI;
  const x1 = Math.cos(startAngle) * r;
  const y1 = Math.sin(startAngle) * r;
  const x2 = Math.cos(endAngle) * r;
  const y2 = Math.sin(endAngle) * r;
  const largeArc = endPct - startPct > 0.5 ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}
