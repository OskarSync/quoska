# ADR-001: Server-Only Timestamps

**Date:** 2026-05-12  
**Status:** Accepted  
**Decision:** All timestamps for time tracking (clock_in, clock_out, break_start, break_end) are generated server-side using PostgreSQL `NOW()`. The client never sends timestamp values.

## Context

§16 Abs. 2 ArbZG requires tamper-proof time recording. Client-side timestamps can be manipulated (changing device clock, browser dev tools, API call with forged time). This would make the time records contestable in labor court.

## Decision

- `clock_in`, `clock_out` are set by the server using `NOW()` in PostgreSQL
- The client only sends: "I want to clock in" (employee_id, optional notes)
- The server responds with the recorded timestamp for display
- Corrections are separate records in the audit trail, never mutations of the original

## Consequences

**Positive:**
- Tamper-proof by design
- Legally defensible in labor court
- Matches ArbZG requirement for "systematic" recording

**Negative:**
- Requires network connection for clock-in/out (offline mode must queue and sync with server confirmation)
- Server clock accuracy matters (use NTP-synced DB server)
- Latency between button press and server recording (acceptable: <500ms for in-app, <2s for mobile)

## Alternatives Considered

1. **Client timestamps with server validation** — rejected: still manipulable
2. **Trusted hardware terminal** — out of scope (no hardware product)
3. **Blockchain-style hashing** — overkill for current requirements
