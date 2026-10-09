# RESUME — you were restarted by the orchestrator

You are continuing an autonomous build that a previous session started. Nobody is
watching; never ask questions or wait for confirmation.

1. Read, in this order: `PRD.md`, `IMPLEMENTATION_PLAN.md`, `PROGRESS.md`, `DECISIONS.md`.
2. Run the existing checks (lint, type-check, tests, production build) to see the real
   current state. Fix anything that is broken first.
3. Find the next unfinished phase or requirement in `PROGRESS.md` and continue building
   from there, following every rule in `prompts/codex_build.md` (read it now — its
   HARD RULES, BUILD ORDER, AFTER EACH PHASE and DEFINITION OF DONE sections all apply).
4. Keep `PROGRESS.md` current after every meaningful step; you may be restarted again.
5. Respect the times in ORCHESTRATOR CONTEXT above. If the feature freeze is less than
   2 hours away, stop starting new features: finish and stabilize what exists, and
   apply the cut order in PRD §13.1.
6. When the Definition of Done in `prompts/codex_build.md` is met, create
   `ORCHESTRATOR_DONE.md` as described there.

Do NOT run git commit / push / reset / checkout / stash. The orchestrator commits.

Continue now without stopping.
