# TAKIP — implementation complete

All mandatory P0 F1–F11 and P1 F12–F14 implemented and verified against the executed synthetic browser cases. P2 F15/F16 also shipped. See `eval/results.md` for exact evidence and limits.

## Delivered

- Camera/gallery inputs; real local Tesseract OCR, PH pattern rules, DistilBERT NER, MediaPipe faces and ZXing QR/barcodes in workers.
- Opaque covers, before/after, manual touch-up, risk/category summary, required review, flattened metadata-free PNG.
- Installable PWA with complete core precache, offline reload/scan/export and zero processing requests. Guard survives service-worker suspension and defers update asset downloads while a photo is open.
- Real optional Qwen/WebLLM with category-only input, validated three-sentence output and honest template fallback. Cached model reload/inference works offline on tested GPU.
- Tiled recipient/purpose/date watermark and native file-share/download flow.
- Conservative document guess and explicit seller/cover-all presets that preserve manual covers.

## Actual verification

- PASSED: lint, TypeScript, 30 unit tests and production build.
- PASSED: 11 production browser tests in 2.8 minutes, no skips/failures; includes real GPU inference and independent empty HTTP(S) processing logs.
- PASSED: exact opaque exported pixels and absence of injected PNG metadata/eXIf chunks; watermark pixels and share cancellation/fallback.
- PASSED: PWA installability check, phone-width layouts and dark-mode inspection.
- PASSED: all 53 manifest assets match SHA-256/size; largest repository asset 68,067,328 bytes, below 95 MB limit; production npm audit reports zero vulnerabilities.
- Scoped independent privacy review found no new major/high issue after fixes. No security certification or universal detection guarantee claimed.

## Cut and unverified work

F17 PaddleOCR deferred. Official SDK/model path is viable, but no paired angled-photo corpus or target phone is available to prove an improvement over the tested Tesseract pipeline.

Physical camera capture, native OS share sheet, Safari/iOS, mid-range phone timing, 30-photo recall/false-cover metrics and three venue rehearsals are NOT RUN. Browser API tests do not substitute for those measurements. No production deployment, public-repository visibility verification, video/social publication or event submission performed by Codex. Orchestrator owns all commits/pushes; Codex performed none.

## Run the demo

```sh
npm ci
npm run assets
npm run assets:summary
npm run build
npm run preview
```

Open `http://localhost:4173`, wait for **Ready offline** and enabled photo buttons. Core setup is about 230 MB. For smart summaries, load the optional approximately 290 MB model on a compatible WebGPU device before selecting a photo. HTTPS is required when serving to a phone.

Switch offline, reload, select a clearly labeled SAMPLE image, inspect the 0-request counter, review/edit covers, add watermark, confirm review and save/share the flattened copy. Load the optional model from cache after reload if using it. Use no real ID in the public demo.

Run checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install chromium`, and `npm run test:browser`. Real LLM browser test requires full Chromium and a working GPU; its Windows/NVIDIA test flags and limitations are documented in README/DECISIONS.
