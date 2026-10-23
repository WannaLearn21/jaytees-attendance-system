# Task Cards

Work on JATS is cut into small **task cards**. The full list is in `docs/tasks/backlog.md`. This file explains how to use and write them.

## Rules

- One card per agent session, one branch per card (`card/<id>-<slug>`), one pull request per branch.
- Stay inside the card's **May touch** folders. Anything on **Must not touch** is off limits.
- A card is done only when every acceptance check passes and `AGENTS.md` section 8 is satisfied.
- If a card depends on an open decision (`docs/decisions/README.md`), build against the proposed default behind a named parameter and say so in the PR.
- If you find work that is not on any card, write it down in the PR description. Do not quietly do it.

## Card template

Copy this when adding a card.

```
### <id> <title>
Agent: <role>
Needs: <earlier cards or decisions, or none>
Goal: <one sentence>
Read first: <PRD section, docs>
May touch: <folders>
Must not touch: <folders / files>
Acceptance:
- <command that must pass>
- <behavior that must hold>
Human review: <yes (why) / no>
Report back: what changed, what you were unsure about, what the docs left open
```

## Sample (card 1.4 in short)

Implement `punch()` per `docs/architecture.md` section 4 and `docs/database.md` section 5. May touch `supabase/migrations/`, `supabase/tests/`. Must not touch RLS policies on other tables or any app code. Acceptance: all rows of the `punch()` matrix in `docs/testing.md` section 4 pass; direct inserts into `punches` fail for every app role. Human review: yes.

## Status

Track status in the pull requests or an issue tracker (open, in progress, in review, done). Keep this repository free of status churn: the backlog lists *what* to build, not who is doing it.
