import { mkdir, readdir, copyFile, stat, writeFile, readFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const manifest = [];
async function record(destination, source) {
  const file = new URL(destination, root);
  const size = (await stat(file)).size;
  if (size >= 95_000_000) throw new Error(`${destination} exceeds repository file limit`);
  manifest.push({ path: `/${destination.replace(/^public\//, '')}`, bytes: size, sha256: createHash('sha256').update(await readFile(file)).digest('hex'), source });
}
async function copy(source, destination) {
  await mkdir(new URL('./', new URL(destination, root)), { recursive: true });
  await copyFile(new URL(source, root), new URL(destination, root));
  await record(destination, source);
}
async function download(source, destination) {
  const file = new URL(destination, root);
  await mkdir(new URL('./', file), { recursive: true });
  try { await stat(file); } catch {
    let failure;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(source);
        if (!response.ok) throw new Error(`HTTP ${response.status} ${source}`);
        const data = new Uint8Array(await response.arrayBuffer());
        if (data.length >= 95_000_000) throw new Error(`File exceeds 95 MB: ${source}`);
        await writeFile(file, data);
        failure = undefined;
        break;
      } catch (error) { failure = error; }
    }
    if (failure) throw failure;
  }
  await record(destination, source);
}

await copy('node_modules/tesseract.js/dist/worker.min.js', 'public/ocr/worker.min.js');
for (const file of await readdir(new URL('node_modules/tesseract.js-core/', root))) {
  if (/\.wasm(?:\.js)?$/.test(file)) await copy(`node_modules/tesseract.js-core/${file}`, `public/ocr/core/${file}`);
}
await download('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', 'public/ocr/eng.traineddata.gz');
for (const file of await readdir(new URL('node_modules/@mediapipe/tasks-vision/wasm/', root))) {
  await copy(`node_modules/@mediapipe/tasks-vision/wasm/${file}`, `public/vision/${file}`);
}
await download('https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', 'public/models/face.tflite');
await copy('node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', 'public/wasm/zxing_reader.wasm');
const runtimeFiles = await readdir(new URL('node_modules/onnxruntime-web/dist/', root));
for (const file of await readdir(new URL('public/wasm/', root))) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(file) && !runtimeFiles.includes(file)) await unlink(new URL(`public/wasm/${file}`, root));
}
for (const file of runtimeFiles) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(file)) {
    await copy(`node_modules/onnxruntime-web/dist/${file}`, `public/wasm/${file}`);
  }
}
const ner = 'https://huggingface.co/onnx-community/distilbert-NER-ONNX/resolve/3a19fe9404a4469d91aa3d551558a97f68872f67/';
for (const file of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.txt', 'onnx/model_quantized.onnx']) {
  await download(ner + file, 'public/models/ner/' + file);
}
for (const [packageName, licenseFile] of [['tesseract.js', 'LICENSE.md'], ['tesseract.js-core', 'LICENSE'], ['@huggingface/transformers', 'LICENSE']]) {
  await copy(`node_modules/${packageName}/${licenseFile}`, `public/licenses/${packageName.replace('/', '-')}.txt`);
}
await writeFile(new URL('public/asset-manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${manifest.length} local assets; ${(manifest.reduce((sum, item) => sum + item.bytes, 0) / 1e6).toFixed(1)} MB; largest ${(Math.max(...manifest.map(item => item.bytes)) / 1e6).toFixed(1)} MB.`);
