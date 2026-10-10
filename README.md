# TAKIP

**Cover before you share.** TAKIP finds and covers sensitive details in photos on your device. Pick an ID photo, receipt, chat or payment screenshot, review automatic covers, add any missed covers, and save a flattened PNG without the original metadata. *Takip* is Filipino for “cover.”

Built for AppBuildersPH Hackathon 2026, Local AI theme. This is a browser PWA, not an identity-verification service. Automatic detection can miss details. Always review, including signatures, before sharing.

## Run

Node 24 and npm required. All committed files are below 95 MB.

Dependency lifecycle scripts are disabled by the committed `.npmrc`. The app uses packaged browser runtimes and prebuilt build-tool binaries; no dependency install script is required. Explicit project commands below still run.

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

Open `http://localhost:4173`. For automatic detection, choose **Download automatic checks** while connected and wait for **Automatic checks ready offline** before disconnecting. Alternatively, choose **Use manual covers instead** to enable photo input without automatic detection or a risk rating. Photo buttons remain disabled until setup has checked saved tools and one mode is available. Total app and automatic-check assets are approximately 205 MB (network compression may reduce transfer size). Keep the tab open during downloads; status shows file count and downloaded megabytes. Use HTTPS when serving to a phone; ordinary LAN HTTP cannot install a service worker.

The interface follows the supplied TAKIP v3 mobile design, with a responsive desktop layout and system light/dark themes. Review follows **Cover → Watermark → Save**: inspect detections or draw manual covers, optionally add a recipient/purpose/date watermark, then confirm the final photo before saving or sharing. Cover toggles and **Remove** are directly visible; **Undo remove** restores the last removed box. Select an uncovered field’s label to locate its box. **Restore selected fields** reapplies the document defaults while keeping manual additions. **Back** retains edits. Changing covers or watermark fields clears the final review confirmation. Automatic-check setup appears before photo selection; smart summaries remain optional below it. Manual review offers **Close photo and set up checks**, which discards the current photo and edits before returning to setup. Fonts, illustration and icons are local, with no added external requests.

Setup times out stalled transfers rather than healthy downloads that exceed two minutes. Failed HTTP responses, storage exhaustion and installation failures show actionable errors. **Retry setup** retries the editor; **Download automatic checks** retries models. **Cancel download** stops active transfers. Retrying reuses fully cached files; interrupted files are downloaded again. Updates retain tools whose recorded revisions match the new build, downloading changed tools only when requested. Older installations without per-tool revision metadata need one fresh download; their unverified caches are removed after that download succeeds. Saved tools are checked again before opening an automatic scan, so missing files return the user to setup rather than silently selecting manual mode. Only LSTM OCR engine variants used by this app are included.

## Deploy

Live PWA: **https://kurtgav.github.io/takip/** (GitHub Pages over HTTPS — required for service worker and phone install). Source: https://github.com/kurtgav/takip.

`.github/workflows/pages.yml` verifies and republishes `dist/` on every push to `master`, and on manual *Run workflow*. Installation, dependency audit, lint, types, unit tests and core Chromium/WebKit browser tests must pass before the Pages build can deploy. Actions are pinned to reviewed commits, checkout does not retain credentials, and only the deployment job receives Pages write/OIDC permissions. The optional real-LLM test requires a compatible GPU and is verified on the release workstation; it is excluded only from the GPU-less hosted runner. No application secrets are required.

Two rules keep that deploy working:

- Model and runtime assets stay committed under `public/` (468 MB on disk, largest file under the 100 MB GitHub limit). The deploy job cannot run `npm run assets` / `npm run assets:summary`, so those files must be in Git.
- The site is served from the `/takip/` subpath, so the workflow builds with `VITE_BASE=/takip/` and every runtime asset URL goes through `assetPath()` (`src/asset.ts`, reading `import.meta.env.BASE_URL`). Local `npm run preview` builds and serves at `/`. Root-absolute paths (`/sw.js`, `/ocr/...`, `/models/...`, `/wasm/...`, `href="/"`) 404 on the deployed site — use `assetPath()` instead.

Optional **Download smart summary** loads approximately 290 MB from the same static host; its 4.85 MB WASM runtime is included in automatic-check setup. WebLLM caches the model assets; load the model before choosing a photo, including after an offline reload. A compatible WebGPU adapter with `shader-f16` and sufficient GPU memory is required. Unsupported devices, initialization errors and inference timeouts use the clearly labeled standard local summary.

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:browser
```

Browser tests launch their own production preview, so stop any other server using port 4173 first. Tests generate clearly labeled SAMPLE images; screenshots/downloads go to the OS temporary directory. `eval/private/` is ignored and must never be committed.

If a release fails live verification, revert its release commit and push to `master`; the same verification gates rebuild and redeploy the previous behavior. There is no server database or stored user-photo migration to undo. Existing tabs must close before the replacement service worker activates.

The real LLM browser test needs a working WebGPU device and full Playwright Chromium. Its GPU launch flags were verified on this Windows/NVIDIA test machine; software-only CI cannot prove real LLM inference. Core browser tests use headless Chromium and verify the standard-summary path. Production also requires offline document scans and review/export journeys to pass in WebKit on macOS. The Windows Playwright WebKit port lacks worker `OffscreenCanvas`, so it can verify layout and typing but cannot substitute for Apple-platform automatic-scan coverage. Physical iPhone testing remains separate.

## What runs locally

- Tesseract reads text and word positions in a disposable Web Worker. Small images are enlarged to a 1600-pixel longest edge for text recognition only; boxes map back to the original photo. OCR, vision, and named-entity checks run sequentially; each worker terminates before the next starts to reduce peak memory.
- MediaPipe finds faces, including smaller portraits through overlapping crops.
- Bilingual field labels and contextual number rules identify structured card details. Quantized DistilBERT runs only on free-form/unknown documents; its output is explicitly labeled **Possible name/location**, never a verified name or home address. Recognized IDs, receipts and payment cards skip generic entity inference.
- ZXing finds QR codes and linear barcodes in a worker.
- Category-based risk rules, review, solid covers, diagonal recipient/purpose/date watermark and PNG export run locally.
- Optional Qwen runs in a separate WebGPU worker. It receives only validated category identifiers, selects permitted risk/review wording, and returns at most three sentences with the actual category list. Invalid output falls back to a template. Raw OCR text, photos and watermark fields never reach the LLM.
- Share sends only the flattened PNG to the browser's native share sheet; unsupported sharing or a failed capability check downloads it instead. Cancelling the sheet leaves the review open.
- Geometry-aware labels locate full names, multiline addresses, contextual government/student/employee numbers, card credentials, dates, passport MRZ rows, and estimated signature areas. Driver’s-license defaults cover only the address, license number and licensee signature. Passport defaults cover only the passport number, issue/expiry dates, both MRZ rows together, and the right-side security print. Other detected fields remain optional. No broad central passport block is added. Estimated areas require visual review. Receipt rules distinguish merchant metadata from customer/payment details. See the official-source [redaction field matrix](docs/REDACTION_FIELDS.md) for privacy priorities and limitations.
- A conservative document guess labels ID, receipt, payment card, chat or transfer clues; uncertain cases say Unknown. Seller verification disables individual name/face covers while retaining manual and estimated-area covers, which may still hide those fields; Cover all restores coverage. Coverage changes do not lower the original exposure rating. **Remove** dismisses an incorrect detection and recalculates the assessment. Missing required fields, model suggestions, incomplete checks or poor OCR show **Needs review**; manual mode shows **Not assessed**. Payment cards always prompt review of both sides and unlabeled security codes.
- Canvas re-encoding is followed by explicit PNG metadata removal, including EXIF added by the browser encoder. Covers are opaque pixels in the exported image, not removable editor layers.

Photos are decoded in memory, oriented by the browser, and limited to 2400 pixels on the longest edge. Files above 30 MB or images above 40 megapixels are rejected. Some browsers cannot decode HEIC; the error asks for JPEG/PNG. No photo, extracted text, category result, recipient or purpose is saved to browser storage. New photo discards the current image; closing the tab releases its in-memory state.

## Internet and offline behavior

Internet is needed for installing development packages and the browser's first app/model load from its static host. The small editor shell is cached first; model downloads are optional and explicit. Manual editing/export uses HTML canvas and does not require WebGPU, OffscreenCanvas, or model initialization. Automatic checks start only after selecting a photo. Failed or cancelled checks leave manual editing available. The service worker serves only static build assets from its cache.

During scan and review/export, cache misses are blocked. The live counter distinguishes real application network requests from blocked attempts. It excludes browser-managed service-worker update-script checks and unrelated tabs. Update installers defer asset downloads while a photo is open. A small separate cache stores only anonymous browser-client IDs and blocked-attempt counts so protection survives service-worker suspension. It contains no photo content. Browser caches can be evicted; if initialization fails, reconnect and retry setup. Offline browser tests record HTTP(S) request events, including local cache reads from disposable workers, and verify that processing uses cached assets with no network transfer.

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

NER uses English CoNLL entity labels, not a purpose-trained Philippine identity model. Latin-script Filipino labels are handled with rules. PH number patterns are heuristics; ambiguous long numbers are covered conservatively. Reference numbers are initially uncovered and can be covered during review. QR codes conservatively score High without a document classifier. Unknown linear barcodes score Medium because their encoded contents have not been assessed. Receipt merchant-number suppression does not suppress separate validated contact or payment details on the same row. Risk is shown for the original image, not a guarantee that the edited copy is safe.

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

An earlier deployed build was verified over live HTTPS on October 9, 2026 at https://kurtgav.github.io/takip/ with 15 of 15 checks passing: page load, UI mounted on the subpath, no horizontal overflow, service worker controlling the page with scope `https://kurtgav.github.io/takip/`, first-load precache complete, offline reload, OCR + NER + face + QR/barcode pipelines running offline, safe-copy PNG export, and zero network requests during offline processing. That historical result does not verify the newer optional-download flow or physical iPhone compatibility.

F1–F16 are implemented. F17 PaddleOCR is deferred: a viable official SDK was researched, but no paired accuracy corpus or target phone is available to establish improvement over the verified Tesseract path.

Submission checklist (PRD §15):

- Project name: **TAKIP**. Short description: TAKIP finds and covers sensitive details in photos using on-device AI. Review automatic covers, add missed covers and a purpose watermark, then export a flattened PNG. Works offline after setup; detection can miss details.
- Team members: **NOT PROVIDED**. Add actual names and roles before submission.
- Public GitHub repository: **https://github.com/kurtgav/takip** (public; verified reachable). Live PWA demo: **https://kurtgav.github.io/takip/**. Confirm this is the URL to submit before the stated October 10, 10:00 AM deadline.
- Approximately one-minute demo video: **NOT PROVIDED**. Record the verified flow with clearly labeled SAMPLE content only.
- X / LinkedIn video post URL: **NOT PROVIDED**. Event instructions require tagging Devin / Cognition and including **#AppBuildersPH**.
- Runtime, internet requirements, models, technologies, cloud services, existing assets, AI development tools and the “why local” answer: disclosed above.
- Final submission: **NOT PERFORMED**. Verify every field, then submit **once**; PRD §15 does not allow edits or resubmission.

`docs/submission.md` is an earlier draft with obsolete build-status claims and blank human fields; do not paste it unchanged. This README and `eval/results.md` describe the verified implementation. See `ORCHESTRATOR_STABLE.md` for the final demo and phone airplane-mode procedure. No team identity, public visibility, video, social post or submission has been invented.
