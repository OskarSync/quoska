# Coding Standards — Quoska

**owner:** oskar  
**status:** active  
**last_verified:** 2026-05-12  

---

## General

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without documented reason
- **Max 300 lines per file** — split if larger
- **English** for code, variable names, comments, commit messages
- **German (de-DE)** for all user-facing text (UI, emails, PDFs)
- **ESLint + Prettier** — auto-format on save, lint on commit

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | `kebab-case.tsx` | `clock-in-button.tsx` |
| Pages/Routes | Next.js App Router convention | `app/dashboard/page.tsx` |
| API Routes | `app/api/v1/[resource]/route.ts` | `app/api/v1/clock/in/route.ts` |
| Services | `camelCase.ts` in `src/services/` | `src/services/timeEntryService.ts` |
| Repos | `camelCase.ts` in `src/repos/` | `src/repos/timeEntryRepo.ts` |
| Types | `types.ts` per domain | `src/types/time-entry.ts` |
| Tests | Co-located or `tests/` mirror | `tests/legal/arbzg.test.ts` |

## Architecture Layers

Strict import direction enforced by ESLint:

```
Types ──▶ Config ──▶ Repos ──▶ Services ──▶ API Routes ──▶ UI
```

**Rules:**
- `UI` never imports from `Repos` directly — always through `Services`
- `Services` never import from `UI`
- `Repos` never import from `Services`
- `Types` and `Config` can be imported by anyone

## Database

- **All timestamps** use `timestamptz` (UTC), generated server-side via DB defaults
- **Never** use `Date.now()` or `new Date()` in application code for recording time — always use `NOW()` in SQL or `Supabase.rpc()` with server timestamp
- **All tables** have `created_at`, `updated_at`, `deleted_at` columns
- **Soft deletes only** — `deleted_at = NOW()` instead of DELETE
- **Tenant isolation** — every table has `tenant_id`, every query includes it
- **Audit table** (`time_entry_audit`) — INSERT only, no UPDATE/DELETE policy at DB level

## API Design

- All input validated with **Zod schemas**
- All responses follow consistent shape: `{ data: T, error?: string }`
- HTTP status codes used correctly (201 for create, 204 for delete, etc.)
- Rate limiting on all endpoints
- Auth required on all endpoints except `/api/v1/auth/*`

## Error Handling

- Never expose internal errors to client
- Use structured error types in services
- Log errors server-side with context (tenant_id, employee_id, action)
- Client gets user-friendly German error messages

## Testing

- Every service function has unit tests
- Every API route has integration tests
- Legal compliance tests in `tests/legal/` — never skipped
- Test data seeded via `make setup` (deterministic, repeatable)

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- One feature = one branch = one PR
- PRs reference the GitHub Issue they close
- Squash merge to main
