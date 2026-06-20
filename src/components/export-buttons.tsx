/**
 * Export Buttons — CSV export button for the reports page.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExportButtonsProps {
  weekStart: string;
  weekEnd: string;
}

export function ExportButtons({ weekStart, weekEnd }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<"csv" | null>(null);

  const handleExport = async (type: "csv") => {
    setExporting(type);
    try {
      const url = `/api/v1/reports/export/${type}?startDate=${weekStart}&endDate=${weekEnd}`;
      const res = await fetch(url);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export fehlgeschlagen");
      }

      // Download file
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? `export.csv`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => handleExport("csv")}
        disabled={exporting !== null}
      >
        {exporting === "csv" ? "…" : "CSV Export"}
      </Button>
    </div>
  );
}
