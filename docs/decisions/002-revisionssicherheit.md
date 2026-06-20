# ADR-002: Revisionssicherheit (Audit Trail)

**Date:** 2026-05-12  
**Status:** Accepted  
**Decision:** All mutations to time entries are recorded in an append-only audit table. Original values are preserved. No hard deletes.

## Context

German labor law requires time records to be "revisionssicher" — meaning they must be tamper-evident. Any change to a recorded time must be traceable: who changed it, when, what was the old value, what is the new value, and why.

## Decision

### Database Structure

1. **`time_entries`** table — current state, supports soft deletes (`deleted_at`)
2. **`time_entry_audit`** table — append-only log of all mutations

### Audit Record Fields

| Field | Source | Example |
|-------|--------|---------|
| `id` | Auto-generated | `uuid` |
| `time_entry_id` | FK to time_entries | `uuid` |
| `tenant_id` | From authenticated user | `uuid` |
| `changed_by` | Employee who made the change | `uuid` |
| `action` | create / update / delete / pause / resume | `"update"` |
| `field_name` | Which field changed | `"clock_out"` |
| `old_value` | Previous value (JSON) | `"null"` |
| `new_value` | New value (JSON) | `"2026-05-12T17:30:00Z"` |
| `reason` | Why (required for manager edits) | `"Forgot to clock out"` |
| `changed_at` | Server timestamp (DB `NOW()`) | `timestamptz` |

### Database-Level Enforcement

- RLS policy on `time_entry_audit`: **INSERT only** — no UPDATE, no DELETE
- Even database admins cannot modify audit records without breaking the policy
- Soft deletes on `time_entries`: `UPDATE SET deleted_at = NOW()` — original row preserved

### Application-Level Rules

- Every service function that mutates `time_entries` MUST also write to `time_entry_audit`
- Manager edits require a `reason` field (enforced by Zod schema)
- Employees cannot edit their own time entries — only request corrections

## Consequences

**Positive:**
- Fully revisionssicher — defensible in labor court
- Complete history of every time entry
- Compliance with GoBD principles

**Negative:**
- Audit table grows fast (estimate: 2-5x the size of time_entries)
- All queries that "restore" a previous value must go through audit log
- Need periodic archival strategy for 2-year retention compliance

## Alternatives Considered

1. **Event sourcing** — entire state from events only — overkill for this scope
2. **Database triggers** — automatic audit logging — rejected: harder to include `reason` and `changed_by`
3. **Application-only logging** — rejected: can be bypassed by direct DB access
