# Contributing to Quoska

Thanks for your interest in contributing! 🎉 Quoska is a legally-compliant time-tracking app for German SMEs, so contributions have a few extra considerations around **Arbeitszeitgesetz (ArbZG)** and **DSGVO**.

## Before you start

- Questions or ideas → open a [Discussion](https://github.com/<your-org>/quoska/discussions).
- Bugs → open an [Issue](https://github.com/<your-org>/quoska/issues) with steps to reproduce, expected vs. actual behaviour, and logs.
- Keep pull requests focused and scoped to a single change.

## Legal-compliance guardrails (read this)

Any change that touches **time tracking, breaks, timestamps, or audit logic** must preserve legal compliance. The rules are documented in [`docs/legal.md`](docs/legal.md) and enforced partly by:

- **ESLint rules** in [`tools/eslint-rules/`](tools/eslint-rules) (no client timestamps, no hard deletes, required audit fields, …)
- **Test suites** in [`tests/legal/`](tests/legal) (ArbZG, Revisionssicherheit, DSGVO)

If your change affects these areas, add or update tests there.

## Development setup

```bash
make setup    # install deps, create .env from .env.example, seed local DB
make dev      # start dev server
make test     # unit + legal-compliance tests
make lint     # ESLint incl. custom legal-compliance rules
```

End-to-end tests boot their own isolated app instance:

```bash
npx playwright test
```

## Pull request checklist

- [ ] `make lint` passes (0 errors)
- [ ] `make test` passes
- [ ] No client-side timestamp creation on time data (ArbZG §16) — use server-side timestamps
- [ ] No hard deletes on time entries (Revisionssicherheit) — soft-delete with a reason
- [ ] Every DB mutation on time entries includes audit fields
- [ ] German UI text stays German (de-DE); code/comments stay English
- [ ] Files stay under 300 lines (split if larger)
- [ ] No secrets, no real personal data, no `.env` committed

## Coding standards

TypeScript strict mode, no `any`, input validation (zod) on every API route, soft-deletes only, server-generated timestamps. See [`docs/coding-standards.md`](docs/coding-standards.md).

## Licensing

By contributing you agree that your contributions are licensed under [AGPL-3.0](LICENSE).
