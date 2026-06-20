/**
 * Reports Page — /app/reports
 *
 * Manager view: weekly report, project report, correction review.
 */

"use client";

import { WeeklyReportTable } from "@/components/weekly-report-table";
import { ProjectReportTable } from "@/components/project-report-table";
import { CorrectionReviewList } from "@/components/correction-review-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Berichte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wochenübersicht, Projekte und Korrekturanfragen
        </p>
      </div>

      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Wochenbericht</TabsTrigger>
          <TabsTrigger value="projects">Projekte</TabsTrigger>
          <TabsTrigger value="corrections">Korrekturen</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <WeeklyReportTable />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectReportTable />
        </TabsContent>
        <TabsContent value="corrections">
          <CorrectionReviewList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
