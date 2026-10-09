# HERMES NOTES — documentation session 2 (update)

> Written: 2026-10-09 16:46 (Asia/Manila) · Agent: Hermes (DeepSeek V4.1 Flash) · Docs role.
> This **supersedes session 1**. It is the handover note: what changed, what I re-verified, and
> what the **human** must still do.

## ⚠️ Correction to session 1: the app IS being built now

Session 1 said "no app code exists yet" because the builder was dying with
`error: unexpected argument '--full-auto' found`. **That is out of date.** The builder now runs,
and `PROGRESS.md` + `DECISIONS.md` record real, verified work:

- **Phase 1 — PASSED:** Vite + React + TS + PWA scaffold, camera/gallery photo input (F1),
  file validation, WebGPU detection.
- **Phase 2 — PASSED:** Tesseract.js OCR with word positions (F2), the PRD §7 pattern rules
  (F3), and solid, flattened cover rendering (F6). 12 unit tests + lint + types + build pass;
  Chromium ran real OCR on a generated SAMPLE image.
- **Phase 3 — PASSED:** MediaPipe BlazeFace face detection (F4), ZXing-WASM QR/barcode (F5),
  DistilBERT NER via Transformers.js (F3), and box merge — each verified in isolated Chromium
  runs against synthetic fixtures. The risk-scoring module is implemented with unit tests.
- **Phase 4 — IN PROGRESS:** the review / touch-up / risk / export UI is not finished.

What the running app does **today**: the home screen (Take Photo / Choose Photo, the
"On-device · 0 uploads" badge) → the worker pipeline scans → a **covered preview** plus a list
of detected items. What it does **not** have yet: a before/after toggle, an on-screen risk
banner, the touch-up tool, the watermark, the export step, a **live** network counter, or any
local-LLM summary. `README.md` and `eval/results.md` still do not exist.

## What I did this session

Boundaries unchanged: I touched only files under `docs/` and the single file
`eval/test-plan.md`. No git commands, no installs, no servers, no source edits.

I re-read `PRD.md`, `PROGRESS.md`, `DECISIONS.md`, the whole `src/` and `tests/` tree, and every
doc, then corrected each claim the app can no longer honestly support:

| File | Change |
|---|---|
| `eval/test-plan.md` | Banner replaced with the real status; all 30 cases remain **NOT YET RUN** with a blank Result column. Expected values corrected to verified behaviour: QR codes always score **High** (conservative — PRD P2 document classification is not implemented); an unlabeled long digit run scores **Medium**; reference/transaction numbers are **detected but left uncovered by default** (PRD §7 optional-cover rule). |
| `docs/demo-script.md` | Banner corrected; every beat tagged **BUILT** or **NOT BUILT YET** so nobody speaks a feature the app cannot show. |
| `docs/judge-qa.md` | Banner corrected; Q5/Q6/Q7/Q10 now name what actually runs; no results figure is quoted (no `results.md`). |
| `docs/submission.md` | Fields 7, 9, 10 rewritten to the real, verified models/versions; watermark/summary/export marked not-yet-built; the synthetic face fixture disclosed; "README still missing" warning kept. |
| `docs/social-post.md` | Banner corrected; posts describe only what exists (or clearly framed goals), with a hard "don't publish a feature you can't show" rule. |
| `docs/HERMES_NOTES.md` | This file — rewritten for session 2. |

## Verified facts worth reusing

- **Versions:** React 19.3.0, Vite 8.3.4, TypeScript **6.0.3 installed** (the registry "latest"
  7.0.2 is *not* what the lock resolves to), Tailwind 4.3.3, vite-plugin-pwa 2.0.0.
- **OCR:** Tesseract.js 7.0.0 (core 7.0.0), English data from the 4.0.0 tessdata mirror;
  Apache-2.0.
- **Faces:** `@mediapipe/tasks-vision` 1.1.0 + BlazeFace short-range float16 v1
  (229,746 bytes); Apache-2.0; must load via the ES-module `FilesetResolver` loader — the
  classic loader throws `ModuleFactory not set` in a module worker.
- **NER:** Transformers.js **3.8.1** (4.3.1 failed in-browser), model
  `onnx-community/distilbert-NER-ONNX` (q8, 65,772,734 bytes), base `dslim/distilbert-NER`
  (Apache-2.0). English CoNLL; Filipino names/addresses lean on label-proximity rules.
- **QR:** ZXing-WASM 3.1.5 (966,895 bytes), MIT, always run through the local worker.
- **LLM — chosen, NOT integrated:** WebLLM 0.2.85 + Qwen2.5-0.5B-Instruct-q4f16_1-MLC.
- **Test fixture:** `tests/assets/sample-synthetic-face.png` — a fictional face generated with
  OpenAI's image tool (SHA-256 `831872d94e751b322d705e31d9395467611b75226b02abdb334027148a0e0c0f`);
  no real person, no government design.

## What later sessions must do

1. When Phase 4 lands: re-check every doc against the running app.
2. When `README.md` exists: replace the model/tech lists in `submission.md` fields 9–10 with
   the README's exact list.
3. When `eval/results.md` exists: quote its real numbers in `judge-qa.md` and `demo-script.md`
   Beat 5 — and nowhere else.
4. When the full flow (review → touch-up → watermark → export) exists: flip the demo beats from
   NOT BUILT YET to BUILT and re-time them.

## Human to-do list (short)

1. Finish Phase 4 (review UI, touch-up, risk banner, export, live network counter, watermark).
2. Write `README.md` with the full disclosure list.
3. Run `eval/test-plan.md`, fill the Result column, and produce `eval/results.md` — misses
   included.
4. Fill the `[BLANK]` fields in `docs/submission.md` (team, repo URL, video URL, post URL).
5. Record the video from `docs/demo-script.md` Part B; post via `docs/social-post.md`.
6. Before submitting: repo **public**, **no real personal data** anywhere in it.
