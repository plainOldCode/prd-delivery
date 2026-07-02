.SILENT:

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  backend-build   Backend build (bun build)"
	@echo "  backend-test    Backend test (vitest run)"
	@echo "  frontend-check  Frontend type check (tsc --noEmit)"
	@echo "  frontend-build  Frontend production build (vite build)"
	@echo "  verify          All checks + tests"

backend-build:
	cd backend && bun run build

backend-test:
	cd backend && bun run test

frontend-check:
	cd frontend && tsc --noEmit

frontend-build:
	cd frontend && vite build

verify: backend-build backend-test frontend-check frontend-build
	@echo "All checks passed ✅"
