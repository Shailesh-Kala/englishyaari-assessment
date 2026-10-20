# EnglishYaari Assessment — Session Booking API

REST API where teachers publish sessions, users book them, and completed sessions show up in the user's history.

**Stack:** Node.js · TypeScript · Express 5 · MongoDB 8 · Mongoose 9 · zod · pino · Vitest · Supertest

[![CI](https://github.com/Shailesh-Kala/englishyaari-assessment/actions/workflows/ci.yml/badge.svg)](https://github.com/Shailesh-Kala/englishyaari-assessment/actions/workflows/ci.yml)

## Links

- Demo video: _to be added_
- Postman collection: [`postman/englishyaari.postman_collection.json`](postman/englishyaari.postman_collection.json)

## Docs

| Doc | What's in it |
|---|---|
| [Requirements](docs/REQUIREMENTS.md) | Scope, personas, per-endpoint rules, out-of-scope with reasons, assumptions |
| [Architecture](docs/ARCHITECTURE.md) | Diagrams, data model + indexes, endpoints, pipelines, security / performance / reliability trade-offs |
| [Implementation plan](docs/PLAN.md) | The 16 TDD tasks and their test cases |
| [Decisions log](docs/DECISIONS.md) | Every meaningful decision: what, alternatives, why, trade-off |
| [Prompt log](docs/PROMPTS.md) | Every prompt given to the AI pair-programmer and what it did |
| [Working rules](CLAUDE.md) | Commit, code-quality, testing and security rules followed throughout |

## Prerequisites

- **Node.js 22+** (developed on Node 24)
- **Docker Desktop** — runs MongoDB as a single-node replica set (transactions need one)

Tests don't need Docker: they start their own in-memory replica set.

## Setup

```bash
git clone https://github.com/Shailesh-Kala/englishyaari-assessment.git
cd englishyaari-assessment
npm ci
cp .env.example .env
docker compose up -d --wait
```

`--wait` returns once MongoDB is healthy, which is also when the replica set has been initiated. The first run pulls the `mongo:8.2` image, so it takes a minute or two.

## Seed

There is no teacher endpoint in the brief, so teachers come from a seed script. It's idempotent — run it as often as you like.

```bash
npm run seed
```

It prints a table of teacher ids. Copy one; you need it to create sessions.

## Run

```bash
npm run dev
```

Development mode: reloads on change, pretty-printed logs. The API listens on `http://localhost:3000` (`PORT` in `.env`).

Production-style:

```bash
npm run build
npm start
```

Check it's up: `curl localhost:3000/health` → `{"status":"ok","db":"up"}`.

## Test

```bash
npm test
```

123 tests (unit + integration). Integration tests run against an in-memory MongoDB replica set, so no Docker or `.env` is needed. The first run downloads the `mongod` binary once (~140 MB) and caches it.

Other checks — CI runs all of these on every push:

```bash
npm run lint
npm run typecheck
npm run format:check
```

## Postman

1. Import [`postman/englishyaari.postman_collection.json`](postman/englishyaari.postman_collection.json).
2. Set the collection variable `teacherId` to an id from `npm run seed`.
3. Run the collection top to bottom (Collection Runner works).

Test scripts chain `userId` and `sessionId` between requests. Each run uses a fresh email and a random future slot, so re-running never collides with earlier data. 19 requests, 41 assertions.

## API

Full request/response bodies: [API examples](#api-examples).

| Method & path | Body / query | Success | Errors |
|---|---|---|---|
| `POST /users` | `{ fullName, email, phone }` | `201` user | `400`, `409` email taken |
| `POST /sessions` | `{ teacherId, startTime, endTime }` | `201` session | `400`, `404` teacher, `409` overlap |
| `GET /sessions/available` | `?dateTimestamp=<epoch ms>` | `200` sessions with `teacher` | `400` |
| `POST /sessions/:id/book` | `{ userId }` | `200` session | `400`, `404` user / session, `409` not available / started |
| `PATCH /sessions/:id/complete` | — | `200` session | `400`, `404`, `409` not booked |
| `GET /users/:id/sessions` | — | `200 { upcoming, completed }` | `400`, `404` user |
| `GET /health` | — | `200 { status, db }` | `503` when MongoDB is down |

### Rules worth knowing

- **Times:** `startTime` / `endTime` accept ISO-8601 date-times or epoch milliseconds; responses are ISO-8601 UTC.
- **"The supplied date"** in `/sessions/available` is the **IST** calendar day containing `dateTimestamp`. Only sessions that haven't started yet are listed.
- **No overlaps:** a teacher can't have two sessions that overlap, even if both requests arrive at the same instant. Back-to-back sessions are fine.
- **Booking** requires the session to be `AVAILABLE` and not yet started; two users racing for one session → exactly one wins.
- **Upcoming** = every `BOOKED` session (started or not) until it's marked complete. **Completed** is sorted most recent first.
- **Phone** must be an Indian mobile number (`9876543210`, `+91 98765 43210`, `09876543210`, …); stored as `+919876543210`.
- **Email** is unique, case-insensitive, stored lowercased.

### Error shape

Every error, from every layer:

```json
{
  "error": {
    "code": "SESSION_NOT_AVAILABLE",
    "message": "Session is not available for booking",
    "requestId": "0b9c1c8e-6a51-4c43-9d1e-2f5c7a0e9b11"
  }
}
```

Validation errors add `details: [{ path, message }]`, one per bad field. The `requestId` matches the `x-request-id` response header and the server log line.

| Code | Status |
|---|---|
| `VALIDATION_ERROR`, `INVALID_JSON` | 400 |
| `USER_NOT_FOUND`, `TEACHER_NOT_FOUND`, `SESSION_NOT_FOUND`, `ROUTE_NOT_FOUND` | 404 |
| `EMAIL_ALREADY_EXISTS`, `SESSION_OVERLAP`, `SESSION_NOT_AVAILABLE`, `SESSION_ALREADY_STARTED`, `SESSION_NOT_BOOKED` | 409 |
| `PAYLOAD_TOO_LARGE` | 413 |
| `RATE_LIMITED` | 429 |
| `INTERNAL_ERROR` | 500 |

## API examples

Real requests and responses from a local run against the Docker MongoDB (ids and timestamps will differ on your machine). Times are UTC; `2026-10-22T08:10:00.000Z` is 13:40 IST.

<details>
<summary><code>POST /users</code> — create a user</summary>

Request:

```bash
curl -s -X POST 'localhost:3000/users' \
  -H 'content-type: application/json' \
  -d '{"fullName": "Asha Rao", "email": "Asha.Local@Example.com", "phone": "+91 98765 43210"}'
```

Response `201` (email lowercased, phone normalised):

```json
{
  "fullName": "Asha Rao",
  "email": "asha.local@example.com",
  "phone": "+919876543210",
  "_id": "6ad722046b6b1e7bf9799d99",
  "createdAt": "2026-10-20T08:10:44.682Z",
  "updatedAt": "2026-10-20T08:10:44.682Z"
}
```

Same email again, in any letter case → `409`:

```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "A user with this email already exists",
    "requestId": "a1485fbc-4bbe-4be9-95e5-91aed10a3720"
  }
}
```

</details>

<details>
<summary><code>POST /sessions</code> — create a session</summary>

Request:

```bash
curl -s -X POST 'localhost:3000/sessions' \
  -H 'content-type: application/json' \
  -d '{"teacherId": "6ad72202c32570bebe83005f", "startTime": "2026-10-22T08:10:00.000Z", "endTime": "2026-10-22T09:10:00.000Z"}'
```

Response `201`:

```json
{
  "teacherId": "6ad72202c32570bebe83005f",
  "userId": null,
  "startTime": "2026-10-22T08:10:00.000Z",
  "endTime": "2026-10-22T09:10:00.000Z",
  "status": "AVAILABLE",
  "completedAt": null,
  "_id": "6ad722046b6b1e7bf9799d9a",
  "createdAt": "2026-10-20T08:10:44.722Z",
  "updatedAt": "2026-10-20T08:10:44.722Z"
}
```

A slot for the same teacher from 08:40 to 09:40 UTC (overlaps) → `409`:

```json
{
  "error": {
    "code": "SESSION_OVERLAP",
    "message": "Teacher already has a session that overlaps this time",
    "requestId": "8a954ce7-813d-4fa9-9880-6ac9a0d0117c"
  }
}
```

</details>

<details>
<summary><code>GET /sessions/available</code> — available sessions for a date</summary>

Request:

```bash
curl -s 'localhost:3000/sessions/available?dateTimestamp=1792656600000'
```

Response `200` (first of 3 items shown, sorted by `startTime`):

```json
[
  {
    "_id": "6ad722046b6b1e7bf9799d9a",
    "teacherId": "6ad72202c32570bebe83005f",
    "userId": null,
    "startTime": "2026-10-22T08:10:00.000Z",
    "endTime": "2026-10-22T09:10:00.000Z",
    "status": "AVAILABLE",
    "completedAt": null,
    "createdAt": "2026-10-20T08:10:44.722Z",
    "updatedAt": "2026-10-20T08:10:44.722Z",
    "teacher": {
      "_id": "6ad72202c32570bebe83005f",
      "fullName": "Priya Sharma",
      "specialization": "Spoken English"
    }
  }
]
```

`?dateTimestamp=tomorrow` → `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": "dateTimestamp",
        "message": "dateTimestamp must be epoch milliseconds"
      }
    ],
    "requestId": "22fb6bd8-308a-4f83-bcaf-57695fbe2595"
  }
}
```

</details>

<details>
<summary><code>POST /sessions/:id/book</code> — book a session</summary>

Request:

```bash
curl -s -X POST 'localhost:3000/sessions/6ad722046b6b1e7bf9799d9a/book' \
  -H 'content-type: application/json' \
  -d '{"userId": "6ad722046b6b1e7bf9799d99"}'
```

Response `200`:

```json
{
  "_id": "6ad722046b6b1e7bf9799d9a",
  "teacherId": "6ad72202c32570bebe83005f",
  "userId": "6ad722046b6b1e7bf9799d99",
  "startTime": "2026-10-22T08:10:00.000Z",
  "endTime": "2026-10-22T09:10:00.000Z",
  "status": "BOOKED",
  "completedAt": null,
  "createdAt": "2026-10-20T08:10:44.722Z",
  "updatedAt": "2026-10-20T08:10:44.769Z"
}
```

Booking the same session again → `409`:

```json
{
  "error": {
    "code": "SESSION_NOT_AVAILABLE",
    "message": "Session is not available for booking",
    "requestId": "876d9def-bdb3-4fe4-9584-05019829baaf"
  }
}
```

</details>

<details>
<summary><code>GET /users/:id/sessions</code> — a user's sessions (after booking)</summary>

Request:

```bash
curl -s 'localhost:3000/users/6ad722046b6b1e7bf9799d99/sessions'
```

Response `200`:

```json
{
  "upcoming": [
    {
      "_id": "6ad722046b6b1e7bf9799d9a",
      "teacherId": "6ad72202c32570bebe83005f",
      "userId": "6ad722046b6b1e7bf9799d99",
      "startTime": "2026-10-22T08:10:00.000Z",
      "endTime": "2026-10-22T09:10:00.000Z",
      "status": "BOOKED",
      "completedAt": null,
      "createdAt": "2026-10-20T08:10:44.722Z",
      "updatedAt": "2026-10-20T08:10:44.769Z",
      "teacher": {
        "_id": "6ad72202c32570bebe83005f",
        "fullName": "Priya Sharma",
        "specialization": "Spoken English"
      }
    }
  ],
  "completed": []
}
```

</details>

<details>
<summary><code>PATCH /sessions/:id/complete</code> — mark a session complete</summary>

Request:

```bash
curl -s -X PATCH 'localhost:3000/sessions/6ad722046b6b1e7bf9799d9a/complete'
```

Response `200`:

```json
{
  "_id": "6ad722046b6b1e7bf9799d9a",
  "teacherId": "6ad72202c32570bebe83005f",
  "userId": "6ad722046b6b1e7bf9799d99",
  "startTime": "2026-10-22T08:10:00.000Z",
  "endTime": "2026-10-22T09:10:00.000Z",
  "status": "COMPLETED",
  "completedAt": "2026-10-20T08:10:44.788Z",
  "createdAt": "2026-10-20T08:10:44.722Z",
  "updatedAt": "2026-10-20T08:10:44.789Z"
}
```

Completing it again → `409`:

```json
{
  "error": {
    "code": "SESSION_NOT_BOOKED",
    "message": "Only booked sessions can be completed",
    "requestId": "2205c1a7-8471-45cf-8f4b-e7309b3ea86e"
  }
}
```

</details>

<details>
<summary><code>GET /users/:id/sessions</code> — a user's sessions (after completing)</summary>

Request:

```bash
curl -s 'localhost:3000/users/6ad722046b6b1e7bf9799d99/sessions'
```

Response `200` (the session moved from `upcoming` to `completed`):

```json
{
  "upcoming": [],
  "completed": [
    {
      "_id": "6ad722046b6b1e7bf9799d9a",
      "teacherId": "6ad72202c32570bebe83005f",
      "userId": "6ad722046b6b1e7bf9799d99",
      "startTime": "2026-10-22T08:10:00.000Z",
      "endTime": "2026-10-22T09:10:00.000Z",
      "status": "COMPLETED",
      "completedAt": "2026-10-20T08:10:44.788Z",
      "createdAt": "2026-10-20T08:10:44.722Z",
      "updatedAt": "2026-10-20T08:10:44.789Z",
      "teacher": {
        "_id": "6ad72202c32570bebe83005f",
        "fullName": "Priya Sharma",
        "specialization": "Spoken English"
      }
    }
  ]
}
```

</details>

<details>
<summary><code>GET /health</code> — health check</summary>

Request:

```bash
curl -s 'localhost:3000/health'
```

Response `200`:

```json
{
  "status": "ok",
  "db": "up"
}
```

</details>

## Configuration

All configuration comes from environment variables (see [`.env.example`](.env.example)). They're validated at startup; the app refuses to start with a missing or invalid value.

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — (required) | Must point at a replica set |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `LOG_LEVEL` | `info` | pino level (`silent` … `trace`) |
| `CORS_ORIGINS` | empty (no browser origins) | Comma-separated allowlist; Postman/curl are unaffected |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window per IP |
| `RATE_LIMIT_MAX` | `100` | Requests per window per IP |

## How it's built

- **Layers:** routes (zod validation, thin handlers) → services (business rules, injected clock, no Express or Mongoose) → repositories (Mongoose queries, pipelines, transactions). Services are unit-tested with in-memory fake repositories.
- **Aggregation pipelines** power `/sessions/available` and `/users/:id/sessions`, as the brief requires. Both start with an indexed `$match` (verified with `explain`).
- **Concurrency:** overlap prevention runs in a transaction that locks the teacher; booking and completing are single conditional updates. Each guard has a "many requests at once" test that fails if the guard is removed.
- **Security:** helmet headers, CORS allowlist, per-IP rate limit, 10 kb body limit. Responses never include stack traces; logs never include request headers.

Details and trade-offs: [Architecture](docs/ARCHITECTURE.md) and [Decisions](docs/DECISIONS.md).

## Troubleshooting

- **`Transaction numbers are only allowed on a replica set member`** — `MONGODB_URI` points at a standalone MongoDB. Use the Docker one (`docker compose up -d --wait`) and the URI from `.env.example`.
- **Port 27017 already in use** — another MongoDB is running locally (e.g. Homebrew: `brew services stop mongodb-community@4.4`), or change the port mapping in `docker-compose.yml` and `MONGODB_URI`.
- **`Invalid environment configuration`** on start — a variable in `.env` is missing or malformed; the message names it.
