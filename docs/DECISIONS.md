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
