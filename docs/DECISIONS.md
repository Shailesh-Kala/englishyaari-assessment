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
