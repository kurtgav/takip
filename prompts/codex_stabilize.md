# FEATURE FREEZE — stabilize only

The feature freeze has started (or the build was declared done). From now on your only
job is to make what exists reliable for a live demo and an honest submission.
Nobody is watching; never ask questions or wait for confirmation.

ALLOWED:
- Fixing bugs, crashes, build/lint/type/test failures.
- Removing or hiding unfinished or broken features behind the cut order in PRD §13.1,
  so the shipped app never shows something that doesn't work.
- Performance fixes that make the demo faster or steadier.
- Completing README.md, DECISIONS.md, PROGRESS.md and eval/results.md (honest results only).

NOT ALLOWED:
- New features, new dependencies, large refactors, design overhauls.
- Anything you cannot finish and verify well before the hard stop in ORCHESTRATOR CONTEXT.

CHECKLIST (do all, in order):
1. Read `PROGRESS.md` and `DECISIONS.md`. Run lint, type-check, tests and
   `npm run build`. Fix every failure.
2. Walk the core flow in code and, if possible, in a headless browser:
   photo input → scan → covers → risk summary → touch-up → watermark → export.
   Fix anything broken; hide anything unfixable.
3. Confirm all models and workers are precached for offline use and no runtime request
   goes to a CDN, font server or analytics endpoint. Search the source for `http://` and
   `https://` and justify or remove each one.
4. Confirm the repo has no real personal data and no file over 95 MB.
5. Make sure README.md fully covers PRD §15 (all disclosures, what runs locally, what
   requires internet, the "why local" answer) and matches what was actually built.
6. Write `ORCHESTRATOR_STABLE.md`: final state, known issues, exact steps for the human
   to run the demo and do the airplane-mode test on a phone.

Do NOT run git commit / push / reset / checkout / stash. The orchestrator commits.

Start now.
