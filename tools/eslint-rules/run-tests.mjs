#!/usr/bin/env node
/**
 * Test runner for custom ESLint legal-compliance rules.
 *
 * Uses ESLint's built-in RuleTester (not vitest).
 * Run with: node tools/eslint-rules/run-tests.mjs
 */

import { RuleTester } from "eslint";

// Import all rules
import noClientTimestamps from "./no-client-timestamps.js";
import noHardDelete from "./no-hard-delete.js";
import requireAuthMiddleware from "./require-auth-middleware.js";
import requireAuditFields from "./require-audit-fields.js";
import noBackdating from "./no-backdating.js";
import enforceBreakRules from "./enforce-break-rules.js";
import enforceMaxWorkingHours from "./enforce-max-working-hours.js";
import enforceRestPeriod from "./enforce-rest-period.js";

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

let passed = 0;
let failed = 0;

function runRule(name, rule, tests) {
  try {
    tester.run(name, rule, tests);
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message.split("\n")[0]}`);
    failed++;
  }
}

console.log("\n🧪 Quoska Legal-Compliance ESLint Rules\n");

// ── no-client-timestamps ──────────────────────────────────────────
runRule("no-client-timestamps", noClientTimestamps, {
  valid: [
    { code: "const now = Date.now();", filename: "src/server/timestamp.server.ts" },
    { code: "const now = Date.now();", filename: "src/clock.test.ts" },
    { code: "const formatted = someDate.toLocaleDateString();", filename: "src/components/TimeDisplay.ts" },
  ],
  invalid: [
    { code: "const now = Date.now();", filename: "src/clock.ts", errors: [{ messageId: "noClientTimestamp" }] },
    { code: "const now = new Date();", filename: "src/quoska.ts", errors: [{ messageId: "noClientTimestamp" }] },
    { code: "const d = new Date(1234567890);", filename: "src/utils.ts", errors: [{ messageId: "noClientTimestamp" }] },
    { code: "const now = moment();", filename: "src/time.ts", errors: [{ messageId: "noClientTimestamp" }] },
    { code: "const now = dayjs();", filename: "src/entry.ts", errors: [{ messageId: "noClientTimestamp" }] },
  ],
});

// ── no-hard-delete ────────────────────────────────────────────────
runRule("no-hard-delete", noHardDelete, {
  valid: [
    { code: "await prisma.timeEntry.delete({ where: { id: 1 } });", filename: "tests/legal/time-entry.test.ts" },
    { code: "await prisma.timeEntry.update({ data: { deletedAt: new Date() } });", filename: "src/services/time-entry.ts" },
    { code: "await prisma.session.delete({ where: { id: 1 } });", filename: "src/auth/session.ts" },
    { code: "await cache.remove('key');", filename: "src/services/cache.ts" },
  ],
  invalid: [
    { code: "await prisma.timeEntry.delete({ where: { id: 1 } });", filename: "src/services/time-entry.ts", errors: [{ messageId: "noHardDelete" }] },
    { code: "await prisma.timeEntry.deleteMany({ where: { userId: 1 } });", filename: "src/services/cleanup.ts", errors: [{ messageId: "noHardDelete" }] },
    { code: "await TimeEntry.destroy({ where: { id: 1 } });", filename: "src/services/time-entry.ts", errors: [{ messageId: "noHardDelete" }] },
    { code: "await WorkSession.remove();", filename: "src/api/entries.ts", errors: [{ messageId: "noHardDelete" }] },
    { code: "sql`DELETE FROM time_entries WHERE id = ${id}`;", filename: "src/db/queries.ts", errors: [{ messageId: "noSqlDelete" }] },
  ],
});

// ── require-auth-middleware ────────────────────────────────────────
runRule("require-auth-middleware", requireAuthMiddleware, {
  valid: [
    { code: "app.get('/api/time-entries', handler);", filename: "tests/api.test.ts" },
    { code: "app.get('/api/time-entries', requireAuth, handler);", filename: "src/routes/time.ts" },
    { code: "app.post('/api/clock-in', authenticate(), handler);", filename: "src/routes/clock.ts" },
    { code: "app.get('/api/health', handler);", filename: "src/routes/health.ts" },
    { code: "app.get('/api/shifts', authGuard, handler);", filename: "src/routes/shifts.ts" },
  ],
  invalid: [
    { code: "app.get('/api/time-entries', handler);", filename: "src/routes/time.ts", errors: [{ messageId: "requireAuth" }] },
    { code: "app.post('/api/clock-in', handler);", filename: "src/routes/clock.ts", errors: [{ messageId: "requireAuth" }] },
    { code: "app.get('/api/quoska', handler);", filename: "src/routes/quoska.ts", errors: [{ messageId: "requireAuth" }] },
    { code: "app.post('/api/break/start', handler);", filename: "src/routes/break.ts", errors: [{ messageId: "requireAuth" }] },
  ],
});

// ── require-audit-fields ──────────────────────────────────────────
runRule("require-audit-fields", requireAuditFields, {
  valid: [
    { code: "await prisma.timeEntry.update({ data: { hours: 8 } });", filename: "tests/legal/audit.test.ts" },
    { code: "await prisma.timeEntry.update({ data: { hours: 8, changedBy: userId, changedAt: now } });", filename: "src/services/time-entry.ts" },
    { code: "await prisma.timeEntry.update({ data: { hours: 8, modifiedBy: userId } });", filename: "src/services/time-entry.ts" },
    { code: "await prisma.timeEntry.update({ data: { ...updateData } });", filename: "src/services/time-entry.ts" },
    { code: "await prisma.timeEntry.update(payload);", filename: "src/services/time-entry.ts" },
    { code: "await prisma.timeEntry.findMany({ where: { userId: 1 } });", filename: "src/services/time-entry.ts" },
  ],
  invalid: [
    { code: "await prisma.timeEntry.update({ data: { hours: 8, note: 'updated' } });", filename: "src/services/time-entry.ts", errors: [{ messageId: "requireAuditFields" }] },
    { code: "await TimeEntry.create({ data: { startTime: '09:00', endTime: '17:00' } });", filename: "src/services/time-entry.ts", errors: [{ messageId: "requireAuditFields" }] },
  ],
});

// ── no-backdating ─────────────────────────────────────────────────
runRule("no-backdating", noBackdating, {
  valid: [
    { code: "entry.date = req.body.date;", filename: "tests/legal/backdating.test.ts" },
    { code: "entry.date = req.body.date;", filename: "src/routes/correction.ts" },
    { code: "entry.startTime = serverTimestamp();", filename: "src/services/clock.ts" },
    { code: "entry.date = '2026-01-01';", filename: "src/services/seed.ts" },
  ],
  invalid: [
    { code: "entry.date = req.body.date;", filename: "src/services/clock.ts", errors: [{ messageId: "noBackdating" }] },
    { code: "entry.startTime = request.params.startTime;", filename: "src/api/entries.ts", errors: [{ messageId: "noBackdating" }] },
    { code: "entry.checkIn = query.checkIn;", filename: "src/routes/clock-in.ts", errors: [{ messageId: "noBackdating" }] },
  ],
});

// ── enforce-break-rules ───────────────────────────────────────────
runRule("enforce-break-rules", enforceBreakRules, {
  valid: [
    { code: "const breakThreshold = 25;", filename: "tests/legal/breaks.test.ts" },
    { code: "const minBreakMinutes = 30;", filename: "src/services/break-validation.ts" },
    { code: "const requiredBreak = 45;", filename: "src/services/break-validation.ts" },
    { code: "const breakBlock = 15;", filename: "src/services/break-validation.ts" },
  ],
  invalid: [
    { code: "const minBreakMinutes = 25;", filename: "src/services/break-validation.ts", errors: [{ messageId: "wrongBreakThreshold" }] },
    { code: "const breakDuration = 35;", filename: "src/services/break-validation.ts", errors: [{ messageId: "wrongBreakThreshold" }] },
    { code: "const requiredBreak = 50;", filename: "src/services/break-validation.ts", errors: [{ messageId: "wrongBreakThreshold" }] },
  ],
});

// ── enforce-max-working-hours ─────────────────────────────────────
runRule("enforce-max-working-hours", enforceMaxWorkingHours, {
  valid: [
    { code: "const maxDailyHours = 12;", filename: "tests/legal/hours.test.ts" },
    { code: "const maxDailyHours = 10;", filename: "src/services/work-hours.ts" },
    { code: "const maxDailyHours = 8;", filename: "src/services/work-hours.ts" },
    { code: "const maxWeeklyHours = 48;", filename: "src/services/work-hours.ts" },
    { code: "const weeklyMax = 40;", filename: "src/services/work-hours.ts" },
  ],
  invalid: [
    { code: "const maxDailyHours = 12;", filename: "src/services/work-hours.ts", errors: [{ messageId: "invalidDailyMax" }] },
    { code: "const maxWeeklyHours = 60;", filename: "src/services/work-hours.ts", errors: [{ messageId: "invalidWeeklyMax" }] },
  ],
});

// ── enforce-rest-period ───────────────────────────────────────────
runRule("enforce-rest-period", enforceRestPeriod, {
  valid: [
    { code: "const restPeriodHours = 8;", filename: "tests/legal/rest.test.ts" },
    { code: "const restPeriodHours = 11;", filename: "src/services/shift-validation.ts" },
    { code: "const minRestHours = 12;", filename: "src/services/shift-validation.ts" },
    { code: "const config = { restPeriod: 11 };", filename: "src/services/shift-validation.ts" },
  ],
  invalid: [
    { code: "const restPeriodHours = 8;", filename: "src/services/shift-validation.ts", errors: [{ messageId: "invalidRestPeriod" }] },
    { code: "const minRestHours = 10;", filename: "src/services/shift-validation.ts", errors: [{ messageId: "invalidRestPeriod" }] },
    { code: "const config = { restPeriod: 9 };", filename: "src/services/shift-validation.ts", errors: [{ messageId: "invalidRestPeriod" }] },
  ],
});

// ── Summary ───────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
