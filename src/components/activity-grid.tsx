/**
 * ActivityGrid — GitHub-style contribution heatmap for time tracking.
 *
 * Rolling 53-week window. Right = today, left = ~1 year ago.
 * No navigation — just a fun overview.
 *
 * 14px cells, 3px gap → fills ~96% of the card on desktop (932px of 974px).
 */

"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DayActivity {
  date: string;
  workedMinutes: number;
}

interface ActivityGridProps {
  activities: Map<string, DayActivity>;
  dailyTargetMinutes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"] as const;
const DAY_LABELS = ["Mon","","Mit","","Fre","",""] as const;

const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;   // 16px per column
const LABEL_W = 32;         // day-label column width

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtDate(iso: string): string {
  const [y,m,d] = iso.split("-"); return `${d}.${m}.${y}`;
}
function fmtDur(min: number): string {
  const h = Math.floor(min/60), m = Math.round(min%60);
  if (!h) return `${m} Min`; if (!m) return `${h}h`; return `${h}h ${m}m`;
}
function cellColor(w: number, t: number): string {
  if (!w) return ""; const r = w/t;
  if (r>=1) return "#7c3aed"; if (r>=.85) return "#8b5cf6";
  if (r>=.5) return "#a78bfa"; return "#c4b5fd";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityGrid({ activities, dailyTargetMinutes }: ActivityGridProps) {
  const { gridStart, numWeeks, todayISO } = useMemo(() => {
    // eslint-disable-next-line @quoska/legal/no-client-timestamps
    const now = new Date();
    const dow = now.getDay();
    // eslint-disable-next-line @quoska/legal/no-client-timestamps
    const mon = new Date(now);
    mon.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
    // eslint-disable-next-line @quoska/legal/no-client-timestamps
    const start = new Date(mon);
    start.setDate(mon.getDate() - 52 * 7);
    return { gridStart: start, numWeeks: 53, todayISO: toISO(now) };
  }, []);

  const cells = useMemo(() => {
    const r: { date:string; w:number; today:boolean; future:boolean }[][] = [];
    for (let wk = 0; wk < numWeeks; wk++) {
      const col: typeof r[0] = [];
      for (let d = 0; d < 7; d++) {
        // eslint-disable-next-line @quoska/legal/no-client-timestamps
        const dt = new Date(gridStart);
        dt.setDate(gridStart.getDate() + wk*7 + d);
        const iso = toISO(dt);
        col.push({ date:iso, w: activities.get(iso)?.workedMinutes??0, today:iso===todayISO, future:iso>todayISO });
      }
      r.push(col);
    }
    return r;
  }, [gridStart, numWeeks, activities, todayISO]);

  const months = useMemo(() => {
    const r: { label:string; col:number }[] = [];
    let prev = -1;
    for (let wk = 0; wk < numWeeks; wk++) {
      // eslint-disable-next-line @quoska/legal/no-client-timestamps
      const dt = new Date(gridStart);
      dt.setDate(gridStart.getDate() + wk*7 + 3);
      const m = dt.getMonth();
      if (m !== prev) { r.push({ label: MONTHS[m], col: wk }); prev = m; }
    }
    return r;
  }, [gridStart, numWeeks]);

  const legend = [
    { bg:"#ebedf0", border:true },
    { bg:"#c4b5fd" }, { bg:"#a78bfa" }, { bg:"#8b5cf6" }, { bg:"#7c3aed" },
  ];

  return (
    <div className="w-full overflow-x-auto">
      {/* Month labels — aligned with cell columns */}
      <div className="relative" style={{ height: 20, marginLeft: LABEL_W }}>
        {months.map(({ label, col }) => (
          <span
            key={`${label}-${col}`}
            className="absolute text-xs text-muted-foreground/70 font-medium leading-none"
            style={{ left: col * STEP }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Day labels + cells */}
      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col shrink-0" style={{ gap: GAP, width: LABEL_W, paddingRight: 5 }}>
          {DAY_LABELS.map((lbl, i) => (
            <div key={i} className="flex items-center" style={{ height: CELL }}>
              {lbl && <span className="text-xs text-muted-foreground/60 leading-none w-full text-right">{lbl}</span>}
            </div>
          ))}
        </div>

        {/* Cell grid */}
        <div className="flex" style={{ gap: GAP }}>
          {cells.map((col, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {col.map((c) => {
                const has = c.w > 0;
                return (
                  <Tooltip key={c.date}>
                    <TooltipTrigger
                      render={(p: React.ComponentPropsWithoutRef<"div">) => (
                        <div
                          {...p}
                          className="rounded-[3px] transition-colors"
                          style={{
                            width: CELL, height: CELL,
                            backgroundColor: has ? cellColor(c.w, dailyTargetMinutes) : "#ebedf0",
                            outline: c.today ? "2px solid rgba(124,58,237,0.45)" : "none",
                            outlineOffset: "1.5px",
                          }}
                        />
                      )}
                    />
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{fmtDate(c.date)}</p>
                      {has
                        ? <p className="text-background/70">{fmtDur(c.w)} gearbeitet</p>
                        : <p className="text-background/50">{c.future ? "Zukunft" : "Keine Einträge"}</p>
                      }
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-xs text-muted-foreground/50">Weniger</span>
        {legend.map((l, i) => (
          <div key={i} className="rounded-[3px]" style={{
            width: CELL, height: CELL,
            backgroundColor: l.bg,
            border: "border" in l && l.border ? "1px solid #d1d5db" : "none",
          }} />
        ))}
        <span className="text-xs text-muted-foreground/50">Mehr</span>
      </div>
    </div>
  );
}
