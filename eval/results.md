# TAKIP verification results

Status: implementation underway; no completion claim. Tests use generated SAMPLE content and a labeled synthetic person. No private IDs or real screenshots used.

## Executed on 2026-10-09

Environment: Windows, Node 24.16.0, npm 11.13.0, isolated Playwright Chromium 156.0.8078.4, production Vite preview at localhost. Desktop measurements are not phone benchmarks.

| Check | Result | Evidence |
|---|---|---|
| Unit tests | PASSED, 21 tests | `npm test`: PH formats, label variants, punctuation/prefix safety net, Luhn, box merge, file validation, PRD risk combinations, safe templates |
| Lint / types / build | PASSED at Phase 4 | npm scripts; rerun after subsequent changes |
| Dependency audit | PASSED, 0 vulnerabilities | npm audit after scoped Node-only dependency overrides |
| Home layout | PASSED | 320/390/768/1440 widths, camera/gallery controls, no horizontal overflow |
| Local OCR | PASSED | Actual Tesseract on generated SAMPLE text; sensitive boxes found |
| Faces / QR / barcode / NER | PASSED | Real local inference on composite SAMPLE including small synthetic portrait, generated QR + Code128, unlabeled person/location |
| Review / touch-up / export | PASSED | Before/After, toggle, chip highlight, pointer rectangle, review gate, PNG download |
| Flattened cover pixels | PASSED | Exported manual-cover pixel exactly RGBA (20,40,31,255) |
| Metadata removal | PASSED | Inserted valid synthetic PNG text metadata absent in export; no eXIf/iTXt/tEXt/zTXt chunks |
| Offline reload→scan→export | PASSED after reproduced cache fix | Fresh offline reload, actual core inference and export; no HTTP(S) processing requests in independent browser log; UI 0/0 |
| Guard survives suspension | PASSED | Stop service worker via CDP, resume network, probe uncached URL; blocked and counted after restart |

The four Phase 4 browser tests passed in 23.3 seconds in one run. This is suite duration, not scan latency. Individual scan timing appears in the UI; no phone timing is claimed.

## Not yet measured

- ≥90% sensitive-item recall and ≤2 false covers/photo across approximately 30 independently annotated photos: NOT YET RUN. Synthetic integration cases prove specific paths, not general accuracy.
- Mid-range Android ≤8-second scan and Safari/iOS compatibility: NOT YET RUN; no physical device connected.
- Three live mall rehearsals: NOT YET RUN.
- Camera capture on physical device and native OS share sheet: NOT YET RUN.
- Local LLM, watermark, native share: Phase 6 pending.

## Manual physical-device checks

1. Serve production build over HTTPS; open on target phone, wait for Ready offline and enabled camera/gallery buttons.
2. Turn on airplane mode, reload, select a labeled SAMPLE image and complete scan/review/export. Counter must remain 0 requests and 0 blocked attempts; inspect browser Network log remotely if available.
3. Check face, code and text coverage, toggle a cover, draw a signature cover, and verify no image overflow in portrait/landscape.
4. Add recipient/purpose watermark when Phase 6 is available, save and inspect copy in gallery; test native Share and cancellation.
5. Run `eval/test-plan.md` with team-made data. Record actual misses, false covers, scan times and conditions. Do not infer results from automated tests.
