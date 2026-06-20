/**
 * ClockView — Premium clock in/out UI with circular progress ring,
 * animated state transitions, break tracking, and compliance warnings.
 *
 * Features:
 * - Optimistic UI: button changes instantly on click, rolls back on error
 * - Pop animation: satisfying bounce on button press
 * - Animated counter: balance number smoothly transitions between values
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";
import { ComplianceWarnings } from "@/components/compliance-warnings";
import { useClockMutations } from "@/components/clock-mutations";
import { ProjectSelector } from "@/components/project-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pause, Coffee } from "lucide-react";
import {
  getButtonConfig,
  type OptimisticAction,
} from "@/components/clock-button-config";
import { useAnimatedValue } from "@/components/use-animated-value";
import { formatDuration } from "@/components/clock-format";
import { ClockMainCard } from "@/components/clock-main-card";
import { TodaySummaryCard } from "@/components/clock-today-summary";
import { WeekSummaryCard } from "@/components/clock-week-summary";

export function ClockView() {
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(false);
  // Optimistic UI state: tracks what the user just pressed
  const [optimisticAction, setOptimisticAction] = useState<OptimisticAction>(null);
  const [popKey, setPopKey] = useState(0); // triggers pop animation
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setInterval(() => setPulsePhase((p) => !p), 2000);
    return () => clearInterval(id);
  }, []);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["clockStatus"],
    queryFn: async () => {
      const res = await fetch("/api/v1/clock/status");
      const json: ApiResponse<ClockStatusResponse> = await res.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const activeEntry = statusData?.activeEntry ?? null;
  const activeBreak = statusData?.activeBreak ?? null;
  const compliance = statusData?.compliance;
  const todaySummary = statusData?.todaySummary;
  const weekSummary = statusData?.weekSummary;
  const monthCarryOverMinutes = statusData?.monthCarryOverMinutes ?? 0;

  const { data: myProjects } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["myProjects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects?assigned=true");
      const json: ApiResponse<{ id: string; name: string }[]> = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });
  const projectName = myProjects?.find((p) => p.id === activeEntry?.project_id)?.name;

  const updateProjectMutation = useMutation({
    mutationFn: async ({ entryId, projectId }: { entryId: string; projectId: string }) => {
      const res = await fetch(`/api/v1/time-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clock_in: activeEntry?.clock_in, reason: "Projekt nachträglich zugewiesen", project_id: projectId }),
      });
      if (!res.ok) throw new Error("Projekt konnte nicht zugewiesen werden");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const {
    clockInMutation, clockOutMutation, pauseMutation, resumeMutation,
    isProcessing, error,
  } = useClockMutations(activeEntry, activeBreak, selectedProject);

  // Live duration counter
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!activeEntry?.clock_in) return;

    const clockInMs = Date.parse(activeEntry.clock_in);
    const breakMin = activeEntry.break_minutes ?? 0;

    const tick = () => {
      // eslint-disable-next-line @quoska/legal/no-client-timestamps
      const nowMs = Date.now();
      setDisplayMinutes(Math.round(Math.abs(nowMs - clockInMs) / 60_000) - breakMin);
    };

    tick();
    intervalRef.current = setInterval(tick, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeEntry?.clock_in, activeEntry?.break_minutes]);

  // --- Balance calculation ---
  const dailyTargetMinutes = weekSummary
    ? Math.round(weekSummary.targetMinutes / 5)
    : 480;

  // Today's worked minutes
  // When running: live counter + previously completed sessions today
  // When not running: all completed sessions from the API summary
  const completedTodayMinutes = todaySummary?.netMinutes ?? 0;
  const todayWorkedMinutes = activeEntry?.status === "running"
    ? displayMinutes + completedTodayMinutes
    : completedTodayMinutes;

  const liveBalance = todayWorkedMinutes - dailyTargetMinutes + monthCarryOverMinutes;

  // Animated counter for the balance display
  const animatedBalance = useAnimatedValue(liveBalance, 600);

  const progressFraction = dailyTargetMinutes > 0
    ? todayWorkedMinutes / dailyTargetMinutes
    : 0;

  const isDeficit = liveBalance < 0;
  // Only celebrate if user has actually worked today AND balance is positive
  const hasReachedTarget = liveBalance >= 0 && todayWorkedMinutes > 0;

  // Clear optimistic state when the server reflects the action.
  // Uses React's "set state during render" reconciliation pattern (per the
  // React docs "You Might Not Need an Effect") instead of setState-in-an-effect,
  // which would cause cascading renders. Self-terminating: once cleared to null,
  // no branch matches on subsequent renders.
  if (optimisticAction === "clock-in" && activeEntry?.status === "running") {
    setOptimisticAction(null);
  } else if (optimisticAction === "clock-out" && !activeEntry) {
    setOptimisticAction(null);
  } else if (optimisticAction === "pause" && activeBreak) {
    setOptimisticAction(null);
  } else if (optimisticAction === "resume" && activeEntry?.status === "running" && !activeBreak) {
    setOptimisticAction(null);
  }

  // --- Button configuration ---
  // Optimistic: if user just pressed, show the NEXT state immediately
  const btn = getButtonConfig(activeEntry, activeBreak, optimisticAction);

  const handleClockAction = useCallback(() => {
    // Trigger pop animation
    setPopKey((k) => k + 1);

    if (activeBreak) {
      setOptimisticAction("resume");
      resumeMutation.mutate(undefined, {
        onError: () => setOptimisticAction(null),
      });
      return;
    }
    if (activeEntry?.status === "running") {
      setOptimisticAction("clock-out");
      clockOutMutation.mutate(undefined, {
        onError: () => setOptimisticAction(null),
      });
      return;
    }
    setOptimisticAction("clock-in");
    clockInMutation.mutate(undefined, {
      onError: () => setOptimisticAction(null),
    });
  }, [activeBreak, activeEntry, clockInMutation, clockOutMutation, resumeMutation]);

  const handlePause = useCallback(() => {
    setOptimisticAction("pause");
    pauseMutation.mutate(undefined, {
      onError: () => setOptimisticAction(null),
    });
  }, [pauseMutation]);

  const isActive = activeEntry?.status === "running" || !!activeBreak || !!optimisticAction;
  const activePulse = isActive && pulsePhase;
  const btnShadow = activePulse
    ? `0 0 40px ${btn.shadowColor}, 0 8px 32px ${btn.shadowColor}`
    : `0 8px 32px ${btn.shadowColor}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Skeleton className="h-52 w-52 rounded-full" />
      </div>
    );
  }

  const ringSize = 240;
  const ringStroke = 8;
  const ringProgress = Math.min(progressFraction, 1);

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center">
        {/* Centered heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Stempeln</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clock in und out mit einem Klick
          </p>
        </div>

        <div className="space-y-5 w-full max-w-sm">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ---- Main Clock Card ---- */}
        <ClockMainCard
          ringProgress={ringProgress}
          ringSize={ringSize}
          ringStroke={ringStroke}
          hasReachedTarget={hasReachedTarget}
          isDeficit={isDeficit}
          activeEntry={activeEntry}
          activeBreak={activeBreak}
          isActive={isActive}
          activePulse={activePulse}
          popKey={popKey}
          btn={btn}
          btnShadow={btnShadow}
          isProcessing={isProcessing}
          optimisticAction={optimisticAction}
          onClockAction={handleClockAction}
          animatedBalance={animatedBalance}
          liveBalance={liveBalance}
          todaySummary={todaySummary ?? null}
          projectName={projectName}
          monthCarryOverMinutes={monthCarryOverMinutes}
          todayWorkedMinutes={todayWorkedMinutes}
          dailyTargetMinutes={dailyTargetMinutes}
          progressFraction={progressFraction}
        />

        {/* Project selector */}
        {!activeEntry && !optimisticAction && (
          <ProjectSelector value={selectedProject} onValueChange={setSelectedProject} />
        )}

        {/* Retroactive project selector while clocked in */}
        {activeEntry?.status === "running" && !activeBreak && !activeEntry.project_id && (
          <ProjectSelector value={selectedProject} onValueChange={(v) => {
            setSelectedProject(v);
            if (v && activeEntry) updateProjectMutation.mutate({ entryId: activeEntry.id, projectId: v });
          }} />
        )}

        {/* Pause button */}
        {activeEntry?.status === "running" && !activeBreak && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePause}
              disabled={isProcessing && !optimisticAction}
              className="gap-2 rounded-full px-6"
            >
              <Pause className="size-4" />
              Pause starten
            </Button>
          </div>
        )}

        {/* Break time summary */}
        {activeEntry && activeEntry.break_minutes > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Coffee className="size-3.5" />
            Pause heute: {formatDuration(activeEntry.break_minutes)}
          </div>
        )}

        {/* Compliance warnings */}
        {compliance && compliance.warnings.length > 0 && (
          <ComplianceWarnings warnings={compliance.warnings} />
        )}

        {/* Today summary */}
        {!activeEntry && todaySummary?.clockIn && (
          <TodaySummaryCard todaySummary={todaySummary} />
        )}

        {/* Week summary */}
        {weekSummary && (
          <WeekSummaryCard weekSummary={weekSummary} />
        )}
        </div>
      </div>
    </TooltipProvider>
  );
}
