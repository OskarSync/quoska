# ADR-003: Tech Stack — Next.js + Supabase + PostgreSQL

**Date:** 2026-05-12  
**Status:** Accepted  
**Decision:** Quoska is built with Next.js 15 (App Router) on the frontend and backend, Supabase for auth + database (PostgreSQL), hosted on Vercel or Hetzner.

## Context

Need a stack that: (1) AI coding agents know well, (2) is fast to build, (3) supports DSGVO compliance, (4) keeps infrastructure costs near zero at launch, (5) supports real-time features for live dashboard.

## Decision

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui | Most AI-agent-friendly stack. Huge ecosystem. SSR for SEO. |
| Backend | Next.js Route Handlers (API routes) | Monorepo, no separate backend. Simpler agent navigation. |
| Database | PostgreSQL via Supabase (Frankfurt region) | EU-hosted, built-in RLS, auth, realtime subscriptions. |
| Auth | Supabase Auth | Handles email/password, magic links, sessions, JWT. |
| Payments | Stripe Billing + Checkout | Flat-rate subscriptions, webhooks, EU tax handling. |
| PDF | Puppeteer (server-side) | Generate §14 UStG-compliant PDFs. |
| Email | Resend | Transactional emails, DSGVO-friendly. |
| Hosting | Vercel (or Hetzner for DSGVO bonus) | Zero-config deploys from Git. |
| Linting | ESLint + custom rules | Legal compliance enforcement. |
| Testing | Vitest + Playwright | Fast unit tests + E2E for critical flows. |

## Consequences

**Positive:**
- Single codebase = easier for agents to navigate
- Supabase free tier covers initial users
- PostgreSQL row-level security for tenant isolation
- All well-documented — agents produce better code
- Total infra cost at launch: ~$0-20/month

**Negative:**
- Vendor lock-in to Supabase for auth + realtime (mitigated: core data is standard Postgres)
- Vercel is US company (use Hetzner alternative if clients demand pure EU hosting)
- Next.js API routes have cold starts on serverless (mitigated: low latency requirement)

## Alternatives Considered

1. **Separate Express backend** — rejected: more complexity, two codebases to maintain
2. **Firebase** — rejected: NoSQL harder for audit queries, Google is US company
3. **Railway / Render** — rejected: less AI-agent documentation than Vercel
4. **Self-hosted everything on Hetzner** — considered for later, too much ops overhead at launch
