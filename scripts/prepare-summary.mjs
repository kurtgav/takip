import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const revision = '32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad';
const modelBase = `https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/${revision}/`;
const files = [
  'mlc-chat-config.json', 'ndarray-cache.json', 'tensor-cache.json',
  'tokenizer.json', 'tokenizer_config.json', 'vocab.json', 'merges.txt',
  ...Array.from({ length: 8 }, (_, index) => `params_shard_${index}.bin`),
];
const assets = files.map((file) => ({ source: modelBase + file, destination: `public/summary/qwen/${file}` }));
assets.push({
  source: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',
  destination: 'public/summary/qwen.wasm',
});

async function download({ source, destination }) {
  const target = new URL(destination, root);
  await mkdir(new URL('./', target), { recursive: true });
  try { await stat(target); } catch {
    let failure;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(source);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${source}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length >= 95_000_000) throw new Error(`File is 95 MB or larger: ${source}`);
        await writeFile(target, bytes);
        failure = undefined;
        break;
      } catch (error) { failure = error; }
    }
    if (failure) throw failure;
  }
  const data = await readFile(target);
  if (data.length >= 95_000_000) throw new Error(`Existing file is 95 MB or larger: ${destination}`);
  return { path: `/${destination.replace(/^public\//, '')}`, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), source };
}

const manifest = [];
for (const asset of assets) manifest.push(await download(asset));
await writeFile(new URL('public/summary/manifest.json', root), JSON.stringify({ model: 'mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC', revision, files: manifest }, null, 2) + '\n');
console.log(`Prepared ${manifest.length} summary assets (${(manifest.reduce((sum, file) => sum + file.bytes, 0) / 1e6).toFixed(1)} MB).`);
