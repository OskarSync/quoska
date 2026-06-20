/**
 * ClockMainCard — the primary clock card: circular progress ring, the main
 * stamp button, live status badge, animated balance display, and the
 * carry-over / daily-progress indicators.
 *
 * Presentational: all values arrive as already-computed props.
 */

"use client";

import type { TimeEntry, BreakSession } from "@/types/database";
import type { TodaySummary } from "@/types/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Coffee,
  TrendingUp,
} from "lucide-react";
import { formatTimeLocal } from "@/config/client/date-utils";
import { ProgressRing } from "@/components/progress-ring";
import { formatBalance, formatDurationCompact } from "@/components/clock-format";
import type { ClockButtonConfig, OptimisticAction } from "@/components/clock-button-config";

interface ClockMainCardProps {
  ringProgress: number;
  ringSize: number;
  ringStroke: number;
  hasReachedTarget: boolean;
  isDeficit: boolean;
  activeEntry: TimeEntry | null;
  activeBreak: BreakSession | null;
  isActive: boolean;
  activePulse: boolean;
  popKey: number;
  btn: ClockButtonConfig;
  btnShadow: string;
  isProcessing: boolean;
  optimisticAction: OptimisticAction;
  onClockAction: () => void;
  animatedBalance: number;
  liveBalance: number;
  todaySummary: TodaySummary | null;
  projectName?: string;
  monthCarryOverMinutes: number;
  todayWorkedMinutes: number;
  dailyTargetMinutes: number;
  progressFraction: number;
}

export function ClockMainCard({
  ringProgress,
  ringSize,
  ringStroke,
  hasReachedTarget,
  isDeficit,
  activeEntry,
  activeBreak,
  isActive,
  activePulse,
  popKey,
  btn,
  btnShadow,
  isProcessing,
  optimisticAction,
  onClockAction,
  animatedBalance,
  liveBalance,
  todaySummary,
  projectName,
  monthCarryOverMinutes,
  todayWorkedMinutes,
  dailyTargetMinutes,
  progressFraction,
}: ClockMainCardProps) {
  return (
    <Card className="shadow-md border-gray-100/80 overflow-visible">
      <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4">

        {/* Circular progress ring + button */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <ProgressRing
              progress={ringProgress}
              size={ringSize}
              strokeWidth={ringStroke}
              celebrating={hasReachedTarget && !activeEntry}
              isDeficit={isDeficit}
            />
          </div>

          {/* The main stamp button — with pop animation */}
          <Tooltip key={popKey}>
            <TooltipTrigger
              render={(props: React.ComponentPropsWithoutRef<"button">) => (
                <button
                  {...props}
                  onClick={onClockAction}
                  disabled={isProcessing && !optimisticAction}
                  aria-label={btn.label}
                  className={`
                    stamp-button relative z-10
                    w-[200px] h-[200px]
                    rounded-full
                    flex items-center justify-center
                    text-white
                    transition-colors duration-300 ease-out
                    disabled:cursor-not-allowed
                    ${btn.bgClass} ${!optimisticAction ? btn.hoverClass : ""}
                  `}
                  style={{
                    boxShadow: btnShadow,
                    margin: (ringSize - 200) / 2,
                  }}
                >
                  {/* Inner glow */}
                  <div
                    className="absolute inset-0 rounded-full opacity-20 pointer-events-none"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, transparent 60%)",
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    {btn.iconSvg}
                    <span className="text-[11px] font-semibold tracking-wider uppercase opacity-90">
                      {btn.label}
                    </span>
                  </div>
                </button>
              )}
            />
            <TooltipContent side="bottom">
              <p>{btn.label}</p>
            </TooltipContent>
          </Tooltip>

          {/* Target reached celebration badge */}
          {hasReachedTarget && !activeEntry && (
            <div className="absolute -top-1 -right-1 z-20 celebrate-badge">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="size-5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Status badge */}
        {isActive ? (
          <Badge
            variant="secondary"
            className="gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
          >
            <span className={`size-2 rounded-full ${activeBreak ? "bg-amber-400" : "bg-emerald-400"} ${activePulse ? "animate-pulse" : ""}`} />
            {activeBreak
              ? `Pause seit ${formatTimeLocal(activeBreak.break_start)}`
              : activeEntry
                ? `Seit ${formatTimeLocal(activeEntry.clock_in)}`
                : "…"
            }
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 text-xs font-medium px-3 py-1 rounded-full text-muted-foreground">
            <Clock className="size-3" />
            Bereit zum Einstempeln
          </Badge>
        )}

        {/* ---- Animated balance display ---- */}
        {(activeEntry || (todaySummary && todaySummary.netMinutes > 0)) && !activeBreak ? (
          <div className="text-center">
            <p className={`text-4xl font-mono font-bold tracking-tight tabular-nums ${
              animatedBalance < 0
                ? "text-foreground"
                : animatedBalance === 0
                  ? "text-foreground"
                  : "text-emerald-600"
            }`}>
              {formatBalance(animatedBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {animatedBalance < 0
                ? "noch bis zum Tagesziel"
                : animatedBalance === 0
                  ? "Tagesziel erreicht"
                  : "Überstunden heute"
              }
            </p>
          </div>
        ) : null}

        {/* Break running indicator */}
        {activeBreak && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coffee className="size-4 text-amber-500" />
            <span>Pause läuft…</span>
          </div>
        )}

        {/* Project info while running */}
        {activeEntry?.project_id && projectName && !activeBreak && (
          <Badge variant="outline" className="gap-1 text-xs rounded-full">
            <Briefcase className="size-3" />
            {projectName}
          </Badge>
        )}

        {/* Target reached celebration message */}
        {hasReachedTarget && !activeEntry && liveBalance > 0 && (
          <div className="celebrate-text text-center">
            <p className="text-sm font-semibold text-emerald-600">
              🎉 Tagesziel erreicht!
            </p>
          </div>
        )}

        {/* Carry-over info */}
        {monthCarryOverMinutes !== 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className={`size-3 ${monthCarryOverMinutes > 0 ? "text-emerald-500" : "text-amber-500"}`} />
            <span>
              {monthCarryOverMinutes > 0
                ? `Übertrag aus vorherigen Tagen: +${formatDurationCompact(monthCarryOverMinutes)}`
                : `Übertrag aus vorherigen Tagen: -${formatDurationCompact(Math.abs(monthCarryOverMinutes))}`
              }
            </span>
          </div>
        )}

        {/* Daily progress indicator */}
        {(todayWorkedMinutes > 0 || hasReachedTarget) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDurationCompact(todayWorkedMinutes)}</span>
            <span className="text-muted-foreground/40">/</span>
            <span>{formatDurationCompact(dailyTargetMinutes)} Soll</span>
            <Badge
              variant={hasReachedTarget ? "default" : "secondary"}
              className={`text-[10px] px-1.5 py-0 rounded-full ${
                hasReachedTarget
                  ? "bg-gradient-to-r from-emerald-500 to-amber-400 text-white border-0"
                  : ""
              }`}
            >
              {Math.min(Math.round(progressFraction * 100), 100)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
