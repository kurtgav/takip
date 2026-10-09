# TAKIP — Submission Text (ready to paste)

> Owner: Hermes (docs) · Session 1, updated Session 2 (2026-10-09 16:46 Asia/Manila)
> Every field required by PRD §15. Paste into the Cerebral Valley event form.
> **Submit once — no edits or resubmission allowed.** Fill the `[BLANK]` fields first.

## Build status (honest — read before pasting)

As of **2026-10-09 16:46** the app is **partly built and verified** (photo input, on-device
OCR, §7 pattern rules, solid covering, face / QR-barcode / NER detection, box merge; risk
scoring implemented with unit tests). The review UI, touch-up, on-screen risk banner, export,
live network counter, local-LLM summary and watermark are **not built yet** (Phase 4 in
progress). `README.md` still does not exist, so the **authoritative** disclosure list is not
written yet. Fields 7, 9 and 10 below are filled with what I could **verify in the code and
lockfile**; when `README.md` exists, **reconcile against it** and do not submit a model the app
does not run.

---

## 1. Project name
**TAKIP** — *"Blur before you share."* (Filipino for "cover.")

## 2. Short description (paste as-is)
> TAKIP is an on-device privacy filter that automatically finds and covers ID numbers, faces,
> birthdays, addresses, and account numbers in photos before you share them. All AI runs
> locally on your phone, works in airplane mode, and your original photo never leaves your
> device.

## 3. Team members
`[BLANK — human: names, roles, and any team handle required by the form]`

## 4. Public GitHub repository
`[BLANK — human: https://github.com/<owner>/takip — must be PUBLIC before 10:00 AM Oct 10]`

## 5. Demo video (~1 minute)
`[BLANK — human: paste the video URL after recording to docs/demo-script.md Part B]`

## 6. X / LinkedIn video post URL
`[BLANK — human: paste the post URL; must tag Devin / Cognition and include #AppBuildersPH — see docs/social-post.md]`

## 7. What runs locally (verify vs the built app + README before pasting)
> Everything the app does, it does on the user's device. Text reading (Tesseract.js), face
> detection (MediaPipe), name/address recognition (Transformers.js NER), QR/barcode detection
> (ZXing-WASM), the pattern rules and the covering all run in the browser — no image, text or
> result is ever uploaded. The export (with metadata removed) and the watermark are also
> designed to run locally.

**State of the build at paste time:** OCR, faces, QR/barcode, NER, pattern rules and covering
are **implemented and verified**. The metadata-stripping export and the watermark are
**not in this build yet** — do not claim them unless they ship. The language model that writes
the risk summary is an optional extra and is **not integrated**; there is no summary card in
the app at all yet (neither LLM nor template).

## 8. What requires internet (paste as-is)
> Only the **first load** of the app and the **one-time model download**. After that the full
> core flow works in airplane mode. Nothing is uploaded at any time.

## 9. Models used (filled from the lockfile + DECISIONS.md — reconcile with README.md)

Actually integrated and running in the browser:

> - **OCR — Tesseract.js 7.0.0** (with `tesseract.js-core` 7.0.0); English language data
>   (`eng`, tessdata 4.0.0). Apache-2.0.
> - **Face detection — MediaPipe `@mediapipe/tasks-vision` 1.1.0** + BlazeFace short-range
>   float16 model (v1). Apache-2.0.
> - **NER — Transformers.js 3.8.1** + `onnx-community/distilbert-NER-ONNX` (q8), base
>   `dslim/distilbert-NER`. Apache-2.0.
> - **QR/barcode — ZXing-WASM 3.1.5** (not AI). MIT.

Chosen but **not yet integrated** (do not list as shipped unless it ships):

> - **Risk-summary LLM — WebLLM 0.2.85** + `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`.

## 10. Technologies and frameworks (verified from package.json / lockfile)

> React 19.3.0 + Vite 8.3.4 + **TypeScript 6.0.3**; `vite-plugin-pwa` 2.0.0 (Workbox) for
> offline; Tailwind CSS 4.3.3 (bundled, no runtime CDN); Tesseract.js; `@mediapipe/tasks-vision`;
> `@huggingface/transformers` (Transformers.js) with ONNX Runtime Web; `zxing-wasm`; HTML Canvas
> / OffscreenCanvas inside Web Workers; static hosting for the first load.

## 11. APIs and cloud services
> **None at runtime.** No cloud AI API, no analytics, no telemetry, no runtime CDNs or remote
> fonts. (Hosting serves the static app for the first load only; it is not called during
> processing.)

## 12. Existing code and assets
> None reused — TAKIP is a **new project created during the hackathon**. All third-party
> libraries and models are open-source and disclosed above. One generated asset is committed for
> automated tests: `tests/assets/sample-synthetic-face.png`, a **fictional** portrait produced
> with OpenAI's image tool (no real person, no government-ID design). *(If any starter template
> or other asset was used, disclose it here.)*

## 13. AI development tools (disclose — paste as-is)
> This product was **built** with AI development tools, none of which are part of the product
> at runtime:
> - **OpenAI Codex** — wrote the application code.
> - **Hermes agent on DeepSeek V4.1 Flash** — wrote the documentation, test plan, judge Q&A
>   and pitch content.
> - **An orchestrator script** — ran the agents, made checkpoints, and handled git commits
>   and pushes.
> - OpenAI's image tool generated the single **synthetic** test fixture noted in field 12.
> These tools helped build TAKIP; the shipped app uses only open-source models running on the
> user's own device.

## 14. Why does this product benefit from running AI locally? (PRD §15.6 — paste as-is)
> TAKIP protects the images people are most afraid to leak: their IDs and personal
> screenshots. A cloud tool would require uploading the very image it is meant to protect. By
> running OCR, face detection, entity recognition, and a small language model on the user's
> own device, TAKIP keeps the original private, works with no internet, responds instantly,
> and costs nothing per use.

---

## Final pre-submit checklist (PRD §15.1)
- [ ] Project name: **TAKIP**
- [ ] Short description (field 2)
- [ ] Team members — `[BLANK]` filled
- [ ] Public GitHub repo — links and is PUBLIC
- [ ] Demo video — links
- [ ] X / LinkedIn post — links, tags Devin/Cognition, includes #AppBuildersPH
- [ ] What runs locally (field 7) — matches the built app (no unbuilt feature claimed)
- [ ] What requires internet (field 8)
- [ ] Models used (field 9) — reconciled with README.md, only shipped models listed
- [ ] Technologies and frameworks (field 10) — matches the built app
- [ ] APIs and cloud services (field 11)
- [ ] Existing code and assets (field 12) — synthetic fixture disclosed
- [ ] AI development tools (field 13)
- [ ] "Why local" answer (field 14)
- [ ] Submitted **once** — no edits
