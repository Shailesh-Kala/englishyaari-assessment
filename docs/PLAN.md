# Implementation Plan

Each task is 1–3 commits: `test:` (failing) → `feat:` (pass) → `refactor:` (optional). Setup tasks with no behaviour to test use `chore:` / `ci:`. The full suite runs before every commit; push after every task.

**Test layers:** *unit* = services/pure functions with fakes and a fixed clock (no DB, no HTTP). *int* = Supertest against `createApp` on an in-memory Mongo replica set.

## Foundation

- [x] **1. Tooling scaffold** — `package.json`, TypeScript (strict), ESLint + Prettier, Vitest config, npm scripts (`lint`, `format`, `format:check`, `typecheck`, `test`; `dev`, `build`, `start`, `seed` are added with the files they run). Native ESM (D-020).
  Commits: `chore: scaffold TypeScript project with lint, format and test tooling`

- [x] **2. CI** — GitHub Actions on every push: `npm ci` → lint → format check → typecheck → test on Ubuntu 24.04. mongod binary cache is added in Task 3 with the memory server.
  Commits: `ci: run lint, typecheck and tests on push`

- [x] **3. Config, logger, DB and health check** — zod-validated env (`config.ts`), `.env.example`, pino logger + Mongoose connect and graceful shutdown in `server.ts`, `docker-compose.yml` (single-node replica set), test harness (in-memory replica set), `GET /health`, mongod binary cache in CI.
  - int: `GET /health` → `200 { status: "ok", db: "up" }`
  - int: DB disconnected → `503 { status: "error", db: "down" }`
  - unit: invalid env (missing `MONGODB_URI`) throws at startup

- [x] **4. Request ID + central error handling** — request-id middleware, `pino-http`, `AppError`, error handler, 404 route handler.
  - int: response carries `x-request-id` (generated, or echoed from the request; unsafe values replaced)
  - int: unknown route → `404 ROUTE_NOT_FOUND` in the standard error shape with `requestId`
  - int: malformed JSON → `400 INVALID_JSON`
  - int: `AppError` → its status/code; `ZodError` → `400 VALIDATION_ERROR` with `details`
  - int: thrown unknown error → `500 INTERNAL_ERROR`, no stack in body

- [x] **5. Security middleware** — helmet, CORS allowlist, rate limit, 10 kb body limit.
  - int: security headers present, `x-powered-by` absent
  - int: allowed origin gets `Access-Control-Allow-Origin`; other origin doesn't
  - int: exceeding the limit → `429 RATE_LIMITED`
  - int: body > 10 kb → `413 PAYLOAD_TOO_LARGE`
  - unit: `CORS_ORIGINS` parsed from a comma-separated list; defaults for rate limit

## Data

- [x] **6. Models, indexes and teacher seed** — User, Teacher, Session schemas with indexes; `npm run seed` upserts teachers by email and prints their ids.
  - int: duplicate user email rejected by the unique index (case-insensitive)
  - int: session indexes exist (`status+startTime`, `teacherId+startTime`, `userId+status`)
  - int: seed is idempotent (run twice → same teacher count)

## Features

- [x] **7. F1 — Create user** `POST /users`
  - unit (in-memory fake repo): existing email → `409 EMAIL_ALREADY_EXISTS` without inserting; check-then-insert race → `409`
  - int: valid body → `201`, email lowercased, no `__v`; client-sent `_id`/`createdAt` ignored
  - int: missing/invalid fields → `400 VALIDATION_ERROR` with `details`
  - int: duplicate email (different case) → `409`
  - int: Indian mobile accepted in common formats and stored as `+91XXXXXXXXXX`; non-Indian/short/long/5-prefixed → `400`

- [x] **8. IST day range** — pure `istDayRange(timestamp)` → `{ start, end }`.
  - unit: mid-day, just after IST midnight, just before IST midnight, UTC-date ≠ IST-date edge (e.g. `2026-10-20T20:00Z` → IST 21 Oct)
  - unit: end is exclusive — next IST midnight belongs to the next day

- [x] **9. F2 — Create session (basic)** `POST /sessions`
  - unit (in-memory fakes): teacher missing → `404 TEACHER_NOT_FOUND`, nothing stored; teacher exists → `AVAILABLE` session
  - int: valid → `201`, `status AVAILABLE`, `userId null`, `completedAt null`; epoch-ms times accepted
  - int: `endTime <= startTime` → `400`; invalid `teacherId` / unparseable or null times → `400`; client-sent `status`/`userId`/`completedAt` ignored
  - int: unknown teacher → `404`

- [x] **10. F2 — No overlapping sessions (transactional)**
  - unit: service maps `overlap` → `409 SESSION_OVERLAP`
  - int: overlapping slot vs `AVAILABLE`/`BOOKED`/`COMPLETED` → `409`; starts-inside / ends-inside / contains / contained → `409`; back-to-back before/after → `201`; other teacher same time → `201`
  - int: **concurrency** — five identical creates via `Promise.all` → exactly one `201`, four `409`, one row (mutation-checked: fails without the teacher lock)

- [x] **11. F3 — Available sessions** `GET /sessions/available` (aggregation)
  - int: returns only `AVAILABLE` on that IST day, sorted by `startTime`, with `teacher`
  - int: excludes booked/completed, other days, and already-started sessions incl. one starting exactly now (fixed clock)
  - int: IST boundary — session at `00:15 IST` belongs to that IST day, not the previous UTC day
  - int: missing/empty/non-numeric/negative/fractional `dateTimestamp` → `400`; empty day → `200 []`
  - verified with `explain`: `IXSCAN` on `status_1_startTime_1`, no in-memory sort

- [x] **12. F4 — Book session** `POST /sessions/:id/book`
  - unit: rule order — user missing `404` (checked first), session missing `404`, `BOOKED`/`COMPLETED` `409 SESSION_NOT_AVAILABLE`, started or starting now `409 SESSION_ALREADY_STARTED`, lost race `409`
  - int: happy path → `200`, `status BOOKED`, `userId` set
  - int: booking again / completed → `409 SESSION_NOT_AVAILABLE`; started → `409 SESSION_ALREADY_STARTED`; unknown user/session → `404`; malformed ids / missing userId → `400`
  - int: **concurrency** — five users book one session via `Promise.all` → exactly one `200`, stored `userId` = winner (mutation-checked: fails without the conditional filter)

- [ ] **13. F5 — Complete session** `PATCH /sessions/:id/complete`
  - unit: missing `404`; `AVAILABLE` or `COMPLETED` → `409 SESSION_NOT_BOOKED`
  - int: booked → `200`, `status COMPLETED`, `completedAt` = fixed clock time
  - int: invalid id → `400`

- [ ] **14. F6 — User sessions** `GET /users/:id/sessions` (aggregation)
  - int: `{ upcoming, completed }`; upcoming = all `BOOKED` (incl. started) sorted by `startTime` asc; completed sorted by `completedAt` desc; both with `teacher`
  - int: other users' sessions and `AVAILABLE` sessions excluded
  - int: unknown user → `404`; invalid id → `400`; user with no sessions → empty lists

## Delivery

- [ ] **15. Postman collection** — every endpoint plus key error cases; collection variables (`baseUrl`, `teacherId`, `userId`, `sessionId`) set by test scripts so it runs top-to-bottom.
  Commits: `docs: add Postman collection`

- [ ] **16. README** — prerequisites, setup, run, seed, test, Postman usage, error codes, links to docs.
  Commits: `docs: complete README`
