# TAKIP verification results

Status: F1–F16 implemented and verified in the browser cases below. Latest feature-freeze run: **11/11 browser tests PASSED in 2.7 minutes**, no skips or failures; 30/30 unit tests PASSED. F17 deferred. Tests use generated SAMPLE content and a labeled synthetic person. No private IDs or real screenshots used.

## Feature-freeze rerun — 2026-10-09

- PASSED: `npm run lint`, `npm run typecheck`, `npm test` (30/30), `npm run build` (53 precache entries, 224093.40 KiB), `npm run test:browser` (11/11, 2.7 minutes). Suite duration is not phone scan latency.
- PASSED: real OCR, face/NER/code detection, review, manual covers, risk summary, watermark pixels, flattened metadata-free export, share fallback/cancellation, fresh offline reload, suspended-worker guard, update deferral and cached real Qwen inference. Offline processing request log remained empty in the browser assertions.
- PASSED: all 53 recorded assets match their byte sizes and SHA-256 hashes; every core manifest asset appears in the generated precache. Optional Qwen runtime is precached; weights remain an explicit download and pass the cached offline inference case.
- PASSED: source URL audit, repository file-size inspection (largest file 68,067,328 bytes), and fixture inspection. No real personal photo/document or private-data file found in the inspected repository files. The only raster assets are two application icons and the labeled synthetic portrait; test values are constructed in source. Common private-key/token patterns were not found in first-party text; this is not a security certification.
- PASSED: current 320px review and dark phone-width screenshots visually inspected; browser layout checks also pass. `git diff --check` passes.
- No application code change was necessary. Documentation now distinguishes current disclosures from the obsolete submission draft. Physical-device, accuracy and deployment limits below remain unchanged. Dependency audit was not rerun in this documentation-only pass; the earlier recorded audit is historical evidence.

## Executed on 2026-10-09

Environment: Windows, Node 24.16.0, npm 11.13.0, isolated Playwright Chromium 156.0.8078.4, production Vite preview at localhost. Real LLM test uses full Chromium with NVIDIA Ampere WebGPU (`shader-f16`); other tests use the headless shell. Desktop measurements are not phone benchmarks.

| Check | Result | Evidence |
|---|---|---|
| Unit tests | PASSED, 30 tests | `npm test`: PH formats, label variants, punctuation/prefix safety net, Luhn, box merge, file validation, risk, summary boundary, document guess and presets |
| Lint / types / build | PASSED, final implementation | `npm run lint`, `npm run typecheck`, `npm run build`; 53 precache entries, 224093.40 KiB |
| Dependency audit | PASSED, 0 production vulnerabilities | Final `npm audit --omit=dev`; earlier full audit also zero after scoped Node-only dependency overrides |
| Home layout / installability | PASSED | 320/390/768/1440 widths, camera/gallery controls, no horizontal overflow; Chromium installability error list empty; 192/512 PNG icons |
| Dark mode / no WebGPU | PASSED | Dark root color, no overflow, optional button disabled, standard-summary messaging; screenshot inspected |
| Local OCR | PASSED | Actual Tesseract on generated SAMPLE text; sensitive boxes found |
| Faces / QR / barcode / NER | PASSED | Real local inference on composite SAMPLE including small synthetic portrait, generated QR + Code128, unlabeled person/location |
| Review / touch-up / export | PASSED | Before/After, toggle, chip highlight, pointer rectangle, review gate, PNG download |
| Flattened cover pixels | PASSED | Exported manual-cover pixel exactly RGBA (20,40,31,255) |
| Metadata removal | PASSED | Inserted valid synthetic PNG text metadata absent in export; no eXIf/iTXt/tEXt/zTXt chunks |
| Offline reload→scan→export | PASSED after reproduced cache fix | Fresh offline reload, actual core inference and export; no HTTP(S) processing requests in independent browser log; UI 0/0 |
| Guard survives suspension | PASSED | Stop service worker via CDP, resume network, probe uncached URL; blocked and counted after restart |
| Guard during app update | PASSED | New worker candidate becomes redundant while photo is open; no asset requests; browser-owned update-script request excluded |
| Actual local LLM | PASSED | Real Qwen model initialization and inference; category-only request contract; output labeled Local model summary, max three sentences, no raw SAMPLE values |
| Cached LLM offline reload | PASSED after reproduced runtime-cache fix | Online model setup, offline reload, cached initialization and real inference; independent processing request log empty and UI counter 0/0 |
| Watermark | PASSED | Recipient/purpose/date, automatic date, preview changes, >100 changed exported pixels in otherwise blank region |
| Share branches | PASSED with browser API stubs | Unsupported share downloads flattened PNG; native branch receives one PNG; AbortError shows cancellation without success |
| Document guess / presets | PASSED | Real SAMPLE scan shows ID guess; seller action uncovers name/face and retains manual cover; Cover all restores coverage; review confirmation reset |
| Asset integrity / file limits | PASSED | All 53 manifest entries match recorded byte sizes/SHA-256; 132 non-dependency/non-output files checked, largest 68,067,328 bytes |

Earlier milestones: four Phase 4 browser tests passed in 23.3 seconds; final focused preset plus offline-cached-LLM checks passed in 31.7 seconds. These are suite durations, not scan latency. Individual scan timing appears in the UI; no phone timing is claimed.

Failures were reproduced and fixed: MediaPipe module loader, Transformers.js 4.x token classification (verified 3.8.1 fallback), Vary: Origin offline cache mismatch, WebLLM local URL suffix, and localhost WASM cache bypass. Headless-shell GPU compiler failure required the full Chromium test channel. See DECISIONS.md. Dependency diagnostics remain: MediaPipe GL warning, Node color-environment warnings, and vite-plugin-pwa's deprecated bundler option; tests/build complete successfully despite these warnings.

## Not yet measured

- ≥90% sensitive-item recall and ≤2 false covers/photo across approximately 30 independently annotated photos: NOT YET RUN. Synthetic integration cases prove specific paths, not general accuracy.
- Mid-range Android ≤8-second scan and Safari/iOS compatibility: NOT YET RUN; no physical device connected.
- Three live mall rehearsals: NOT YET RUN.
- Camera capture on physical device and native OS share sheet: NOT YET RUN.
- PaddleOCR upgrade (F17): NOT IMPLEMENTED; official SDK researched, but no paired accuracy/device evidence to establish improvement.
- Native OS sharing and physical camera are not proven by the browser API/control tests. No production deployment or live-host verification was requested or performed.

## Manual physical-device checks

1. Serve production build over HTTPS; open on target phone, wait for Ready offline and enabled camera/gallery buttons.
2. Turn on airplane mode, reload, select a labeled SAMPLE image and complete scan/review/export. Counter must remain 0 requests and 0 blocked attempts; inspect browser Network log remotely if available.
3. Check face, code and text coverage, toggle a cover, draw a signature cover, and verify no image overflow in portrait/landscape.
4. Add recipient/purpose watermark, save and inspect copy in gallery; test native Share and cancellation. On a WebGPU-capable device, load the optional model online first, then reload offline, load it from cache and verify the Local model summary label.
5. Run `eval/test-plan.md` with team-made data. Record actual misses, false covers, scan times and conditions. Do not infer results from automated tests.
