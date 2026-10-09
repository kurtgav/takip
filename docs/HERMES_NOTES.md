# HERMES NOTES — documentation session 3 (update)

> Written: 2026-10-09 18:5x (Asia/Manila) · Agent: Hermes (DeepSeek V4.1 Flash) · Docs role.
> This **supersedes sessions 1 and 2**. Handover note: what changed, what I re-verified against the
> **built** app, and what the **human** must still do.

## Headline: the app is now BUILT (F1–F16), and the docs had drifted stale

Sessions 1–2 were written while the app was only *partly* built (Phase 4 — review UI, touch-up,
risk banner, export, live counter, watermark, local summary — was still in progress, and
`README.md` / `eval/results.md` did not exist). **All of that has landed.** The docs still carried
the old "partly built / not built yet / no results file" wording, which is now **false and
dangerous** (it would have the team under-claim a working product, or contradict the README).

This session **reconciled every doc to the built, verified state**, anchored to the two
authoritative sources: `README.md` (disclosure list + submission status) and `eval/results.md`
(executed results only). Nothing was inferred beyond those two files plus `PRD.md`.

## Current verified state (from `eval/results.md`, 2026-10-09 feature-freeze rerun)

- **F1–F16 implemented and verified; F17 (PaddleOCR) deferred.**
- `npm run lint`, `npm run typecheck`, `npm test` (**30/30**), `npm run build` (53 precache
  entries, 224093.40 KiB), `npm run test:browser` (**11/11 in 2.7 min**) — all **PASSED**, no
  skips or failures.
- Verified end-to-end: real OCR, face/NER/QR detection, review, manual covers, risk summary,
  watermark pixels, flattened **metadata-free** export, share fallback/cancellation, fresh
  **offline reload → scan → export**, suspended-worker guard, update deferral, cached real Qwen
  inference. Offline processing request log **empty**; UI counter **0/0**.
- Asset integrity: all 53 manifest assets match recorded byte sizes and SHA-256.
- **Still NOT measured:** human 30-photo accuracy set (recall / false covers), mid-range-phone
  scan time, Safari/iOS, physical camera, native OS share sheet, three venue rehearsals.

## What I did this session

Boundaries kept: I edited only files under `docs/` plus `eval/test-plan.md`. No git commands, no
installs, no servers, no source edits.

| File | Change |
|---|---|
| `eval/test-plan.md` | Rewritten to the built state: header/banner updated to Session 3; kept the 30 cases and the honest "NOT YET RUN — fill real numbers, do not infer from automated tests" rule; expected values aligned to verified behaviour (QR always High; unlabeled long digit run Medium; reference/transaction numbers detected but uncovered by default; export strips metadata). |
| `docs/demo-script.md` | Beats flipped from NOT BUILT YET to **BUILT** now that review/touch-up/watermark/export/summary exist; SAMPLE-only and honest "not yet recorded / not yet measured" caveats retained. |
| `docs/judge-qa.md` | Answers updated to name what actually runs (full flow + optional local LLM) and to point at `eval/results.md`; still refuse to quote recall/phone numbers until measured. |
| `docs/submission.md` | Rewritten and **reconciled with README.md + eval/results.md** — every field now matches the shipped app; the old "partly built / not built / README missing" build-status warning replaced with the true built status and the precise "not yet measured" list. `[BLANK]` human fields kept blank. |
| `docs/social-post.md` | Banner corrected to built; posts now describe the full flow (covers + watermark + metadata-free export + optional local summary) but still forbid unmeasured numbers; the one number quoted ("0 requests") is from `eval/results.md`. |
| `docs/HERMES_NOTES.md` | This file — rewritten for session 3. |

`README.md`, `PROGRESS.md`, `DECISIONS.md`, `ORCHESTRATOR_*.md`, `PRD.md`, `IMPLEMENTATION_PLAN.md`
are owned by the builder/orchestrator; I only **read** them. Where a doc under `docs/` disagreed
with them, the doc under `docs/` was corrected.

## Verified facts worth reusing (unchanged from session 2 where not superseded)

- **Versions:** React 19.3.0, Vite 8.3.4, TypeScript **6.0.3 installed** (registry "latest" 7.0.2
  is *not* what the lock resolves to), Tailwind 4.3.3, vite-plugin-pwa 2.0.0.
- **OCR:** Tesseract.js 7.0.0 (core 7.0.0), English data from the 4.0.0 tessdata mirror; Apache-2.0.
- **Faces:** `@mediapipe/tasks-vision` 1.1.0 + BlazeFace short-range float16 v1 (229,746 bytes);
  Apache-2.0; load via the ES-module `FilesetResolver` — the classic loader throws
  `ModuleFactory not set` in a module worker.
- **NER:** Transformers.js **3.8.1** (4.3.1 failed in-browser), model
  `onnx-community/distilbert-NER-ONNX` (q8, 65,772,734 bytes), base `dslim/distilbert-NER`
  (Apache-2.0). English CoNLL; Filipino names/addresses lean on label-proximity rules.
- **QR:** ZXing-WASM 3.1.5 (966,895 bytes), MIT, always through the local worker.
- **LLM — now INTEGRATED (optional):** WebLLM 0.2.85 + `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`
  (WebGPU only; template fallback). Category-identifiers-only request contract verified.
- **Test fixture:** `tests/assets/sample-synthetic-face.png` — fictional face generated with
  OpenAI's image tool (SHA-256 `831872d94e751b322d705e31d9395467611b75226b02abdb334027148a0e0c0f`);
  no real person, no government design.

## What future sessions must do

1. Keep every doc anchored to `README.md` + `eval/results.md`; if they change, re-reconcile.
2. When the human runs `eval/test-plan.md` on real photos and fills `eval/results.md` with real
   recall / false-cover / scan-time numbers, quote those figures **only where measured** —
   `judge-qa.md`, `demo-script.md`, `social-post.md`.
3. When a physical phone / Safari / venue rehearsal is actually run, move the matching item from
   "NOT YET MEASURED" to measured in the docs it touches.
4. Do **not** invent team identity, a repo URL, a video URL, a social URL, or a submitted status —
   those stay `[BLANK]` / "NOT PROVIDED" until the human supplies them.

## Human to-do list (short)

1. Fill the `[BLANK]` fields in `docs/submission.md` (team, repo URL, video URL, post URL).
2. Make the GitHub repo **PUBLIC** before 10:00 AM Oct 10.
3. Run `eval/test-plan.md` on team-made data, record misses + false covers + scan times into
   `eval/results.md`; then you may quote accuracy numbers.
4. Record the ~1-minute video from `docs/demo-script.md` (SAMPLE content only) and post via
   `docs/social-post.md` (tag Devin/Cognition, include `#AppBuildersPH`).
5. Submit **once**; PRD §15 allows no edits or resubmission.
