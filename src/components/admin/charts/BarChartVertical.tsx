"use client";

interface BarChartVerticalProps {
  values: number[];
  labels: string[];
  formatValue: (v: number) => string;
  formatValueShort?: (v: number) => string;
  color: string;
  hoverColor: string;
  showEveryNthLabel?: number;
}

const Y_AXIS_WIDTH = 44;
const PLOT_HEIGHT = 176;

export function BarChartVertical({
  values,
  labels,
  formatValue,
  formatValueShort,
  color,
  hoverColor,
  showEveryNthLabel = 1,
}: BarChartVerticalProps) {
  const max = Math.max(...values, 1);
  const niceMax = niceCeiling(max);
  const ticks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];
  const fmtShort = formatValueShort ?? formatValue;

  return (
    <div className="text-foreground pt-3 pb-1">
      <div className="flex">
        {/* Y-axis labels */}
        <div
          className="relative shrink-0"
          style={{ width: Y_AXIS_WIDTH, height: PLOT_HEIGHT }}
        >
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
              style={{ bottom: `${(t / niceMax) * 100}%` }}
            >
              {fmtShort(t)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div
          className="relative flex-1 border-l-2 border-b-2 border-muted-foreground/40"
          style={{ height: PLOT_HEIGHT }}
        >
          {ticks.slice(1).map((t, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/15"
              style={{ bottom: `${(t / niceMax) * 100}%` }}
            />
          ))}
          {ticks.map((t, i) => (
            <div
              key={i}
              className="absolute w-1.5 border-t border-muted-foreground/50"
              style={{
                bottom: `${(t / niceMax) * 100}%`,
                left: -6,
              }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-0.5 px-1">
            {values.map((v, i) => {
              const heightPct = v > 0 ? Math.max((v / niceMax) * 100, 1.5) : 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-default"
                  title={`${labels[i]} — ${formatValue(v)}`}
                >
                  <span className="text-[9px] font-medium tabular-nums mb-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    {v > 0 ? fmtShort(v) : ""}
                  </span>
                  <div
                    className={`w-full rounded-t ${
                      v > 0 ? color : "bg-muted/30"
                    } group-hover:${hoverColor} transition-colors`}
                    style={{
                      height: `${heightPct}%`,
                      minHeight: v > 0 ? "2px" : "0",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="shrink-0" style={{ width: Y_AXIS_WIDTH }} />
        <div className="flex-1 flex gap-0.5 pt-1.5 px-1">
          {labels.map((l, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[10px] text-muted-foreground tabular-nums"
            >
              {i % showEveryNthLabel === 0 ? l : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function niceCeiling(x: number): number {
  if (x <= 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const base = Math.pow(10, exp);
  const m = x / base;
  let nice;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}
