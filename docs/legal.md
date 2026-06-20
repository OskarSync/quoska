# Legal Compliance Reference — Quoska

**owner:** oskar  
**status:** active  
**last_verified:** 2026-05-12  
**data_classification:** internal  

---

## Applicable Laws

| Law | What It Requires | Our Implementation |
|-----|------------------|--------------------|
| **EuGH C-55/18** (May 2019) | Systematic time tracking in EU | Core product |
| **BAG 1 ABR 22/21** (Sept 2022) | Binding in Germany immediately | Core product |
| **ArbZG** (reform 2026) | Electronic time tracking, 48h/week | Server timestamps, max-hour enforcement |
| **§3 ArbZG** | Max 8h/day (10h with compensation) | Warning when >10h |
| **§4 ArbZG** | Breaks: 30min after 6h, 45min after 9h | Break enforcement + warnings |
| **§5 ArbZG** | 11h rest between shifts | Warning when <11h gap |
| **§16 Abs. 2 ArbZG** | 2-year retention | Auto-delete after 2 years |
| **§17 MiLoG** | Industry-specific rules (Bau, Gastro) | Phase 2+ |
| **DSGVO / GDPR** | Data minimization, consent, AVV | EU server, minimal data, AVV download |
| **Bußgelder** | Up to €30,000 (ArbZG), €500,000 (MiLoG) | Compliance by design |

## Mandatory Features (Legal Minimum)

These are NOT optional. They are legal requirements.

### 1. Time Recording
- [x] Clock-in / Clock-out with server timestamp
- [ ] Daily record per employee (lückenlos — no gaps)
- [ ] Records must include: start, end, duration, breaks

### 2. Break Tracking (§4 ArbZG)
- [ ] After 6h continuous work: ≥30min break required
- [ ] After 9h continuous work: ≥45min break required
- [ ] Breaks can be split into 15min blocks
- [ ] Warning if break rules violated

### 3. Working Time Limits (§3 ArbZG)
- [ ] Max 8h/day (can extend to 10h with compensation within 6 months)
- [ ] Max 48h/week (ArbZG reform 2026)
- [ ] Warning at 8h, hard warning at 10h

### 4. Rest Periods (§5 ArbZG)
- [ ] Min 11h uninterrupted rest between shifts
- [ ] Warning when next shift starts too early

### 5. Revisionssicherheit (Audit Trail)
- [ ] Original time entry preserved (immutable)
- [ ] All changes logged: who, when, what changed, old value, new value
- [ ] No hard deletes — soft delete with reason
- [ ] Audit log is append-only (no UPDATE/DELETE on audit table)

### 6. Data Protection (DSGVO)
- [ ] EU-hosted servers only (Frankfurt)
- [ ] Data minimization — only collect what's legally required
- [ ] Employees can view their own data (self-service)
- [ ] AVV-Vertrag (Data Processing Agreement) available for download
- [ ] 2-year retention, then auto-delete
- [ ] No GPS tracking by default (only optional, opt-in)

### 7. Accessibility
- [ ] Employees must have access to their own time records
- [ ] Manager/admin can view/edit all records
- [ ] Daily view (tagesaktuell) — no backdating to yesterday

## What Happens If We Get This Wrong

| Violation | Fine |
|-----------|------|
| No time tracking at all | Up to €30,000 |
| Manipulated timestamps | Up to €30,000 |
| Missing breaks (MiLoG industries) | Up to €500,000 |
| DSGVO violation | Up to €20M or 4% revenue |
| Wrong or missing audit trail | Contestable in labor court |

## Testing Legal Compliance

All legal requirements have dedicated tests in `tests/legal/`:

- `arbzg.test.ts` — working time limits, break rules, rest periods
- `revisionssicherheit.test.ts` — audit trail completeness, no hard deletes
- `dsgvo.test.ts` — data access, tenant isolation, no cross-tenant leaks

These tests must NEVER be skipped or marked `.skip`.
