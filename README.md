# TAKIP

**Cover before you share.** TAKIP finds and covers sensitive details in photos on your device. Pick an ID photo, receipt, chat or payment screenshot, review automatic covers, add any missed covers, and save a flattened PNG without the original metadata. *Takip* is Filipino for “cover.”

Built for AppBuildersPH Hackathon 2026, Local AI theme. This is a browser PWA, not an identity-verification service. Automatic detection can miss details. Always review, including signatures, before sharing.

## Run

Node 24 and npm required. All committed files are below 95 MB.

```sh
npm ci
npm run assets
npm run dev
```

Production/offline demo:

```sh
npm run build
npm run preview
```

Open `http://localhost:4173`. Wait for **Ready offline** and enabled photo buttons before switching to airplane mode. Core first-load download is approximately 220 MB, including models and runtimes. Keep the tab open during setup. Use HTTPS when serving to a phone; ordinary LAN HTTP cannot install a service worker. No deployment is included or claimed.

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests launch their own production preview, so stop any other server using port 4173 first. Tests generate clearly labeled SAMPLE images; screenshots/downloads go to the OS temporary directory. `eval/private/` is ignored and must never be committed.

## What runs locally

- Tesseract reads text and word positions in a Web Worker.
- MediaPipe finds faces, including smaller portraits through overlapping crops.
- Quantized DistilBERT classifies names and locations; bilingual labels and PH number rules supplement it.
- ZXing finds QR codes and linear barcodes in a worker.
- Category-based risk rules, review, solid covers, watermark rendering primitives, and PNG export run locally.
- Canvas re-encoding discards original metadata. Covers are opaque pixels in the exported image, not removable editor layers.

Photos are decoded in memory, oriented by the browser, and limited to 2400 pixels on the longest edge. Files above 30 MB or images above 40 megapixels are rejected. Some browsers cannot decode HEIC; the error asks for JPEG/PNG. No photo, extracted text, category result, recipient or purpose is saved to browser storage. New photo discards the current image; closing the tab releases its in-memory state.

## Internet and offline behavior

Internet is needed for installing development packages and downloading assets during setup, and for the browser's first app/model load from its static host. Core model files are shipped locally and precached before photo input is enabled. The service worker serves only static build assets from that cache.

During scan and review/export, cache misses are blocked. The live counter distinguishes real network requests from blocked attempts. A small separate cache stores only anonymous browser-client IDs and blocked-attempt counts so protection survives service-worker suspension. It contains no photo content. Browser caches can be evicted; if initialization fails, reconnect and retry setup. Offline browser tests independently record all HTTP(S) requests during processing.

**APIs and cloud services: none at runtime for AI or image processing.** Static hosting delivers code/model bytes only. No analytics, telemetry, remote fonts, cloud inference, accounts or uploads. CSP restricts connections to the same origin.

## Models, sources and licenses

Exact installed dependency versions are pinned in `package-lock.json`; local asset URLs, sizes and SHA-256 hashes are in `public/asset-manifest.json`.

| Job | Exact model / library | Source and license |
|---|---|---|
| OCR | Tesseract.js 7.0.0, tesseract.js-core 7.0.0, English LSTM `eng.traineddata.gz` from 4.0.0 data mirror | [Tesseract.js](https://github.com/naptha/tesseract.js), [English data](https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz), Apache-2.0 |
| Face | MediaPipe tasks-vision 1.1.0; BlazeFace short-range float16 v1, 229,746 bytes | [Google model](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite), [guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js), Apache-2.0 |
| NER | Transformers.js 3.8.1; `onnx-community/distilbert-NER-ONNX`, revision `3a19fe9404a4469d91aa3d551558a97f68872f67`, q8 `model_quantized.onnx`, 65,772,734 bytes | [ONNX conversion](https://huggingface.co/onnx-community/distilbert-NER-ONNX), [base dslim/distilbert-NER](https://huggingface.co/dslim/distilbert-NER), base model Apache-2.0; conversion card identifies base but omits license metadata |
| QR/barcode | zxing-wasm 3.1.5 local reader WASM | [ZXing WASM](https://github.com/Sec-ant/zxing-wasm), MIT wrapper; ZXing-C++ Apache-2.0 |
| Summary (planned Phase 6) | WebLLM 0.2.85; Qwen2.5-0.5B-Instruct-q4f16_1-MLC | [MLC model](https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC), derived from [Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct), Apache-2.0 base; integration pending |

NER uses English CoNLL entity labels, not a purpose-trained Philippine identity model. Latin-script Filipino labels are handled with rules. PH number patterns are heuristics; ambiguous long numbers are covered conservatively. Reference numbers are initially uncovered and can be covered during review. QR codes conservatively score High without a document classifier. Risk is shown for the original image, not a guarantee that the edited copy is safe.

Transformers.js 4.3.1 failed actual browser token classification; 3.8.1 is the verified fallback. Its unused Node-only sharp and onnxruntime-node dependencies are overridden to patched versions. See `DECISIONS.md` for reproduced failures and choices.

## Technologies and existing assets

React 19.3.0, Vite 8.3.4, TypeScript 6.0.3, Tailwind CSS 4.3.3 (bundled), vite-plugin-pwa 2.0.0, Cache API/service worker, WebAssembly, OffscreenCanvas, browser file/camera input. Node built-in test runner with tsx; Playwright for real browser tests. No backend.

Application code was created in this repository during the build. Third-party libraries, model weights and WASM binaries listed above are existing open-source assets. System fonts only. The TAKIP SVG icon is project-created. `tests/assets/sample-synthetic-face.png` was generated with OpenAI's built-in image tool, contains a fictional person and prominent SAMPLE labeling, and is not used as shipped inference output. Test QR/barcodes are generated by the installed ZXing writer.

## AI development tools

OpenAI Codex: implementation, research and automated verification. Hermes agent on DeepSeek V4.1 Flash: content/testing documentation as recorded in `docs/HERMES_NOTES.md`. The repository's orchestrator script coordinates sessions and owns commits/pushes. These tools build the app; none performs runtime inference for users. Built-in OpenAI image generation created only the synthetic test portrait.

## Why local AI?

TAKIP protects photos people are afraid to leak. Uploading an ID or personal screenshot to redact it would expose the very data being protected. Local OCR, face detection and NER keep those pixels and words on the device, allow offline use after setup, and require no per-image AI service. Local performance depends on device capability; the app does not claim instant or perfect detection.

## Verification and submission status

`eval/results.md` records only executed results, failures and unmeasured metrics. Physical phone performance, Safari, human accuracy set and venue rehearsals are not yet verified. PRD and acceptance mapping: `PRD.md`, `IMPLEMENTATION_PLAN.md`; current progress: `PROGRESS.md`.

Team names, public repository visibility, demo video, social-post URL and final event submission are maintained in `docs/submission.md`. Those human deliverables have not been invented or submitted by this agent.
