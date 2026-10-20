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
- **Trade-off:** Diverges from the literal prompt wording; pending owner approval at the Phase 0 checkpoint.
