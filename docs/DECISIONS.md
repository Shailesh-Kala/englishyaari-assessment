# Decisions Log

Format: **What** · **Alternatives** · **Why** · **Trade-off**

---

## D-001 — Adapt generic working rules to the booking domain

- **What:** Several rules in the kick-off prompt reference features this assignment does not have. CLAUDE.md records the domain-equivalent instead:
  - "Rate limiting on login" → no login/auth in scope; apply a general rate limit instead.
  - "Optimistic locking on salary edits" → no salary; the real race is two users booking the same session, so state transitions use atomic conditional updates (`findOneAndUpdate({ _id, status: 'AVAILABLE' }, …)`).
  - "Pagination, never send all rows" → the PDF says APIs 3 and 6 return *all* matching sessions; results are bounded by a single date / single user. Pagination decision deferred to Phase 1 open questions.
  - "DB migrations" → MongoDB is schemaless; Mongoose schemas + index sync replace migrations. Revisit in Phase 2.
- **Alternatives:** Keep the rules verbatim and ignore the irrelevant ones; or implement them anyway (auth, pagination).
- **Why:** The prompt also says "stick to the scope in the requirement doc". Implementing unrelated features adds complexity the reviewer didn't ask for.
- **Trade-off:** Diverges from the literal prompt wording.
- **Status:** Approved by owner at the Phase 0 checkpoint.

## D-002 — Seed teachers instead of a teacher endpoint

- **What:** Teachers are created by a seed script (`npm run seed`), not an API.
- **Alternatives:** Add `POST /teachers`; or insert teachers manually via the Mongo shell.
- **Why:** The PDF defines no teacher endpoint, but API 2 must validate a teacher exists. A seed script keeps the API surface exactly as specified and gives reviewers ready-made teacher IDs.
- **Trade-off:** Adding teachers needs a script run rather than an HTTP call.
- **Status:** Approved by owner.

## D-003 — Local run only, no deployment

- **What:** No hosting, no live URL. The README covers local setup only.
- **Alternatives:** Free tier hosting (Render + MongoDB Atlas).
- **Why:** Owner confirmed the assessment is evaluated by running it locally.
- **Trade-off:** Reviewer must have Node and MongoDB (or Docker) available locally.
- **Status:** Approved by owner.

## D-004 — IST day boundaries, millisecond timestamps

- **What:** `dateTimestamp` is epoch ms; "the supplied date" is the `Asia/Kolkata` calendar day containing it. Dates are stored in UTC.
- **Alternatives:** UTC days; client-supplied timezone parameter; epoch seconds.
- **Why:** Owner's choice — the product's users are in India. ms matches `Date.now()` in JS clients.
- **Trade-off:** Users outside IST see days cut at IST midnight. IST has no DST, so the offset is a fixed +05:30.
- **Status:** Approved by owner.

## D-005 — "Upcoming" = booked and not yet started *(superseded by D-009)*

- **What:** F6 `upcoming` lists sessions with `status = BOOKED` and `startTime > now`.
- **Alternatives:** All `BOOKED` sessions regardless of time.
- **Why:** Owner's choice — "upcoming" should mean in the future.
- **Trade-off:** A booked session that has started but isn't marked complete appears in neither list until completed. Owner accepted this; no `IN_PROGRESS` status or third list, since the PDF defines only `AVAILABLE` / `BOOKED` / `COMPLETED`. `now` is injected for deterministic tests.
- **Status:** Approved by owner.

## D-006 — Reject overlapping sessions for the same teacher

- **What:** `POST /sessions` returns `409` if the new slot overlaps any existing session of that teacher (any status). Back-to-back slots are allowed.
- **Alternatives:** No overlap check (PDF is silent); check only `AVAILABLE`/`BOOKED`.
- **Why:** Owner's choice — a teacher can't be in two places at once. Completed sessions count too, since they also occupied the teacher's time.
- **Trade-off:** Check-then-insert alone has a race (two concurrent overlapping creates). Owner requires overlap to be impossible, so the check + insert run in a transaction (D-008).
- **Status:** Approved by owner.

## D-007 — `404` for missing referenced records

- **What:** Unknown `teacherId` (F2) or `userId` (F4) returns `404`, same as unknown path ids.
- **Alternatives:** `422 Unprocessable Entity` for references inside the body.
- **Why:** Owner's choice; one consistent "not found" status across the API.
- **Trade-off:** Less precise than `422` for body references; the error `code` (`TEACHER_NOT_FOUND`, `USER_NOT_FOUND`) disambiguates.
- **Status:** Approved by owner.

## D-008 — Transaction + teacher-doc write to make overlap impossible

- **What:** `POST /sessions` runs "find overlapping session → insert" inside a MongoDB transaction that also writes to the teacher document. Two concurrent creates for the same teacher then conflict on that document; MongoDB aborts one, and the retry sees the overlap and returns `409`.
- **Alternatives:** Accept the race and document it; a unique index (can't express time-range overlap); an app-level mutex (breaks with more than one process).
- **Why:** Owner requires overlap to never happen. A plain transaction isn't enough: two inserts of different documents don't conflict, so a shared write is needed to serialise them.
- **Trade-off:** Transactions require MongoDB in replica-set mode, even locally. Mitigated with a `docker-compose.yml` that starts a single-node replica set, and an in-memory replica set for tests. Creates for the same teacher are serialised, which is fine at this scale.
- **Status:** Approved by owner.

## D-009 — "Upcoming" = every booked session *(supersedes D-005)*

- **What:** F6 `upcoming` lists all `BOOKED` sessions, whether or not `startTime` has passed, sorted by `startTime` asc.
- **Alternatives:** Only `BOOKED` with `startTime > now` (D-005); a third `inProgress` list; grouping by status (`booked` / `completed`).
- **Why:** Owner's choice — a booked session must never vanish from the user's view before it's completed. Keeps the PDF's two lists and three statuses.
- **Trade-off:** `upcoming` can contain sessions whose start time has passed; the client can tell from `startTime`.
- **Status:** Approved by owner.

## D-010 — Started `AVAILABLE` sessions are hidden and unbookable

- **What:** F3 only returns `AVAILABLE` sessions with `startTime > now`. F4 rejects booking a session with `startTime <= now` with `409`. The check sits in the same atomic update as the status check: `{ _id, status: 'AVAILABLE', startTime: { $gt: now } }`.
- **Alternatives:** Show all sessions for the date (PDF literal); hide from the list but still allow booking.
- **Why:** Owner's choice — nobody can join a session that has already started, and hiding without blocking would be inconsistent.
- **Trade-off:** Results depend on "now", so the clock is injected into services for deterministic tests.
- **Status:** Approved by owner.

## D-011 — Express 5

- **What:** Use Express 5 rather than 4.
- **Alternatives:** Express 4 + an `asyncHandler` wrapper or `express-async-errors`.
- **Why:** Express 5 forwards rejected promises from async handlers to the error middleware natively — async/await everywhere with no wrapper.
- **Trade-off:** Slightly newer; some older middleware examples assume v4 (none we use are affected).

## D-012 — zod for validation (requests and env)

- **What:** zod schemas for every body/params/query and for environment config.
- **Alternatives:** Joi, express-validator, class-validator.
- **Why:** TypeScript types are inferred from the schema (one source of truth); one library covers both requests and config.
- **Trade-off:** Error messages need mapping to our `details` shape (done once in the error handler).

## D-013 — pino + pino-http for logging

- **What:** JSON logs via pino; pino-http attaches the request ID to every line.
- **Alternatives:** winston + morgan; console.
- **Why:** Structured by default, low overhead, request-scoped child loggers out of the box.
- **Trade-off:** Raw JSON is hard to read; `pino-pretty` used only in `npm run dev`.

## D-014 — Tests run against an in-memory Mongo replica set

- **What:** Integration tests use `mongodb-memory-server` (`MongoMemoryReplSet`). Services are unit-tested with in-memory fakes.
- **Alternatives:** Mock Mongoose in all tests; require a running Docker Mongo for tests.
- **Why:** The two mandatory aggregation pipelines and the transaction can only be trusted when run against real MongoDB. Memory server needs no Docker, so `npm test` works anywhere, including CI.
- **Trade-off:** The mongod binary is downloaded once on first run (cached afterwards, also in CI). Tests themselves make no network calls — only localhost.

## D-015 — Routes and controllers in one file per module

- **What:** `user.routes.ts` / `session.routes.ts` define routes with thin inline handlers (parse → service → respond).
- **Alternatives:** Separate `*.controller.ts` files.
- **Why:** Handlers are 3–5 lines each; a separate file per layer would add indirection without separating any logic. The routes/controllers layer stays free of business rules and DB access.
- **Trade-off:** If handlers grow, split them out.

## D-016 — No success envelope

- **What:** Successful responses return the resource directly (`201 { ...user }`); errors always use `{ error: { code, message, details?, requestId } }`.
- **Alternatives:** `{ data: ... }` envelope on every success.
- **Why:** HTTP status already says success vs failure; the consistency requirement is on errors.
- **Trade-off:** Adding metadata (e.g. pagination) later would need a shape change.

## D-017 — Node's built-in `--env-file` instead of dotenv

- **What:** Scripts run with `node --env-file-if-exists=.env`.
- **Alternatives:** `dotenv` package.
- **Why:** Built into Node ≥ 22; one fewer dependency.
- **Trade-off:** Requires Node 22+ (declared in `engines`).

## D-018 — Book/complete use atomic conditional updates, not transactions

- **What:** F4/F5 validate in the service for precise errors, then write with one `findOneAndUpdate` whose filter repeats the rule (`status`, `startTime > now`). A `null` result → `409`.
- **Alternatives:** Wrap read + write in a transaction; optimistic locking on `__v`.
- **Why:** Only one document changes, and single-document updates are atomic in MongoDB. Users and sessions are never deleted, so the earlier existence checks can't go stale.
- **Trade-off:** The rule appears twice (service check for the error message, filter for correctness); both are covered by tests.

## D-019 — IST day range computed in the app

- **What:** A pure `istDayRange(ts)` returns `[start, end)` as UTC dates; the F3 pipeline matches `startTime` against that range.
- **Alternatives:** `$dateToString` / `$dateTrunc` with `timezone: 'Asia/Kolkata'` inside the pipeline.
- **Why:** A plain range on `startTime` uses the `{ status, startTime }` index; computing a date per document can't. IST has a fixed offset, so the function is trivial and fully unit-testable.
- **Trade-off:** Timezone logic sits in TypeScript rather than in the pipeline.

## D-020 — Native ES modules

- **What:** `"type": "module"`; TypeScript `module: NodeNext`, so relative imports carry `.js` extensions.
- **Alternatives:** CommonJS output (extensionless imports).
- **Why:** Vite/Vitest warn that ESM config inside a CommonJS package is going away; ESM is the current Node default and every dependency we use supports it.
- **Trade-off:** `.js` extensions in TypeScript imports look odd at first.

## D-021 — Docker Desktop for local MongoDB

- **What:** Local development runs MongoDB via `docker compose up -d` (Docker Desktop on macOS).
- **Alternatives:** Homebrew `mongodb-community` 8.x started manually as a replica set; the existing Homebrew 4.4 install.
- **Why:** Owner's choice. One command gives the replica set transactions need, and reviewers most likely have Docker. Homebrew 4.4 is end-of-life.
- **Trade-off:** Requires Docker Desktop installed and running. Tests don't need it (in-memory replica set).
- **Status:** Approved by owner.

## D-022 — No version key on users and sessions *(teacher part superseded by D-023)*

- **What:** `versionKey: false` on User and Session; Teacher keeps the default `__v`.
- **Alternatives:** Keep `__v` everywhere and strip it in `toJSON` and in every pipeline `$project`.
- **Why:** Nothing reads `__v` on users or sessions (concurrency there uses conditional updates, D-018), so dropping it removes a hide-it step from every response. Teacher's `__v` is the write target that serialises session creates (D-008).
- **Trade-off:** No Mongoose array-versioning on users/sessions — they have no arrays.

## D-023 — Explicit `sessionLockVersion` on Teacher instead of `__v` *(supersedes the teacher part of D-022)*

- **What:** Teacher gets `sessionLockVersion: Number` (default `0`) and `versionKey: false`, like the other models. The session-create transaction does `$inc: { sessionLockVersion: 1 }` on the teacher.
- **Alternatives:** Reuse Mongoose's `__v` (D-022); bump the teacher's `updatedAt`.
- **Why:** Owner's choice — a named field makes the overlap lock obvious to anyone reading the schema, instead of hiding it in Mongoose's internal version key. No model has `__v` now.
- **Trade-off:** One field that isn't in the PDF's Teacher schema; it's internal and never exposed by the API.
- **Status:** Approved by owner.

## D-024 — Create indexes at startup before listening

- **What:** `server.ts` awaits `createIndexes()` on User, Teacher and Session after connecting and before `listen()`.
- **Alternatives:** Rely on Mongoose `autoIndex` (builds in the background, so the first requests could arrive before the unique email index exists); `syncIndexes()` (also drops indexes not in the schema).
- **Why:** Owner's choice. Guarantees uniqueness from the very first request; `createIndexes` only adds, so it's safe on a shared database.
- **Trade-off:** Slightly slower startup on a large existing collection while indexes build.
- **Status:** Approved by owner.
