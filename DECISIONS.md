# Decisions and verified dependencies

## 2026-10-09 — initial inspection

- Repository starts with PRD and orchestration/content documents; no application or package configuration. Branch master. Existing ORCHESTRATOR_STATUS.md changes belong to orchestrator and remain untouched.
- PRD read completely. Use npm/Node 24.16.0 (npm 11.13.0 installed). Implement on existing branch; all Git mutations reserved for orchestrator.
- Codegraph/context-mode and Chrome DevTools MCP are unavailable in tool inventory. Use targeted file searches and isolated Playwright production tests.
- Solid opaque covers are the single rendering style: simplest irreversible export satisfying F6. Reference numbers detected but initially uncovered, per §7 optional-cover rule.
- English OCR first; Filipino label rules work with Latin-script OCR. Additional trained language data depends on verified availability and benefit.
- Scope acceptance means tested supported examples, not guaranteed recognition of every possible photo. Manual review always required.

## Verified package/model choices

- npm install succeeded with React 19.3.0, Vite 8.3.4, TypeScript 7.0.2, Tailwind 4.3.3, vite-plugin-pwa 2.0.0. Exact dependencies are pinned in package-lock.json.
- Tesseract.js 7.0.0 resolves tesseract.js-core 7.0.0 (registry `latest` for core misleadingly points to 6.1.2). Both install successfully. Copy every core loader/WASM variant plus local worker. English data from https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz; Filipino exists at the same path but English plus bilingual label rules minimizes core download. Apache-2.0.
- MediaPipe tasks-vision 1.1.0, local WASM and pinned BlazeFace short-range float16 version 1 (229,746 bytes): https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite. Apache-2.0. CPU worker inference; tile small portraits.
- Transformers.js 4.3.1. Rejected TinyBERT-finetuned-NER-ONNX: no license and opaque LABEL_0 labels. Use onnx-community/distilbert-NER-ONNX revision `3a19fe9404a4469d91aa3d551558a97f68872f67`, q8 model 65,772,734 bytes. Upstream dslim/distilbert-NER declares Apache-2.0; conversion card identifies that base but omits license metadata. Preserve base attribution. Verified actual token-classification inference and PER/LOC mapping. English CoNLL model; label rules supplement Filipino names/addresses.
- ZXing WASM 3.1.5 reader (966,895 bytes), MIT. Always local worker-based ZXing; this also supports browsers without BarcodeDetector and avoids implementation-specific barcode format gaps.
- WebLLM 0.2.85, optional Qwen2.5-0.5B-Instruct-q4f16_1-MLC revision `32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad`, derived from Apache-2.0 Qwen2.5-0.5B-Instruct. About 290 MB plus 4.85 MB runtime; requires WebGPU, ~945 MB VRAM. Every shard under 95 MB. Optional first download before processing, template fallback otherwise.
- Sources verified using npm registry, package code/types, official Tesseract local-install docs, Google Face Detector docs, Hugging Face model APIs/cards, ZXing README, and WebLLM source/config. All heavy core models load locally with remote loading disabled.

## Phase 3 runtime findings and fallbacks

- MediaPipe's default classic WASM loader fails in a module worker (`ModuleFactory not set`). Fixed using supported `FilesetResolver.forVisionTasks(path, true)` ES-module loader. Actual synthetic small-portrait inference passed.
- Transformers.js 4.3.1 browser initialization first required explicit `allowLocalModels=true`, then token classification failed with `this.tokenizer is not a function`. Fallback to 3.8.1 succeeded in the real browser, including PER and LOC inference. This is the shipped runtime version. WASM files copied from its exact resolved onnxruntime-web package.
- 3.8.1 brings old Node-only sharp/onnxruntime-node dependencies. npm audit reported 6 findings in these server-side dependencies (not bundled into browser). Override to patched sharp 0.35.5 and onnxruntime-node 1.30.0; verify install/audit/build after override. No Node inference path is used by TAKIP.
- All QR codes conservatively score High: PRD ties QR risk to an ID but P2 document classification is not implemented. Unknown long numbers score Medium. Multiple minor exposed categories score Medium. These choices favor review instead of a misleading Low label.
- Synthetic face fixture generated with built-in OpenAI image_gen without reference photos; no real identity or government design. Saved `tests/assets/sample-synthetic-face.png`, SHA-256 `831872d94e751b322d705e31d9395467611b75226b02abdb334027148a0e0c0f`. Prompt: fictional frontal adult portrait, even studio light, plain background, separate prominent “SAMPLE — SYNTHETIC PERSON” footer; no real-person reference, official design, numbers, seals, logos or signatures. Fixture verified visually, copied unchanged.
- Installed TypeScript is 6.0.3 per package-lock.json (initial registry latest lookup reported 7.0.2; actual installed/verified configuration takes precedence).
