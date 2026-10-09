# TAKIP — Submission text (ready to paste)

> Owner: Hermes (docs) · Session 1 → **Session 3 (2026-10-09 18:5x Asia/Manila)**.
> Every field required by PRD §15. Paste into the Cerebral Valley event form.
> **Submit once — no edits or resubmission allowed.** Fill the `[BLANK]` fields first.
> This file is now **reconciled with `README.md` and `eval/results.md`** (which it previously
> lagged) — every runtime/model claim below is one the built app actually makes.

## Build status (honest — read before pasting)

As of **2026-10-09 18:5x** the app is **built**: **PRD F1–F16 are implemented and verified** in
the automated suite; **F17 (PaddleOCR) is deferred**. `eval/results.md` records the latest run:
`npm run lint`, `npm run typecheck`, `npm test` (**30/30**), `npm run build` (53 precache entries),
`npm run test:browser` (**11/11, 2.7 min**) all **PASSED** — including the full
photo → scan → covers → risk summary → watermark → **flattened, metadata-free export** flow, a
fresh **offline reload**, and a processing network log at **0 requests / 0 blocked attempts**.

**Still NOT done / not measured:** the human 30-photo **accuracy set** (recall, false covers),
**mid-range-phone scan time**, **Safari/iOS**, **physical camera**, **native OS share sheet**, and
the **three venue rehearsals**. Do **not** claim those in the form; say "not yet measured" if asked.

---

## 1. Project name
**TAKIP** — *"Cover before you share."* (Filipino for *"cover"*.)

## 2. Short description (paste as-is — matches README line 3)
> TAKIP finds and covers sensitive details in photos using on-device AI. Review the automatic
> covers, add any missed covers and a purpose watermark, then export a flattened PNG with the
> original metadata removed. Works offline after setup; detection can miss details, so always
> review before sharing.

## 3. Team members
`[BLANK — human: names, roles, and any handles the form requires]`

## 4. Public GitHub repository
`[BLANK — human: https://github.com/<owner>/takip — must be PUBLIC before 10:00 AM Oct 10]`

## 5. Demo video (~1 minute)
`[BLANK — human: paste the video URL after recording per docs/demo-script.md]`

## 6. X / LinkedIn video post URL
`[BLANK — human: paste the post URL; tag Devin / Cognition and include #AppBuildersPH — see docs/social-post.md]`

## 7. What runs locally (paste as-is — matches README §"What runs locally")
> Everything the app does runs on the user's device, in the browser:
> - **Tesseract** reads text and word positions (Web Worker).
> - **MediaPipe** finds faces, including smaller ID portraits via overlapping crops.
> - **Quantized DistilBERT** classifies names and locations; bilingual labels and PH number
>   rules supplement it.
> - **ZXing** finds QR codes and linear barcodes.
> - Category-based **risk rules, review, solid covers, a diagonal recipient/purpose/date
>   watermark and a flattened PNG export** all run locally.
> - An **optional local language model** (Qwen, WebGPU) writes the risk summary from category
>   identifiers only — with a standard template fallback on unsupported devices.
> - **Share** sends only the flattened PNG to the browser's native share sheet (download if
>   unsupported). Canvas re-encoding discards original metadata (EXIF/GPS). Covers are opaque
>   pixels in the exported image, not removable layers.
> No photo, extracted text, category result, recipient or purpose is written to storage.

## 8. What requires internet (paste as-is — README §"Internet and offline behavior")
> Setup and the **first app/model load** from the static host. Core model files are shipped
> locally and precached **before photo input is enabled**, so after that the full flow works in
> **airplane mode**. During scan and export, cache misses are blocked and shown by the live
> counter. **Nothing is uploaded at any time.**

## 9. Models used (paste as-is — README §"Models, sources and licenses")
> - **OCR** — Tesseract.js 7.0.0 + tesseract.js-core 7.0.0, English LSTM data (4.0.0). Apache-2.0.
> - **Face** — MediaPipe tasks-vision 1.1.0; BlazeFace short-range float16 (v1). Apache-2.0.
> - **NER** — Transformers.js 3.8.1 + `onnx-community/distilbert-NER-ONNX` (q8; base
>   `dslim/distilbert-NER`). Apache-2.0 base.
> - **QR / barcode** — zxing-wasm 3.1.5 (MIT wrapper; ZXing-C++ Apache-2.0).
> - **Optional summary LLM** — WebLLM 0.2.85 + `mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC`
>   (derived from Qwen2.5-0.5B-Instruct; Apache-2.0 base; WebGPU only, with template fallback).

## 10. Technologies and frameworks (paste as-is — README §"Technologies")
> React 19.3.0, Vite 8.3.4, TypeScript 6.0.3, Tailwind CSS 4.3.3 (bundled), vite-plugin-pwa
> 2.0.0, Cache API / service worker, WebAssembly, OffscreenCanvas, browser file/camera input.
> Node built-in test runner (tsx) and Playwright for real browser tests. **No backend.**

## 11. APIs and cloud services
> **None at runtime** for AI or image processing (README §"Internet…"). No cloud AI API, no
> analytics, no telemetry, no runtime CDNs or remote fonts. Static hosting delivers code and
> model bytes only, for the first load. CSP restricts connections to the same origin.

## 12. Existing code and assets (paste as-is — README §"Technologies and existing assets")
> **None reused** — TAKIP is a new project created in this repository during the build.
> Third-party libraries, model weights and WASM binaries are existing open-source assets,
> disclosed in field 9. System fonts only. The TAKIP SVG icon is project-created. One generated
> fixture is committed for tests: `tests/assets/sample-synthetic-face.png` — a **fictional**
> portrait made with OpenAI's built-in image tool, carrying prominent SAMPLE labeling and not a
> real person or government-ID design. Test QR/barcodes are generated by the installed ZXing
> writer.

## 13. AI development tools (disclose — paste as-is — README §"AI development tools")
> This product was **built** with AI development tools; none performs runtime inference for users:
> - **OpenAI Codex** — implementation, research and automated verification.
> - **Hermes agent on DeepSeek V4.1 Flash** — content, testing and documentation
>   (`docs/HERMES_NOTES.md`).
> - **The repository's orchestrator script** — coordinates sessions and owns commits/pushes.
> - OpenAI's built-in image generation created only the synthetic test portrait (field 12).

## 14. Why does this product benefit from running AI locally? (PRD §15.6 — paste as-is)
> TAKIP protects the images people are most afraid to leak: their IDs and personal screenshots.
> A cloud tool would require uploading the very image it is meant to protect. By running OCR,
> face detection, entity recognition, and a small language model on the user's own device, TAKIP
> keeps the original private, works with no internet, responds instantly, and costs nothing per
> use.

---

## Final pre-submit checklist (PRD §15.1)
- [ ] Project name: **TAKIP**
- [ ] Short description (field 2)
- [ ] Team members — `[BLANK]` filled
- [ ] Public GitHub repo — links and is PUBLIC before 10:00 AM Oct 10
- [ ] Demo video — links (recorded per `docs/demo-script.md`, SAMPLE content only)
- [ ] X / LinkedIn post — links, tags Devin/Cognition, includes **#AppBuildersPH**
- [ ] What runs locally (field 7) — matches the built app
- [ ] What requires internet (field 8)
- [ ] Models used (field 9) — matches README (only shipped models listed)
- [ ] Technologies (field 10) — matches the built app
- [ ] APIs / cloud services (field 11)
- [ ] Existing code and assets (field 12) — synthetic fixture disclosed
- [ ] AI development tools (field 13)
- [ ] "Why local" answer (field 14)
- [ ] No recall / scan-time / phone / Safari / rehearsal claim made unless measured
- [ ] Submitted **once** — no edits
