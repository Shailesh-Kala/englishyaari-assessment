# Prompt Log

Every prompt given to the AI pair-programmer, the phase it belongs to, and a short summary of the response.

---

## 1. Kick-off — Phase 0 (Repo setup)

<details>
<summary>Prompt</summary>

```
You are my pair-programming partner for an engineering assessment, where you must work in phases, stop at each checkpoint, and wait for my approval before continuing. Never skip a checkpoint.

## Context
Here  is the document for requirement: /Users/shaileshkala/Downloads/Backend-Assignment.pdf

## Tech stack
- Node.js, TypeScript, Express.js, MongoDB and Mongoose.
- Testing: Vitest + Supertest

## Phase 0 — Repo setup
1. Create a new public GitHub repo named "englishyaari-assessment"
2. Initialise git, add .gitignore, README.md skeleton, and the docs/ folder.
3. Create CLAUDE.md containing the working rules
4. Create docs/PROMPTS, Requirement, Design architecture and Implementation Plan MD files
5. Commit each document separatly and push. STOP and show me the repo URL.

## Phase 1 — Requirements
Create docs/REQUIREMENTS.md, covering: goal, persona, in-scope features, explicitly out-of-scope items WITH reasoning, assumptions, and open questions.  Keep scope small over complexity.  STOP for my review.

## Phase 2 — Design
Create docs/ARCHITECTURE.md with: architecture diagram, data model, API endpoint list, folder structure, and a section each for security, performance, and reliability decisions with trade-offs.
Create docs/PLAN.md: a numbered list of small tasks, each sized to 1–3 commits. STOP for my review.

## Phase 3 — Build with TDD, one task at a time. For each task in PLAN.md:
1. Write failing test(s) first then commit "test: {whatever is the testcase}"
2. Write the minimum code to pass the test then commit "feat: .{whatever is the task}"
3. Refactor if needed then commit "refactor: {whatever is the task}"
4. Run the full test suite; never commit with failing tests
5. Tick the task in PLAN.md, then briefly tell me what have we done and we will discuss if any discussion need to be made and wait for "next"

## Working rules (put these in CLAUDE.md)
Commits:
- Small and conventional commits (feat, fix, test, refactor, docs, chore, ci). One logical change per commit. Push after each task.
- Never squash or rewrite history.
- No need co-author name in the commit so don't mention any co-author the commit should only show my profile as author of commit.
- Stick to scoope mentioned in the requirement doc do need any complexity.

Code quality:
- Layered structure: routes/controllers => services (business logic) => repositories (DB). Business logic must be unit-testable without HTTP or a real DB.
- Clear names, small functions, no dead code, consistent formatting via linter + formatter.
- Centralised error handling with consistent error response shape.

Tests:
- Fast, deterministic, readable. No real network, no reliance on time or random values without seeding/injection.

Security:
- Validate all input on the server with a schema library. Parameterised queries/ORM only.
- Secrets only in environment variables; provide .env.example, never commit .env.
- Rate limiting on login, CORS restricted, security headers.

Performance:
- Server-side pagination, sorting, filtering and search — never send all rows.
- Database indexes on columns used for filtering/sorting.

Reliability & debuggability:
- DB migrations, transactions for multi-step writes, optimistic locking or updated_at
  checks on salary edits.
- Health check endpoint, structured logging with request IDs, meaningful error messages.
- GitHub Actions CI running lint + tests on every push.

Documentation keep updated as we go:
- docs/PROMPTS.md: after each of my messages, append my prompt, the phase, and a 1–2 line summary of what you did in response. Commit this file along with the related work.
- docs/DECISIONS.md: log every meaningful decision (what, alternatives, why, trade-off).
- README.md: setup, run, seed, test, deploy instructions, live URL, demo video link,
  and links to all docs.

General:
- If anything is unclear, ask instead of guessing or assuming
- If you disagree with my instruction, raise it and explain why.

Start with Phase 0 now.
```

</details>

**Response:** Created public repo `englishyaari-assessment`, added `.gitignore`, README skeleton, `CLAUDE.md` working rules (adapted to the booking domain — see DECISIONS.md D-001), and skeleton docs (`PROMPTS`, `REQUIREMENTS`, `ARCHITECTURE`, `PLAN`, `DECISIONS`), each in its own commit, then pushed.

---

## 2. Phase 0 checkpoint → Phase 1 (Requirements)

**Prompt:**
> Approved all adaptations, seed teachers. No need any deployment as we it's assessment only for local run

**Response:** Logged D-001 as approved, added D-002 (seed teachers) and D-003 (local only), removed deploy/live-URL from README and CLAUDE.md. Wrote `docs/REQUIREMENTS.md` (goal, personas, F1–F6 with status codes, out-of-scope with reasons, assumptions, open questions with proposed defaults).

---

## 3. Phase 1 review — open-question answers

**Prompt:**
> here are Open questions answers:
> 1. IST
> 2. milliseconds
> 3. upcoming will be - only booked sessions that haven’t started yet
> 4. Yes, reject a teacher creating sessions that overlap
> 5. 404

**Response:** Updated REQUIREMENTS.md (IST day boundaries, upcoming = booked & future, teacher overlap → `409`, resolved-questions table) and logged D-004 to D-007. Flagged two consequences for review: started-but-not-completed sessions drop out of both lists, and the overlap-check race.

---

## 4. Phase 1 review — status values and overlap

**Prompt:**
> 1. First of all can you read the requirement doc again the status seems to be AVAILABLE / BOOKED / COMPLETED
> 2. Overlapping should not be allowed
>
> *(PDF text pasted for reference)*

**Response:** Re-checked REQUIREMENTS.md against the PDF — statuses already match exactly. Dropped the `inProgress` suggestion and recorded the accepted gap (D-005). Made overlap impossible under concurrency via transaction + teacher-doc write on a replica set (D-006, D-008).

---

## 5. Phase 1 review — started sessions

**Prompt:**
> 1. a booked session that has started and booked should show inside booked status and if it doesn't booked then don't show it anywhere
> 2. No overlaps, even when two requests arrive at the same momen

**Clarified via questions:** keep started BOOKED sessions in `upcoming`; hide started AVAILABLE sessions and block booking them.

**Response:** Updated F3/F4/F6 and assumptions in REQUIREMENTS.md; logged D-009 (supersedes D-005) and D-010. Overlap guard (D-008) already covered point 2.

---

## 6. Phase 2 (Design)

**Prompt:**
> Next

**Response:** Wrote `docs/ARCHITECTURE.md` (diagrams, data model + indexes, endpoints + error codes, both aggregation pipelines, folder structure, security/performance/reliability trade-offs) and `docs/PLAN.md` (16 tasks with their test cases). Logged D-011 to D-019.

---

## 7. Phase 3 — Task 1 (Tooling scaffold)

**Prompt:**
> next

**Response:** Added package.json (ESM, Node ≥ 22), strict tsconfig, ESLint flat config + Prettier, Vitest config. Lint, typecheck, format check and test all pass. Logged D-020 (ESM).

---

## 8. Phase 3 — Task 2 (CI)

**Prompt:**
> next

**Response:** Added GitHub Actions workflow (lint, format check, typecheck, test on Node 24) — first run green. Pinned runner to `ubuntu-24.04` because `ubuntu-latest` is moving to Ubuntu 26, which mongod test binaries may not support yet.
