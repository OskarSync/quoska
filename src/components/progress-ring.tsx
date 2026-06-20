/**
 * ProgressRing — circular progress indicator for the clock view.
 */

"use client";

import { useMemo } from "react";

export interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  celebrating: boolean;
  isDeficit: boolean;
}

export function ProgressRing({ progress, size, strokeWidth, celebrating, isDeficit }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clampedProgress);

  const color = useMemo(() => {
    if (clampedProgress >= 1) return "#fbbf24";
    if (!isDeficit && clampedProgress >= 0.85) return "#34d399";
    if (!isDeficit && clampedProgress >= 0.65) return "#22d3ee";
    if (clampedProgress >= 0.4) return "#6366f1";
    return "#8b5cf6";
  }, [clampedProgress, isDeficit]);

  const glowColor = celebrating ? "#fbbf24" : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={celebrating ? "ring-celebrate" : ""}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" className="text-muted/60"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="progress-ring-fill"
        style={{
          transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s ease",
          filter: `drop-shadow(0 0 8px ${glowColor}40)`,
        }}
      />
    </svg>
  );
}
