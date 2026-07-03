export PATH := /Users/miniadmin/.bun/bin:$(PATH)

SILENT := 1

help:
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@echo '  verify          All checks + tests'

backend-build:
	cd backend && bun run build

backend-test:
	cd backend && bun run test

frontend-check:
	cd frontend && bun x tsc --noEmit

frontend-build:
	cd frontend && bun x vite build

e2e:
	@bash scripts/test-runner.sh

ci-e2e:
	@bash scripts/test-runner.sh --ci

verify: backend-build backend-test frontend-check frontend-build
	@echo 'All checks passed'
