# Quoska — Makefile

.PHONY: setup test lint dev build test-rules test-all check-e2e-coverage

setup: ## Install dependencies and prepare dev environment
	npm install
	@if [ ! -f .env ]; then cp .env.example .env; echo "✅ Created .env from .env.example"; fi
	@echo "✅ Setup complete. Run 'make dev' to start developing."

test: ## Run all tests
	npm test

test-legal: ## Run legal compliance ESLint rule tests
	@node tools/eslint-rules/run-tests.mjs

check-e2e-coverage: ## Verify every implemented feature story has e2e tests
	npx tsx scripts/check-e2e-coverage.ts

test-all: test test-legal check-e2e-coverage ## Run everything

lint: ## Run linter including custom legal-compliance rules
	npm run lint

lint-fix: ## Run linter and auto-fix
	npm run lint:fix

dev: ## Start local dev server
	npm run dev

build: ## Production build
	npm run build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
