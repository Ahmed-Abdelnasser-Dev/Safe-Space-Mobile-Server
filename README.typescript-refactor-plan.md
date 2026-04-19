# TypeScript Refactor Plan

## Refactor Plan: Incremental JavaScript to TypeScript Migration (Zero Regression)

### Current State
- Runtime: Node.js ESM (type: module), Express 5, Prisma, Zod, JWT, multer, firebase-admin.
- Layered modular-monolith architecture is already in place and must be preserved.
- Entry flow: src/server.js -> src/app.js -> src/routes.js.
- Tests exist and are passing (baseline: 87 passed, 0 failed).
- No TypeScript project setup exists yet (no tsconfig, no declaration files, no ESLint TS config).
- Critical dynamic patterns currently used:
  - Request extensions: req.userId, req.userRole, req.requestId, req.file, req.files.
  - Runtime error enrichment: err.statusCode, err.code, err.expose, err.details.
  - Multipart parsers that parse JSON string fields in form-data.

### Target State
- Entire backend source code in TypeScript with strict mode enabled.
- Existing architecture, folder structure, routes, behavior, and business rules remain unchanged.
- Strong, reusable shared types for:
  - domain DTOs,
  - service/repository contracts,
  - Express request augmentation,
  - custom AppError shape.
- Build output emitted to dist with ESM-compatible TypeScript configuration.
- All tests continue to pass with no regressions.

### Affected Files
| File | Change Type | Dependencies |
|------|-------------|--------------|
| package.json | modify | blocks TS scripts/tooling |
| jest.config.js | modify | blocked by Jest + TS strategy |
| tsconfig.json (new) | create | blocks typecheck/build |
| src/types/express.d.ts (new) | create | blocks middleware/controllers typing |
| src/types/errors.ts (new) | create | blocks error middleware/shared error typing |
| src/types/index.ts (new) | create | blocks shared domain types |
| src/config/env.js, src/config/constants.js | modify/rename to .ts | blocks many modules |
| src/db/prisma.js | modify/rename to .ts | blocks repos/services |
| src/utils/*.js, src/shared/**/*.js | modify/rename to .ts | low-risk foundational layer |
| src/middleware/*.js | modify/rename to .ts | blocked by request augmentation + error types |
| src/modules/auth/** | modify/rename to .ts | blocked by middleware/shared types |
| src/modules/profile/** | modify/rename to .ts | blocked by auth/request typing |
| src/modules/notifications/** | modify/rename to .ts | blocked by prisma/provider typings |
| src/modules/accidents/** | modify/rename to .ts | blocked by notifications/central unit contracts |
| src/modules/centralUnit/** | modify/rename to .ts | blocked by auth/socket/request typing |
| src/modules/emergency/** | modify/rename to .ts | blocked by auth + parser + service contracts |
| src/routes.js | modify/rename to .ts | blocked by module conversion completion |
| src/app.js | modify/rename to .ts | blocked by middleware/routes conversion |
| src/server.js | modify/rename to .ts | blocked by app/env conversion |
| tests/unit/*.test.cjs, tests/integration/*.test.cjs | optional incremental conversion to .ts | blocked by stable Jest TS support |

### Execution Plan

#### Phase 1: Types and Interfaces
- [x] Step 1.1: Install TypeScript tooling and type packages (typescript, tsx, @types/node, @types/express, @types/jest, @types/jsonwebtoken, @types/multer).
- [x] Step 1.2: Create tsconfig.json with strict mode and ESM-compatible settings (module/moduleResolution: NodeNext, rootDir: src, outDir: dist, esModuleInterop: true).
- [x] Step 1.3: Use temporary mixed mode during migration (allowJs: true), then disable it at the end.
- [x] Step 1.4: Add typecheck/build/dev scripts while keeping existing JS scripts working.
- [x] Step 1.5: Add Express request augmentation declaration file.
- [x] Step 1.6: Add custom AppError type and type guard for normalized error handling.
- [x] Step 1.7: Add shared DTO/domain type modules used by auth, emergency, notifications, accidents, profile.
- [x] Verify: Run typecheck, run full tests, then smoke-check /health.

#### Phase 2: Implementation
- [x] Step 2.1: Convert config and shared low-risk files first.
- [x] Verify: typecheck + focused unit tests.
- [x] Step 2.2: Convert middleware layer (requestId, logger, error, rate-limit, upload, auth).
- [x] Verify: middleware unit/integration tests and route smoke checks.
- [x] Step 2.3: Convert modules in dependency-safe order:
- [x] Step 2.3.a: auth
- [x] Step 2.3.b: profile
- [x] Step 2.3.c: notifications
- [x] Step 2.3.d: accidents
- [x] Step 2.3.e: centralUnit
- [x] Step 2.3.f: emergency
- [x] Verify: run targeted module tests after each module batch.
- [x] Step 2.4: Convert root composition files (src/routes, then src/app, then src/server).
- [x] Verify: full test suite + startup smoke on built output.

#### Phase 3: Tests
- [x] Step 3.1: Keep .test.cjs tests running through migration; convert to .test.ts only after stable TS setup.
- [x] Step 3.2: Add/strengthen regression tests for:
- [x] Step 3.2.a: request augmentation (userId/userRole/requestId),
- [x] Step 3.2.b: custom AppError mapping,
- [x] Step 3.2.c: multipart JSON parser fallback,
- [x] Step 3.2.d: central unit inbound auth branches (proxy/mtls/off).
- [x] Step 3.3: Ensure all critical endpoint flows remain covered.
- [x] Verify: run full suite and compare with baseline (must stay green).

#### Phase 4: Cleanup
- [x] Step 4.1: Remove remaining JavaScript files in src.
- [x] Step 4.2: Switch to final strict TS-only mode (allowJs: false).
- [x] Step 4.3: Remove migration-only compatibility settings and redundant type aliases.
- [x] Step 4.4: Ensure no unnecessary any usage remains.
- [x] Step 4.5: Update README and operational docs for TypeScript build/run commands.
- [x] Verify: clean typecheck, clean build, all tests passing.

### Rollback Plan
If something fails:
1. Revert only the last migration batch commit (module-sized rollback, not whole-branch rollback).
2. If tooling fails early, revert tsconfig/jest/package script changes first.
3. If a specific module regresses, revert that module conversion only and keep earlier stable conversions.
4. If Jest TS interop becomes unstable, keep tests in .cjs temporarily and restore previous Jest config while continuing source migration in smaller batches.

### Risks
- ESM + Jest + TypeScript interoperability can break module resolution.
- Prisma return types can drift if repository contracts are not explicit.
- Express request augmentation may be missed if declaration files are not included correctly.
- Dynamic error metadata can be dropped under strict typing without centralized AppError patterns.
- Firebase Admin typing/interops can introduce edge-case runtime issues.
- Multipart parser behavior can change if refactor alters JSON fallback semantics.
- mTLS branch typing on request socket/client can be tricky in strict mode.

### Risk Mitigation
- Convert in small, reversible batches.
- Require typecheck + tests after each batch.
- Keep business logic unchanged unless typing safety requires a minimal adjustment.
- Preserve endpoint contracts and response shapes exactly.

### Completion Criteria
- Project compiles with zero TypeScript errors.
- Existing functionality behaves exactly as before.
- All tests pass.
- Architecture remains consistent with current modular layering.
