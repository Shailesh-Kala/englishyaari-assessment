# Requirements

Source: *Backend Developer Assignment* PDF. Anything not stated there is listed under **Assumptions** or **Open questions** — nothing is silently invented.

## Goal

A REST API where teachers publish time-slot sessions, users book them, and completed sessions appear in the user's history. Built with Node.js, TypeScript, Express, MongoDB and Mongoose, runnable locally, testable via Postman and an automated test suite.

## Personas

| Persona | Need |
|---|---|
| **Learner (User)** | Sign up, see which sessions are open on a given day, book one, see upcoming and completed sessions. |
| **Teacher** | Publish available sessions; mark a session complete once it has been delivered. |
| **Assessment reviewer** | Clone, run locally in minutes, exercise every API from Postman, read clean layered code with tests. |

There is no authentication, so "persona" here means *who calls the endpoint*, not an enforced role.

## Data (from the PDF)

| Entity | Fields |
|---|---|
| **User** | `fullName`, `email` (unique), `phone`, timestamps |
| **Teacher** | `fullName`, `email`, `specialization`, `experience`, timestamps |
| **Session** | `teacherId` (ObjectId), `userId` (ObjectId \| null), `startTime`, `endTime`, `status` (`AVAILABLE` / `BOOKED` / `COMPLETED`), `completedAt`, timestamps |

Lifecycle: `AVAILABLE → BOOKED → COMPLETED`. No other transitions.

## In scope

### F1 — Create user · `POST /users`
- Body: `fullName`, `email`, `phone` — all required.
- Email is unique (case-insensitive; stored lowercased).
- ✅ `201` with the created user · ❌ `400` invalid body · ❌ `409` email already exists.

### F2 — Create session · `POST /sessions`
- Body: `teacherId`, `startTime`, `endTime`.
- Teacher must exist; `endTime` must be after `startTime`.
- **No overlap:** the new session must not overlap any existing session of the same teacher (any status). Overlap = `existing.startTime < new.endTime AND existing.endTime > new.startTime`. Back-to-back sessions (one ends exactly when the next starts) are allowed.
- Created with `status = AVAILABLE`, `userId = null`, `completedAt = null`.
- ✅ `201` · ❌ `400` invalid body / `endTime <= startTime` · ❌ `404` teacher not found · ❌ `409` overlaps an existing session.

### F3 — Available sessions for a date · `GET /sessions/available?dateTimestamp={ts}`
- Returns every `AVAILABLE` session whose `startTime` falls on the **IST** calendar day containing `ts`.
- **Must use a MongoDB aggregation pipeline.**
- Each item includes basic teacher info (name, specialization) so a client can render a booking list without a second call. Sorted by `startTime` ascending.
- ✅ `200` with an array (possibly empty) · ❌ `400` missing/invalid `dateTimestamp`.

### F4 — Book session · `POST /sessions/:id/book`
- Body: `userId`.
- User must exist; session must exist; only `AVAILABLE` sessions can be booked; a booked session cannot be booked again.
- Sets `status = BOOKED` and `userId`.
- Booking is atomic: if two requests race for the same session, exactly one succeeds.
- ✅ `200` with the updated session · ❌ `400` invalid ids · ❌ `404` user or session not found · ❌ `409` session not `AVAILABLE`.

### F5 — Mark session complete · `PATCH /sessions/:id/complete`
- Session must exist; only `BOOKED` sessions can be completed.
- Sets `status = COMPLETED` and `completedAt = now`.
- ✅ `200` with the updated session · ❌ `400` invalid id · ❌ `404` session not found · ❌ `409` session not `BOOKED`.

### F6 — User's sessions · `GET /users/:id/sessions`
- Returns the user's sessions split into `upcoming` and `completed`.
- **Must use a MongoDB aggregation pipeline.**
- `upcoming` = `BOOKED` **and `startTime` is after now** (not started yet), sorted by `startTime` asc. `completed` = `COMPLETED`, sorted by `completedAt` desc. Each item includes basic teacher info.
- ✅ `200` `{ upcoming: [...], completed: [...] }` · ❌ `400` invalid id · ❌ `404` user not found.

### Cross-cutting (from the PDF's General Requirements + approved working rules)
- Proper HTTP status codes (as listed per feature).
- Centralised error handling with one error response shape.
- async/await only.
- Configuration via environment variables; `.env.example` committed.
- Server-side input validation with a schema library; malformed ObjectIds rejected with `400`.
- Security headers, restricted CORS, general rate limit.
- `GET /health` reporting app and DB status.
- Structured JSON logging with a request ID on every log line and error response.
- Teacher **seed script** (no teacher endpoint exists in the PDF, but F2 needs teachers).
- Postman collection covering every endpoint, including error cases.
- README with setup, run, seed and test instructions.
- Automated tests (Vitest + Supertest) and GitHub Actions CI running lint + tests.

## Out of scope (with reasoning)

| Item | Why it's out |
|---|---|
| Authentication / authorization | Not in the PDF. `userId` is passed in the request body. Adding auth would double the surface area for no assessed value. |
| Teacher CRUD endpoints | Not in the PDF. Teachers are seeded (D-002). |
| Update / delete for users or sessions, cancel or reschedule a booking | Not in the PDF; each adds new state transitions and edge cases. |
| Overlap check on the **user** side (a user booking two overlapping sessions) | Not required by the PDF; only teacher-side overlap is in scope (D-006). |
| Pagination | PDF says return *all* sessions; results are bounded to one day / one user (D-001). |
| Auto-completing sessions when `endTime` passes (cron/job) | PDF defines completion as an explicit API call. |
| Per-user timezones | Single reference timezone keeps date filtering deterministic (see Assumptions). |
| DB migrations | MongoDB is schemaless; schemas + index sync suffice (D-001). |
| Deployment / hosting | Assessment is run locally only (D-003). |
| Payments, notifications, frontend | Not in the PDF. |

## Assumptions

1. **`dateTimestamp` is Unix epoch milliseconds** (what `Date.now()` returns). Any instant within the day works; the API resolves it to that day. *(Confirmed — D-004.)*
2. **Day boundaries are IST** (`Asia/Kolkata`, UTC+05:30, no DST): `00:00:00.000 IST` → `23:59:59.999 IST`. A session belongs to the day its `startTime` falls on. *(Confirmed — D-004.)*
3. **`startTime` / `endTime` are accepted as ISO-8601 strings or epoch ms** and stored as `Date` (UTC in MongoDB).
4. **"Upcoming" means `BOOKED` with `startTime > now`.** *(Confirmed — D-005.)* Consequence: a `BOOKED` session that has started but not yet been marked complete appears in **neither** list until it is completed. "Now" comes from an injected clock so tests are deterministic.
5. **F3 returns all `AVAILABLE` sessions for the date**, including ones whose start time has already passed today — the PDF says "all … for the supplied date".
6. **Sessions may be created in the past**; the PDF only requires `endTime > startTime`.
7. **Completion does not require `endTime` to have passed**; the PDF only requires status `BOOKED`.
8. **Phone** is a required string, loosely validated (optional leading `+`, 7–15 digits). No country-specific rules.
9. **Teacher email is not unique-enforced** (PDF marks only User email as unique). Teachers are seeded, so this never surfaces via the API.
10. **Teacher `experience`** is a non-negative integer number of years.
11. Missing referenced records (teacher on create, user on book) return **`404`** — consistent across endpoints. *(Confirmed — D-007.)*
12. **Overlap check counts sessions of every status** — a teacher can't be in two places, whether the existing slot is available, booked or completed. *(D-006.)*

## Open questions

All Phase 1 questions resolved by the owner:

| # | Question | Answer | Decision |
|---|---|---|---|
| 1 | Timezone for "the supplied date" | IST (`Asia/Kolkata`) | D-004 |
| 2 | `dateTimestamp` unit | Milliseconds | D-004 |
| 3 | "Upcoming" definition | `BOOKED` and not started yet | D-005 |
| 4 | Teacher overlapping sessions | Reject with `409` | D-006 |
| 5 | Teacher not found on `POST /sessions` | `404` | D-007 |
