# CLAUDE.md — Working Rules

Source of truth for scope: `docs/REQUIREMENTS.md` (derived from the Backend Assignment PDF).
Stack: Node.js, TypeScript, Express, MongoDB, Mongoose. Tests: Vitest + Supertest.

## Workflow

- Work in phases; stop at every checkpoint and wait for approval.
- Build phase is TDD, one PLAN.md task at a time:
  1. Failing test(s) → commit `test: <test case>`
  2. Minimum code to pass → commit `feat: <task>`
  3. Refactor if needed → commit `refactor: <task>`
  4. Run the full suite; never commit with failing tests.
  5. Tick the task in PLAN.md, summarise, wait for "next".
- If anything is unclear, ask instead of guessing. If you disagree with an instruction, say so and explain why.

## Commits

- Small, conventional commits (`feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`). One logical change per commit.
- Push after each task.
- Never squash or rewrite history.
- No `Co-Authored-By` or any co-author trailer. The repo owner is the only author.
- Stick to the scope in the requirement doc. No extra complexity.

## Code quality

- Layered: routes/controllers → services (business logic) → repositories (DB).
- Business logic must be unit-testable without HTTP or a real DB.
- Clear names, small functions, no dead code. Linter + formatter enforced.
- Centralised error handling with one consistent error response shape.
- async/await only.

## Tests

- Fast, deterministic, readable.
- No real network. No reliance on current time or randomness — inject a clock / seed values.

## Security

- Validate all input on the server with a schema library.
- ORM (Mongoose) only; never build queries from raw user strings.
- Secrets only in environment variables; ship `.env.example`, never commit `.env`.
- Rate limiting, restricted CORS, security headers.

## Performance

- Never return unbounded result sets without a reason recorded in DECISIONS.md.
- Indexes on fields used for filtering/sorting.

## Reliability & debuggability

- Atomic, conditional writes for state transitions (e.g. book only if still AVAILABLE) to prevent races.
- Transactions for multi-step writes.
- Health check endpoint, structured logging with request IDs, meaningful error messages.
- GitHub Actions CI runs lint + tests on every push.

## Documentation (keep updated as we go)

- `docs/PROMPTS.md`: after each user message, append the prompt, the phase, and a 1–2 line summary of the response. Commit with the related work.
- `docs/DECISIONS.md`: every meaningful decision — what, alternatives, why, trade-off.
- `README.md`: setup, run, seed, test, demo video, Postman collection, links to all docs. Local run only — no deployment (D-003).
