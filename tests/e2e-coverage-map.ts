/**
 * E2E Test Coverage Map
 *
 * This file maps every user-facing story to its e2e test file(s).
 * The enforcement script (scripts/check-e2e-coverage.ts) reads this file
 * and verifies that:
 *   1. Every listed test file exists
 *   2. Every listed test file contains at least one test.describe() or test()
 *   3. No story marked as "implemented" is missing test coverage
 *
 * Stories that are purely infrastructure (scaffold, DB migrations) or
 * backend-only can be marked with `type: "infra"` and are exempt.
 *
 * HOW TO ADD A NEW STORY:
 * 1. Implement the story
 * 2. Create an e2e test file in tests/e2e/
 * 3. Add an entry to the coverage map below with status: "implemented"
 * 4. Run `npx tsx scripts/check-e2e-coverage.ts` to verify
 */

export type StoryStatus = "implemented" | "in-progress" | "planned" | "infra";

export interface StoryCoverage {
  /** Story ID (e.g., "2.1") */
  id: string;
  /** Story name */
  name: string;
  /** Epic number */
  epic: number;
  /** Implementation status */
  status: StoryStatus;
  /** Type: "feature" needs e2e, "infra" is exempt */
  type: "feature" | "infra";
  /** E2E test files that cover this story */
  testFiles: string[];
}

export const COVERAGE_MAP: StoryCoverage[] = [
  // ── Epic 1: Foundation ──────────────────────────────────────────────────
  {
    id: "1.1",
    name: "Project Scaffold & Dev Tooling",
    epic: 1,
    status: "implemented",
    type: "infra",
    testFiles: [],
  },
  {
    id: "1.2",
    name: "Database Schema, Migrations & RLS",
    epic: 1,
    status: "implemented",
    type: "infra",
    testFiles: [],
  },
  {
    id: "1.3",
    name: "Authentication — Register, Login, Logout",
    epic: 1,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/auth.spec.ts"],
  },
  {
    id: "1.4",
    name: "Tenant Setup Wizard & First Employee Invite",
    epic: 1,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/setup-wizard.spec.ts"],
  },
  {
    id: "1.5",
    name: "App Shell — Layout, Navigation & PWA",
    epic: 1,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/app-shell.spec.ts"],
  },

  // ── Epic 2: Core Time Tracking ──────────────────────────────────────────
  {
    id: "2.1",
    name: "Clock In / Out — The Full Employee Cycle",
    epic: 2,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/clock-in-out.spec.ts"],
  },
  {
    id: "2.2",
    name: "Break Tracking — Start, End & Minimum Enforcement",
    epic: 2,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/break-tracking.spec.ts"],
  },
  {
    id: "2.3",
    name: "ArbZG Compliance Warnings — Live Alerts",
    epic: 2,
    status: "implemented",
    type: "feature",
    // Compliance warnings are tested via unit tests (tests/legal/arbzg.test.ts)
    // and integration tests (tests/integration/clock-flow.test.ts).
    // E2E: verified via component structure test in full-day-cycle.spec.ts
    testFiles: ["tests/e2e/full-day-cycle.spec.ts", "tests/legal/arbzg.test.ts"],
  },
  {
    id: "2.4",
    name: "End-to-End Time Tracking Day — Edge Cases & Integration",
    epic: 2,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/full-day-cycle.spec.ts", "tests/integration/clock-flow.test.ts"],
  },

  // ── Epic 3: Employee Management ─────────────────────────────────────────
  {
    id: "3.1",
    name: "Add, Edit & Invite Employees",
    epic: 3,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/employee-management.spec.ts", "tests/services/employeeService.test.ts"],
  },
  {
    id: "3.2",
    name: "Deactivate Employees & Enforce Plan Limits",
    epic: 3,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/employee-deactivate.spec.ts", "tests/services/employeeService-deactivate.test.ts"],
  },

  // ── Epic 4: Data Integrity ──────────────────────────────────────────────
  {
    id: "4.1",
    name: "Manager Time Entry Edit with Full Audit Trail",
    epic: 4,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "4.2",
    name: "Employee Correction Request Flow",
    epic: 4,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "4.3",
    name: "Legal Compliance Test Suite",
    epic: 4,
    status: "implemented",
    type: "infra", // This IS the test suite — no e2e needed
    testFiles: ["tests/legal/revisionssicherheit.test.ts", "tests/legal/arbzg.test.ts", "tests/legal/dsgvo.test.ts"],
  },

  // ── Epic 5: Dashboard & Reporting ───────────────────────────────────────
  {
    id: "5.1",
    name: "Manager Dashboard — Live Team Status & Compliance Alerts",
    epic: 5,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "5.2",
    name: "Employee Self-Service — My Times & Overtime",
    epic: 5,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "5.3",
    name: "Public Holiday Engine — Seed, Calculate & Apply",
    epic: 5,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "5.4",
    name: "Weekly Report — Manager Per-Employee Breakdown",
    epic: 5,
    status: "planned",
    type: "feature",
    testFiles: [],
  },

  // ── Epic 6: Export & DSGVO ──────────────────────────────────────────────
  {
    id: "6.1",
    name: "CSV Export & Employee Data Portability",
    epic: 6,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "6.2",
    name: "PDF Export — Server-Side Generation",
    epic: 6,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "6.3",
    name: "DSGVO Compliance Suite — AVV, Retention & Account Deletion",
    epic: 6,
    status: "planned",
    type: "feature",
    testFiles: [],
  },

  // ── Epic 7: Notifications ───────────────────────────────────────────────
  {
    id: "7.1",
    name: "Compliance Notifications — Forgot Clock-Out & Break Reminders",
    epic: 7,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "7.2",
    name: "Workflow Notification — Correction Request Alert",
    epic: 7,
    status: "planned",
    type: "feature",
    testFiles: [],
  },
  {
    id: "7.3",
    name: "Notification End-to-End — In-App Inbox & Read State",
    epic: 7,
    status: "planned",
    type: "feature",
    testFiles: [],
  },

  // ── Epic 8: Billing ─────────────────────────────────────────────────────
  {
    id: "8.1",
    name: "Stripe Checkout — Upgrade Flow (open-source: inert without keys)",
    epic: 8,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/billing.spec.ts"],
  },
  {
    id: "8.2",
    name: "Stripe Webhooks, Plan Enforcement & Cancellation",
    epic: 8,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/billing.spec.ts", "tests/services/subscriptionService.test.ts"],
  },

  // ── Epic 9: Team Presence ────────────────────────────────────────────────
  {
    id: "9.1",
    name: "Anwesenheits-Board — Team presence visible to all roles",
    epic: 9,
    status: "implemented",
    type: "feature",
    testFiles: ["tests/e2e/presence.spec.ts"],
  },
];
