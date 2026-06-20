#!/usr/bin/env npx tsx
/**
 * E2E Coverage Enforcement Script
 *
 * Reads the coverage map and verifies every implemented feature story
 * has e2e test files that exist and contain actual tests.
 *
 * Usage:
 *   npx tsx scripts/check-e2e-coverage.ts        # Check only
 *   npx tsx scripts/check-e2e-coverage.ts --fix   # Show fix suggestions
 *
 * Exit code: 0 = pass, 1 = coverage gaps found
 */

import * as fs from "fs";
import * as path from "path";

// ── Coverage Map (inline to avoid import issues) ──────────────────────────
// This mirrors tests/e2e-coverage-map.ts. Keep in sync.
// When the project grows, consider using ts-morph or a JSON format.

interface StoryCoverage {
  id: string;
  name: string;
  epic: number;
  status: "implemented" | "in-progress" | "planned" | "infra";
  type: "feature" | "infra";
  testFiles: string[];
}

const COVERAGE_MAP: StoryCoverage[] = [
  // Epic 1: Foundation
  { id: "1.1", name: "Project Scaffold & Dev Tooling", epic: 1, status: "implemented", type: "infra", testFiles: [] },
  { id: "1.2", name: "Database Schema, Migrations & RLS", epic: 1, status: "implemented", type: "infra", testFiles: [] },
  { id: "1.3", name: "Authentication — Register, Login, Logout", epic: 1, status: "implemented", type: "feature", testFiles: ["tests/e2e/auth.spec.ts"] },
  { id: "1.4", name: "Tenant Setup Wizard & First Employee Invite", epic: 1, status: "implemented", type: "feature", testFiles: ["tests/e2e/setup-wizard.spec.ts"] },
  { id: "1.5", name: "App Shell — Layout, Navigation & PWA", epic: 1, status: "implemented", type: "feature", testFiles: ["tests/e2e/app-shell.spec.ts"] },

  // Epic 2: Core Time Tracking
  { id: "2.1", name: "Clock In / Out — The Full Employee Cycle", epic: 2, status: "implemented", type: "feature", testFiles: ["tests/e2e/clock-in-out.spec.ts"] },
  { id: "2.2", name: "Break Tracking — Start, End & Minimum Enforcement", epic: 2, status: "implemented", type: "feature", testFiles: ["tests/e2e/break-tracking.spec.ts"] },
  { id: "2.3", name: "ArbZG Compliance Warnings — Live Alerts", epic: 2, status: "implemented", type: "feature", testFiles: ["tests/e2e/full-day-cycle.spec.ts", "tests/legal/arbzg.test.ts"] },
  { id: "2.4", name: "End-to-End Time Tracking Day — Edge Cases", epic: 2, status: "implemented", type: "feature", testFiles: ["tests/e2e/full-day-cycle.spec.ts", "tests/integration/clock-flow.test.ts"] },

  // Epic 3: Employee Management
  { id: "3.1", name: "Add, Edit & Invite Employees", epic: 3, status: "implemented", type: "feature", testFiles: ["tests/e2e/employee-management.spec.ts", "tests/services/employeeService.test.ts"] },
  { id: "3.2", name: "Deactivate Employees & Enforce Plan Limits", epic: 3, status: "implemented", type: "feature", testFiles: ["tests/e2e/employee-deactivate.spec.ts", "tests/services/employeeService-deactivate.test.ts"] },

  // Epic 4: Data Integrity
  { id: "4.1", name: "Manager Time Entry Edit with Full Audit Trail", epic: 4, status: "planned", type: "feature", testFiles: [] },
  { id: "4.2", name: "Employee Correction Request Flow", epic: 4, status: "planned", type: "feature", testFiles: [] },
  { id: "4.3", name: "Legal Compliance Test Suite", epic: 4, status: "implemented", type: "infra", testFiles: ["tests/legal/revisionssicherheit.test.ts", "tests/legal/arbzg.test.ts", "tests/legal/dsgvo.test.ts"] },

  // Epic 5: Dashboard & Reporting (planned)
  { id: "5.1", name: "Manager Dashboard — Live Team Status", epic: 5, status: "planned", type: "feature", testFiles: [] },
  { id: "5.2", name: "Employee Self-Service — My Times & Overtime", epic: 5, status: "planned", type: "feature", testFiles: [] },
  { id: "5.3", name: "Public Holiday Engine", epic: 5, status: "planned", type: "feature", testFiles: [] },
  { id: "5.4", name: "Weekly Report — Manager Per-Employee Breakdown", epic: 5, status: "planned", type: "feature", testFiles: [] },

  // Epic 6: Export & DSGVO (planned)
  { id: "6.1", name: "CSV Export & Employee Data Portability", epic: 6, status: "planned", type: "feature", testFiles: [] },
  { id: "6.2", name: "PDF Export — Server-Side Generation", epic: 6, status: "planned", type: "feature", testFiles: [] },
  { id: "6.3", name: "DSGVO Compliance Suite", epic: 6, status: "planned", type: "feature", testFiles: [] },

  // Epic 7: Notifications (planned)
  { id: "7.1", name: "Forgot Clock-Out & Break Reminders", epic: 7, status: "planned", type: "feature", testFiles: [] },
  { id: "7.2", name: "Correction Request Alert", epic: 7, status: "planned", type: "feature", testFiles: [] },
  { id: "7.3", name: "In-App Inbox & Read State", epic: 7, status: "planned", type: "feature", testFiles: [] },

  // Epic 8: Billing (planned)
  { id: "8.1", name: "Stripe Checkout — Upgrade Flow (open-source: inert without keys)", epic: 8, status: "implemented", type: "feature", testFiles: ["tests/e2e/billing.spec.ts"] },
  { id: "8.2", name: "Stripe Webhooks, Plan Enforcement & Cancellation", epic: 8, status: "implemented", type: "feature", testFiles: ["tests/e2e/billing.spec.ts", "tests/services/subscriptionService.test.ts"] },

  // ── Epic 9: Team Presence ──
  { id: "9.1", name: "Anwesenheits-Board — Team presence visible to all roles", epic: 9, status: "implemented", type: "feature", testFiles: ["tests/e2e/presence.spec.ts"] },
];

// ── Checks ────────────────────────────────────────────────────────────────

interface Violation {
  storyId: string;
  storyName: string;
  issue: string;
  fix?: string;
}

function checkCoverage(): Violation[] {
  const violations: Violation[] = [];

  for (const story of COVERAGE_MAP) {
    if (story.type === "infra") continue;
    if (story.status !== "implemented") continue;

    if (story.testFiles.length === 0) {
      violations.push({
        storyId: story.id,
        storyName: story.name,
        issue: "No e2e test files listed",
        fix: `Create tests/e2e/story-${story.id.replace(".", "-")}.spec.ts and add to the coverage map`,
      });
      continue;
    }

    for (const file of story.testFiles) {
      const filePath = path.join(process.cwd(), file);

      if (!fs.existsSync(filePath)) {
        violations.push({
          storyId: story.id,
          storyName: story.name,
          issue: `Test file not found: ${file}`,
          fix: `Create ${file} or update the coverage map`,
        });
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const hasTests = content.includes("test(") || content.includes("test.describe(");

      if (!hasTests) {
        violations.push({
          storyId: story.id,
          storyName: story.name,
          issue: `Test file has no test cases: ${file}`,
          fix: `Add test cases to ${file}`,
        });
      }
    }
  }

  return violations;
}

// ── Report ────────────────────────────────────────────────────────────────

function printReport(violations: Violation[], showFix: boolean) {
  const implemented = COVERAGE_MAP.filter((s) => s.status === "implemented" && s.type === "feature");
  const withTests = implemented.filter((s) => s.testFiles.length > 0);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  E2E Test Coverage Report — Quoska");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`  Implemented feature stories:  ${implemented.length}`);
  console.log(`  With test coverage:           ${withTests.length}`);
  console.log(`  Coverage ratio:               ${implemented.length > 0 ? Math.round((withTests.length / implemented.length) * 100) : 0}%`);
  console.log(`  Violations:                   ${violations.length}\n`);

  if (violations.length > 0) {
    console.log("  ❌ Coverage violations:\n");
    for (const v of violations) {
      console.log(`  Story ${v.storyId}: ${v.storyName}`);
      console.log(`    → ${v.issue}`);
      if (showFix && v.fix) console.log(`    💡 ${v.fix}`);
    }
    console.log("\n  ❌ FAIL: Add e2e tests before merging.\n");
  } else {
    console.log("  ✅ All implemented feature stories have test coverage.\n");
  }

  const planned = COVERAGE_MAP.filter((s) => s.status === "planned" && s.type === "feature");
  if (planned.length > 0) {
    console.log("  📋 Planned stories (tests needed when implemented):");
    for (const s of planned) {
      console.log(`    • ${s.id} ${s.name} (Epic ${s.epic})`);
    }
    console.log();
  }

  console.log("═══════════════════════════════════════════════════════\n");
}

// ── Main ──────────────────────────────────────────────────────────────────

const showFix = process.argv.includes("--fix");
const violations = checkCoverage();
printReport(violations, showFix);
process.exit(violations.length > 0 ? 1 : 0);
