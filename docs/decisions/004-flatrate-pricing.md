# ADR-004: Flatrate Pricing Model

**Date:** 2026-05-12  
**Status:** Accepted  
**Decision:** Quoska uses flat-rate pricing (no per-employee charge). Free tier up to 3 employees, €39/month for unlimited.

## Context

All competitors (Clockodo, Crewmeister, TimeTac, Personio) charge per employee (€3-8/user/month). For a company with 20 employees that's €110-160/month. This is the #1 complaint in reviews and the biggest market gap.

## Decision

| Plan | Price | Limit |
|------|-------|-------|
| Free | €0 | Up to 3 employees, basic features |
| Team | €39/month | Unlimited employees, all features |
| Pro | €79/month | + DATEV export, API, multi-location |

## Rationale

1. **Competitive moat** — nobody else does flat-rate in this market
2. **Predictable costs** — SMBs love knowing exactly what they'll pay
3. **Growth incentive** — as companies hire more, Quoska becomes more valuable (but doesn't cost more)
4. **Conversion funnel** — free tier for ≤3 employees gets startups using it from day one
5. **Upsell path** — Team → Pro as companies grow or need integrations

## Consequences

**Positive:**
- Clear differentiator in marketing
- Simpler billing logic (no seat counting)
- Customers love it (strong retention signal)

**Negative:**
- Heavy users (100+ employees) cost more in compute/storage
- Need to monitor unit economics as we scale
- Free tier could be abused (multiple free accounts)

**Mitigation for scale:**
- Monitor per-tenant cost and introduce a reasonable cap (e.g., 500 employees) later
- Enterprise plan if needed

## Alternatives Considered

1. **Per-employee pricing** — rejected: that's what everyone else does, no differentiation
2. **Freemium with feature gates** — rejected: time tracking features are legally required, can't gate them
3. **Usage-based** — rejected: unpredictable for SMBs, against market expectations
