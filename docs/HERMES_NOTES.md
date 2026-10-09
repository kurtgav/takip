# HERMES NOTES — documentation session 1

> Written: 2026-10-09 16:2x (Asia/Manila) · Agent: Hermes (DeepSeek V4.1 Flash) · Docs role.
> This is a handover note: what I changed, decisions I made, and what the **human** must do.

## ⚠️ The most important thing: no app code exists yet

The build agent (Codex) has **produced nothing** across all four sessions so far. Every
session exits almost immediately with the same error:

```
error: unexpected argument '--full-auto' found
Usage: codex exec [OPTIONS] [PROMPT]
```

(`logs/codex-001.log` … `logs/codex-004.log`; the orchestrator records "builder exited fast
with code 2" in `ORCHESTRATOR_STATUS.md`.)

Cause: `orchestrator.json` configures the builder as
`["codex","exec","--full-auto","-c","sandbox_workspace_write.network_access=true","{prompt}"]`,
but the installed Codex CLI no longer accepts `--full-auto`. So the repo still contains only
`PRD.md`, the orchestrator kit and these docs — **no `src/`, `public/`, `tests/`, `README.md`,
`PROGRESS.md`, `DECISIONS.md` or `eval/results.md`.**

**HUMAN ACTION REQUIRED (I am forbidden from editing `orchestrator.json`):**
1. Run `codex exec --help` and pick the correct non-interactive flag for your version.
2. Edit the `codex.command` line in `orchestrator.json`, e.g. drop the flag entirely or use
   `["codex","exec","--dangerously-bypass-approvals-and-sandbox","{prompt}"]` (keep `{prompt}`
   last — the script substitutes it). Verify with `python orchestrate.py --check`, then restart
   the orchestrator so a build session actually runs.
   → Until this is fixed, **nothing will be built**, and the pitch/video/submission have
   nothing to demonstrate. This is the critical path.

## What I created this session

Strict boundaries respected: I only created files under `docs/` and the single file
`eval/test-plan.md`. I ran **no git commands**, installed nothing, started no servers.

| File | What it is |
|---|---|
| `eval/test-plan.md` | 30 test cases covering **every** PRD §7 category, with document type, condition (N/A/G/L), expected covers, expected risk and an **empty Result column**. Includes a synthetic test-set inventory (S1–S20), a §7-category→case coverage matrix, false-cover control (TC-29) and the safety-net case (TC-28). Synthetic/team-made data only. |
| `docs/demo-script.md` | 5-minute live pitch (PRD §16.1) with exact spoken lines + on-screen actions per beat; ~1-minute video shot list (PRD §16.2); demo-safety rules (PRD §16.3); a printable live-demo checklist. |
| `docs/judge-qa.md` | The 12 hardest judge questions, each tagged to a judging criterion (usefulness / local AI / execution / innovation / demo), with short honest answers and a do/don't list. |
| `docs/submission.md` | Every PRD §15 field ready to paste, with team members and URLs left as clearly marked `[BLANK]` fields, plus the disclosure list (Codex, Hermes on DeepSeek V4.1 Flash, orchestrator script) and the §15.6 "why local" answer. |
| `docs/social-post.md` | X post (+ optional 3-tweet thread) and a LinkedIn post for the demo video; both tag Devin/Cognition and include **#AppBuildersPH**; posting checklist. |
| `docs/HERMES_NOTES.md` | This file. |

## Decisions I made (and why)

- **Honest build-status banner on every file.** Because nothing is built, every doc opens
  with a "Build status" note stating the app does not exist yet, and every claim is tied to
  the PRD design rather than to a shipped feature. This satisfies the rule *"never claim
  features that don't exist"* while still delivering the deliverables the orchestrator
  expects on session 1.
- **No invented results.** `eval/test-plan.md` says every case is "NOT YET RUN" and the Result
  column is blank. No recall %, scan time or "0 requests" figure is stated anywhere as fact;
  the docs tell the writer to quote only `eval/results.md`.
- **Models/technology lists are marked as the PRD plan**, with an instruction to replace them
  with the exact list from `README.md` once it exists (and not to submit a model the app
  doesn't run).
- **Fake test data is written as obviously fake** (e.g. "JUAN SAMPLE DELA CRUZ", `0917-000-0000`,
  test card `4111 1111 1111 1111`) and flagged "must not copy a real government ID design"
  per PRD §12.1.
- **X handle note:** Cognition's live X handle is now **@cognition** (`@cognition_labs`
  redirects). The social post says to confirm the tag resolves before posting.

## What still needs doing (later sessions / final run)

- **Every doc must be re-checked against the built app** once Codex actually ships code, and
  against `README.md` / `eval/results.md` when those exist. Later Hermes sessions should:
  update `submission.md` fields 7–10 to match `README.md`; replace "NOT YET VERIFIED" markers
  in `demo-script.md`; and quote real numbers from `eval/results.md` in `judge-qa.md`.
- `eval/results.md` is **not** mine to write (PRD assigns it to the build/human side; my
  boundary is `docs/` + `eval/test-plan.md`). The plan tells the human how to roll results up
  into it.

## Human to-do list (short)

1. **Fix the Codex command in `orchestrator.json`** (above) — blocks everything.
2. Once the app builds: run `eval/test-plan.md`, fill the Result column, and produce
   `eval/results.md`.
3. Fill the `[BLANK]` fields in `docs/submission.md` (team, repo URL, video URL, post URL).
4. Record the video from `docs/demo-script.md` Part B; post using `docs/social-post.md`.
5. Before submitting: confirm the repo is **public** and contains **no real personal data**.
