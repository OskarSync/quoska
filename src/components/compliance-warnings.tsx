/**
 * ComplianceWarnings — displays ArbZG compliance warning cards.
 *
 * Color-coded by severity: info=blue, warning=yellow, critical=red.
 * Each card shows the German message and legal reference.
 */

"use client";

import type { ComplianceWarning } from "@/types/compliance";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, AlertOctagon } from "lucide-react";

interface ComplianceWarningsProps {
  warnings: ComplianceWarning[];
}

const levelVariants: Record<string, string> = {
  info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  warning: "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  critical: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

function LevelIcon({ level }: { level: string }) {
  const cls = "size-4 shrink-0 mt-0.5";
  if (level === "critical") return <AlertOctagon className={cls} />;
  if (level === "warning") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

export function ComplianceWarnings({ warnings }: ComplianceWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <Alert
          key={`${w.category}-${i}`}
          className={levelVariants[w.level]}
        >
          <AlertTitle className="flex items-start gap-2">
            <LevelIcon level={w.level} />
            <span>{w.message}</span>
          </AlertTitle>
          <AlertDescription className="ml-6 text-xs opacity-70">
            {w.lawRef}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
