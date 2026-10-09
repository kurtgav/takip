# TAKIP implementation plan

PRD.md is the scope. Build sequentially through PRD §13; checkpoint after every phase. All inference and image processing stay in browser workers. No accounts, storage of user content, cloud inference, or deployment without a named target.

| Phase | Requirement | Priority | Acceptance / verification |
|---|---|---|---|
| 1 | F1 Photo input | P0 | Camera capture input and file picker; reject invalid images; browser journey |
| 2 | F2 OCR | P0 | Local Tesseract words and position boxes; synthetic image in browser |
| 2–3 | F3 Sensitive detection | P0 | Every §7 format, label proximity, NER, 9+ digit safety net; unit tests and actual OCR |
| 3 | F4 Faces | P0 | Local BlazeFace, including small portrait via tiles; browser inference |
| 3 | F5 Codes | P0 | Local ZXing QR and linear barcode boxes; generated codes |
| 2,4 | F6 Permanent covering | P0 | Opaque solid rectangles, flattened canvas pixels; exported pixel assertions |
| 4 | F7 Touch-up | P0 | Toggle auto covers, draw new cover; pointer and keyboard-accessible controls |
| 4 | F8 Risk | P0 | §8.2 risk rules and exposed-category summary; unit tests |
| 4 | F9 Clean export | P0 | Canvas PNG re-encode, no original EXIF/GPS; binary/pixel browser checks |
| 5 | F10 Offline | P0 | All core assets precached before ready; reload and complete scan/export offline |
| 5 | F11 Local proof | P0 | Processing network monitor includes worker requests; actual network log agrees |
| 6 | F12 Summary | P1 | Local WebLLM, categories-only input, bounded output, truthful template fallback |
| 6 | F13 Watermark | P1 | Recipient/purpose/date, diagonal tiled live preview and export |
| 6 | F14 Share | P1 | Native file share if available, download fallback; cancelled share handled |
| 7 | F15 Document guess | P2 | Implemented local heuristic, ambiguity returns Unknown; unit/browser checks |
| 7 | F16 Presets | P2 | Implemented explicit seller/cover-all presets, preserve manual covers and reset review; unit/browser checks |
| 7 | F17 PaddleOCR | P2 | Deferred after official SDK research; no paired accuracy/device evidence to justify replacement |

## Dependencies and model candidates

React, Vite, TypeScript, Tailwind, vite-plugin-pwa/Workbox; Tesseract.js local worker/core and English LSTM data; MediaPipe tasks-vision WASM and BlazeFace short-range; Transformers.js with quantized DistilBERT NER; ZXing WASM reader; WebLLM Qwen 0.5B instruct. Exact registry versions, model revisions, source URLs, sizes and licenses are in DECISIONS.md. Models and WASM are acquired at build setup, served same-origin, and precached. Optional LLM download is separate from photo processing.

## Checks

Each phase: npm run lint, npm run typecheck, npm test, npm run build. Browser production check using isolated Playwright Chromium (DevTools MCP unavailable). Tests use generated SAMPLE content only. Benchmark only measured results; phone performance, human IDs, mall rehearsal remain explicitly unmeasured unless actually run.

## Risks and controls

- Browser worker/runtime compatibility: validate actual local WASM loading before expanding UI.
- Large downloads/cache quota: readiness gate, explicit failed initialization and retry; every committed file below 95 MB.
- OCR/NER misses: conservative pattern rules and mandatory manual review; no claim of complete detection.
- Face size: full image plus overlapping crops; measure limitations honestly.
- Counter accuracy: service worker records actual cache misses during processing, plus independent browser network recording.
- Privacy: image/OCR content memory-only; no image cache, no telemetry, categories-only summary boundary.
- Deadline: cut P2 first; preserve F1–F11. Never mark done while mandatory checks fail.
