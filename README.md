# TAKIP

**Cover before you share.** TAKIP finds and covers sensitive details in photos on your device. Pick an ID photo, receipt, chat or payment screenshot, review automatic covers, add any missed covers, and save a flattened PNG without the original metadata. *Takip* is Filipino for “cover.”

Built for AppBuildersPH Hackathon 2026, Local AI theme. This is a browser PWA, not an identity-verification service. Automatic detection can miss details. Always review, including signatures, before sharing.

## Run

Node 24 and npm required. All committed files are below 95 MB.

```sh
npm ci
npm run assets
npm run assets:summary
npm run dev
```

Production/offline demo:

```sh
npm run build
npm run preview
```

Open `http://localhost:4173`. Wait for **Ready offline** and enabled photo buttons before switching to airplane mode. Core first-load download is approximately 230 MB, including models and runtimes. Keep the tab open during setup. Use HTTPS when serving to a phone; ordinary LAN HTTP cannot install a service worker. No deployment is included or claimed.

Optional **Download smart summary** loads approximately 290 MB from the same static host; its 4.85 MB WASM runtime is included in core setup. WebLLM caches the model assets; load the model before choosing a photo, including after an offline reload. A compatible WebGPU adapter with `shader-f16` and sufficient GPU memory is required. Unsupported devices, initialization errors and inference timeouts use the clearly labeled standard local summary.

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests launch their own production preview, so stop any other server using port 4173 first. Tests generate clearly labeled SAMPLE images; screenshots/downloads go to the OS temporary directory. `eval/private/` is ignored and must never be committed.

The real LLM browser test needs a working WebGPU device and full Playwright Chromium. Its GPU launch flags were verified on this Windows/NVIDIA test machine; software-only CI cannot prove real LLM inference. The remaining browser tests use normal headless Chromium and verify the standard-summary path.

## What runs locally

- Tesseract reads text and word positions in a Web Worker.
- MediaPipe finds faces, including smaller portraits through overlapping crops.
- Quantized DistilBERT classifies names and locations; bilingual labels and PH number rules supplement it.
- ZXing finds QR codes and linear barcodes in a worker.
- Category-based risk rules, review, solid covers, diagonal recipient/purpose/date watermark and PNG export run locally.
- Optional Qwen runs in a separate WebGPU worker. It receives only validated category identifiers, selects permitted risk/review wording, and returns at most three sentences with the actual category list. Invalid output falls back to a template. Raw OCR text, photos and watermark fields never reach the LLM.
- Share sends only the flattened PNG to the browser's native share sheet; unsupported sharing downloads it instead. Cancelling the sheet leaves the review open.
- A conservative document guess labels ID, receipt, chat or transfer clues; uncertain cases say Unknown. Explicit seller verification leaves names/faces visible while retaining manual covers; Cover all restores coverage. Neither feature reduces the original exposure risk rating.
- Canvas re-encoding discards original metadata. Covers are opaque pixels in the exported image, not removable editor layers.

Photos are decoded in memory, oriented by the browser, and limited to 2400 pixels on the longest edge. Files above 30 MB or images above 40 megapixels are rejected. Some browsers cannot decode HEIC; the error asks for JPEG/PNG. No photo, extracted text, category result, recipient or purpose is saved to browser storage. New photo discards the current image; closing the tab releases its in-memory state.

## Internet and offline behavior

Internet is needed for installing development packages and downloading assets during setup, and for the browser's first app/model load from its static host. Core model files are shipped locally and precached before photo input is enabled. The service worker serves only static build assets from that cache.

During scan and review/export, cache misses are blocked. The live counter distinguishes real application network requests from blocked attempts. It excludes browser-managed service-worker update-script checks and unrelated tabs. Update installers defer asset downloads while a photo is open. A small separate cache stores only anonymous browser-client IDs and blocked-attempt counts so protection survives service-worker suspension. It contains no photo content. Browser caches can be evicted; if initialization fails, reconnect and retry setup. Offline browser tests independently record all HTTP(S) requests during processing.

**APIs and cloud services: none at runtime for AI or image processing.** Static hosting delivers code/model bytes only. No analytics, telemetry, remote fonts, cloud inference, accounts or uploads. CSP restricts connections to the same origin.

## Models, sources and licenses

Exact installed dependency versions are pinned in `package-lock.json`; local asset URLs, sizes and SHA-256 hashes are in `public/asset-manifest.json` and `public/summary/manifest.json`.

| Job | Exact model / library | Source and license |
|---|---|---|
| OCR | Tesseract.js 7.0.0, tesseract.js-core 7.0.0, English LSTM `eng.traineddata.gz` from 4.0.0 data mirror | [Tesseract.js](https://github.com/naptha/tesseract.js), [English data](https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz), Apache-2.0 |
| Face | MediaPipe tasks-vision 1.1.0; BlazeFace short-range float16 v1, 229,746 bytes | [Google model](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite), [guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js), Apache-2.0 |
| NER | Transformers.js 3.8.1; `onnx-community/distilbert-NER-ONNX`, revision `3a19fe9404a4469d91aa3d551558a97f68872f67`, q8 `model_quantized.onnx`, 65,772,734 bytes | [ONNX conversion](https://huggingface.co/onnx-community/distilbert-NER-ONNX), [base dslim/distilbert-NER](https://huggingface.co/dslim/distilbert-NER), base model Apache-2.0; conversion card identifies base but omits license metadata |
| QR/barcode | zxing-wasm 3.1.5 local reader WASM | [ZXing WASM](https://github.com/Sec-ant/zxing-wasm), MIT wrapper; ZXing-C++ Apache-2.0 |
| Summary | WebLLM 0.2.85; `mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC`, revision `32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad`; Qwen2 0.5B q4f16_1 cs1k WebGPU WASM v0_2_84 | [MLC model](https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC), derived from [Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct), Apache-2.0 base; WebLLM Apache-2.0 |

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

F1–F16 are implemented. F17 PaddleOCR is deferred: a viable official SDK was researched, but no paired accuracy corpus or target phone is available to establish improvement over the verified Tesseract path.

Team names, public repository visibility, demo video, social-post URL and final event submission are maintained in `docs/submission.md`. Those human deliverables have not been invented or submitted by this agent.
