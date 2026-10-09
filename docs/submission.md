# TAKIP — Devpost submission (ready to paste)

> Owner: Hermes (docs) · Session 1 created, updated Session 4 (2026-10-09 20:59 Asia/Manila).
> **Internal draft** — this is NOT the submitted form. Every field below maps to the PRD §15.1
> checklist. Fill the `[BLANK — …]` fields, run the pre-submit checklist, then paste into Devpost.
> Team members and URLs are deliberately left as **clearly marked blanks** for the human.

## Build status (verified Session 4, 2026-10-09 20:59 — read this first)

The app is **built**: PRD **F1–F16 are implemented and verified** in the automated browser suite;
**F17 (PaddleOCR)** is deferred. `eval/results.md` records the executed results: `npm run lint`,
`npm run typecheck`, `npm test` (**30/30 unit**), `npm run build`, and `npm run test:browser`
(**11/11 browser tests, 2.7 min**) all **PASSED** — including the full
photo → scan → covers → risk summary → watermark → flattened metadata-free export flow, a fresh
offline reload, and a network log with zero processing requests.

The app is also **deployed**: per `README.md` (§Deploy/§Verification) and `eval/results.md`
(§Live deployment), the static PWA is published to **GitHub Pages over HTTPS** (subpath build
`VITE_BASE=/takip/`; `.github/workflows/pages.yml` republishes `dist/` on every push to `master`),
and the same offline suite re-passed **15/15 checks** against the live origin. **The URL itself is
left blank below for the human** — the verified value is recorded for you in `docs/HERMES_NOTES.md`.

**What remains before submission (NOT YET RUN — do not claim it):** the human fields below, the
demo video (PRD §16.2), the §12 measurements on a real phone (recall / false covers / scan time),
and the 3 venue rehearsals. The earlier "obsolete submission draft" the README flagged is this
file: it is now reconciled to the built + deployed state.

---

## PRD §15.1 — checklist, field by field

- [ ] **Project name:** **TAKIP**
- [ ] **Short description:** (see §15.2 below)
- [ ] **Team members:** `[BLANK — team member names and roles]`
- [ ] **Public GitHub repository:** `[BLANK — paste the public repo URL; must be PUBLIC before 10:00 AM Oct 10]`
- [ ] **Demo video (~1 minute):** `[BLANK — paste the video URL; shot list in `docs/demo-script.md`; SAMPLE content only]`
- [ ] **X / LinkedIn video post URL:** `[BLANK — paste the post URL; tag Devin / Cognition and include #AppBuildersPH]`
- [ ] **What runs locally:** (see §15.3 below)
- [ ] **What requires internet:** (see §15.4 below)
- [ ] **Models used:** (see §15.5 below)
- [ ] **Technologies and frameworks:** (see §15.6 below)
- [ ] **APIs and cloud services:** (see §15.7 below)
- [ ] **Existing code and assets:** (see §15.8 below)
- [ ] **AI development tools:** (see §15.9 below)
- [ ] **Why does this product benefit from running AI locally?:** (see §15.10 below)
- [ ] **Submitted once** (no edits or resubmission allowed)

---

## §15.2 Short description

> TAKIP is an on-device privacy filter that automatically finds and covers ID numbers, faces,
> birthdays, addresses, and account numbers in photos before you share them. All AI runs locally on
> your phone, works in airplane mode, and your original photo never leaves your device.

## §15.3 What runs locally

OCR (Tesseract.js), face detection (MediaPipe), named-entity recognition (Transformers.js),
risk-summary LLM (WebLLM), QR / barcode detection, pattern rules, covering, watermarking, and
export. **All processing** — nothing is sent anywhere while the app works.

## §15.4 What requires internet

Only the **first load** of the app and the one-time model download. Nothing is uploaded at any time.

## §15.5 Models used

| Job | Model / library | Notes |
|---|---|---|
| Text / OCR | **Tesseract.js 7.0.0** (LSTM, `eng` data) | Apache-2.0 |
| Faces | **`@mediapipe/tasks-vision` 1.1.0** — BlazeFace short-range, float16 | Apache-2.0 |
| Names / addresses / places | **Transformers.js 3.8.1** running **`onnx-community/distilbert-NER-ONNX`** (int8/q8) | base `dslim/distilbert-NER`, Apache-2.0 |
| Risk summary (optional) | **WebLLM 0.2.85** + **`Qwen2.5-0.5B-Instruct-q4f16_1-MLC`** | WebGPU only; template fallback |
| QR / barcode (not AI) | **ZXing-WASM 3.1.5** (local worker) | MIT; `BarcodeDetector` API where available |

## §15.6 Technologies and frameworks

TypeScript, **Vite 6**, **`vite-plugin-pwa` (Workbox)** for the offline service worker, a **React**
UI shell, the **Canvas API** for covers / flattening / metadata stripping, and the Web Performance /
Web Share APIs. Deployed as a static PWA.

## §15.7 APIs and cloud services

**None at runtime.** No cloud AI API is used — that is the design. The build and hosting use
**GitHub Pages + GitHub Actions** (static hosting only; the deploy workflow carries no secrets). The
browser-native `BarcodeDetector` API is used where available, with the WASM reader as fallback.

## §15.8 Existing code and assets

- **No pre-existing project was reused.** The repo was created at build start.
- **Assets:** two application icons and a **labeled synthetic portrait**
  (`tests/assets/sample-synthetic-face.png`, SHA-256
  `831872d94e751b322d705e31d9395467611b75226b02abdb334027148a0e0c0f`) generated with OpenAI's image
  tool — a fictional face, no real person and no government ID design.
- **Model weights** (open-source, downloaded once at runtime): Tesseract `eng` data, MediaPipe
  BlazeFace, DistilBERT-NER (int8), optional Qwen2.5-0.5B-Instruct, ZXing-WASM. Licenses above.
- **Test data** is team-made / synthetic (labeled **SAMPLE** cards). No real IDs are committed;
  `eval/private/` is git-ignored.

## §15.9 AI development tools (disclosed)

**OpenAI Codex** (coding agent), the **Hermes agent running DeepSeek V4.1 Flash** (content, testing,
documentation), and the **orchestrator script** that drives the agents and makes commits. These were
used to **build** the product; **none of them is part of the product at runtime**.

## §15.10 Why does this product benefit from running AI locally?

> TAKIP protects the images people are most afraid to leak: their IDs and personal screenshots. A
> cloud tool would require uploading the very image it is meant to protect. By running OCR, face
> detection, entity recognition, and a small language model on the user's own device, TAKIP keeps
> the original private, works with no internet, responds instantly, and costs nothing per use.

---

## Pre-submit checklist (PRD §14.2 / §15)

- [ ] **Team members** filled (was `[BLANK]`).
- [ ] **Public GitHub repo** URL pasted; repo is **PUBLIC** and up to date before 10:00 AM Oct 10.
- [ ] **Demo video** (≤ 1 min) recorded and URL pasted — **no real IDs**, SAMPLE card only (§16.3).
- [ ] **X / LinkedIn post URL** pasted, **tagging Devin / Cognition** and including **#AppBuildersPH**.
- [ ] **Live PWA demo URL** added if the form offers a demo/URL field.
- [ ] Every `[BLANK — …]` field replaced; nothing left in brackets.
- [ ] Numbers quoted match `eval/results.md` **exactly** — no invented benchmarks.
- [ ] Phone recall, scan time and rehearsals stated only as "not yet measured".
- [ ] AI-assistance disclosure kept (Codex + Hermes/DeepSeek + orchestrator); runtime models all open-source.
- [ ] Submitted before **10:00 AM, October 10** — **once** only (PRD §15).
