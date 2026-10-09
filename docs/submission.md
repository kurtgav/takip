# TAKIP — Submission Text (ready to paste)

> Owner: Hermes (docs) · First written: 2026-10-09 16:2x Asia/Manila · Session 1
> Every field required by PRD §15. Paste into the Cerebral Valley event form.
> **Submit once — no edits or resubmission allowed.** Fill the `[BLANK]` fields first.

## Build status (honest — read before pasting)

As of **2026-10-09 16:2x** the app is **not built yet** and `README.md` does not exist (see
`docs/HERMES_NOTES.md`). The **models / technologies / APIs** lists below are the PRD §8–11
plan. **Before submitting, replace them with the exact list from `README.md`**, which is the
authoritative disclosure of what actually shipped. Do not submit a model the app doesn't run.

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

## 7. What runs locally (paste as-is, verify vs README)
> **Everything.** OCR (Tesseract.js), face detection (MediaPipe), named-entity recognition
> (Transformers.js), the risk-summary language model (WebLLM), QR/barcode detection,
> pattern rules, covering, watermarking and export all run in the browser on the user's
> device. No image, text or result is ever uploaded.

## 8. What requires internet (paste as-is)
> Only the **first load** of the app and the **one-time model download**. After that the full
> core flow works in airplane mode. Nothing is uploaded at any time.

## 9. Models used
`[BLANK — human: copy the exact model names/versions/sources/licenses from README.md]`
PRD §8 plan (verify before use):
> - OCR — **Tesseract.js** (LSTM OCR), `eng` (+ `fil` if available), bundled locally
> - Face detection — **MediaPipe Face Detector** (`@mediapipe/tasks-vision`, BlazeFace short-range)
> - NER — a **quantized BERT-base NER model via Transformers.js** (ONNX)
> - Risk summary — a small **0.5–1.5B instruct LLM via WebLLM** (4-bit), with a template fallback
> - QR/barcode — `BarcodeDetector` API, fallback `jsQR` / `zxing-wasm` (not AI)

## 10. Technologies and frameworks
`[BLANK — human: confirm against README.md]` PRD §11 plan:
> React + Vite + TypeScript; `vite-plugin-pwa` (Workbox) for offline; Tesseract.js;
> `@mediapipe/tasks-vision`; `@huggingface/transformers` (Transformers.js);
> `@mlc-ai/web-llm`; HTML Canvas / OffscreenCanvas in Web Workers; Tailwind CSS (bundled, no
> runtime CDN); static hosting for the first load.

## 11. APIs and cloud services
> **None at runtime.** No cloud AI API, no analytics, no telemetry, no runtime CDNs or remote
> fonts. (Hosting serves the static app for the first load only; it is not called during
> processing.)

## 12. Existing code and assets
> None reused — TAKIP is a **new project created during the hackathon**. All third-party
> libraries and models are open-source and disclosed above. *(If any starter template or
> asset was used, disclose it here.)*

## 13. AI development tools (disclose — paste as-is)
> This product was **built** with AI development tools, none of which are part of the product
> at runtime:
> - **OpenAI Codex** — wrote the application code.
> - **Hermes agent on DeepSeek V4.1 Flash** — wrote the documentation, test plan, judge Q&A
>   and pitch content.
> - **An orchestrator script** — ran the agents, made checkpoints, and handled git commits
>   and pushes.
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
- [ ] What runs locally (field 7) — matches the built app
- [ ] What requires internet (field 8)
- [ ] Models used (field 9) — copied exactly from README.md
- [ ] Technologies and frameworks (field 10) — matches the built app
- [ ] APIs and cloud services (field 11)
- [ ] Existing code and assets (field 12)
- [ ] AI development tools (field 13)
- [ ] "Why local" answer (field 14)
- [ ] Submitted **once** — no edits
