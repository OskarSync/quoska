# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Instead, email **[TODO: security@quoska.app]** with a description and, if possible, steps to reproduce. We aim to acknowledge within 72 hours and to coordinate a fix and disclosure timeline with you.

## Scope

This policy covers the Quoska application code in this repository. Out of scope: the hosted service's infrastructure (report via your Quoska account instead), and dependencies (report upstream).

## Security-relevant design choices

Quoska handles employee time data, which is personal data under the DSGVO and legally retention-relevant under ArbZG. The codebase enforces:

- **Server-only timestamps** — client clocks are never trusted for time entries (§16 ArbZG).
- **Soft deletes only** — time entries are never hard-deleted, preserving the audit trail (Revisionssicherheit / GoBD).
- **Row-Level Security** in PostgreSQL for tenant isolation — every query is tenant-scoped.
- **Audit trail** — every mutation on a time entry records who changed what, when, and the old/new values.

## Disclosure

We follow coordinated disclosure: once a fix is available we publish a GitHub Security Advisory and credit the reporter (unless they prefer to remain anonymous).
