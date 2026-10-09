/// <reference lib="webworker" />
import { MLCEngine, type AppConfig } from '@mlc-ai/web-llm';
import { allowedSummarySentences, categoriesPayload, normalizeSummaryCategories } from '../pipeline/summary-contract.ts';

const MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
let engine: MLCEngine | undefined;

type Request = { id: number; type: 'init' } | { id: number; type: 'summarize'; categories: unknown };
const send = (message: object) => self.postMessage(message);

self.addEventListener('message', async (event: MessageEvent<Request>) => {
  const request = event.data;
  if (!request || !Number.isSafeInteger(request.id)) return;
  try {
    if (request.type === 'init') {
      if (!('gpu' in navigator)) throw new Error('Smart summary requires WebGPU on this device.');
      const origin = self.location.origin;
      const appConfig: AppConfig = { model_list: [{
        model_id: MODEL_ID,
        model: `${origin}/summary/qwen/resolve/main/`,
        model_lib: `${origin}/summary/qwen.wasm`,
      }] };
      engine = new MLCEngine({
        appConfig,
        initProgressCallback: (progress) => send({ id: request.id, type: 'progress', text: progress.text }),
      });
      await engine.reload(MODEL_ID, { context_window_size: 1024 });
      send({ id: request.id, type: 'ready' });
      return;
    }
    if (request.type !== 'summarize' || !engine) throw new Error('Smart summary is not initialized.');
    const unique = normalizeSummaryCategories(request.categories);
    if (unique.length === 0) throw new Error('Invalid summary categories.');
    const allowed = allowedSummarySentences(unique);
    const schema = JSON.stringify({
      type: 'object', additionalProperties: false,
      properties: {
        riskSentence: { type: 'string', enum: allowed.riskSentences },
        adviceSentence: { type: 'string', enum: allowed.adviceSentences },
      },
      required: ['riskSentence', 'adviceSentence'],
    });
    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'Explain category-based privacy risk in friendly plain English. Return JSON matching the schema by selecting one permitted risk sentence and one permitted review sentence. Do not add fields or categories.' },
        { role: 'user', content: categoriesPayload(unique) },
      ],
      response_format: { type: 'json_object', schema },
      temperature: 0,
      max_tokens: 96,
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error('Smart summary returned no result.');
    send({ id: request.id, type: 'result', result: JSON.parse(content) });
  } catch (error) {
    send({ id: request.id, type: 'error', error: error instanceof Error ? error.message : 'Smart summary failed.' });
  }
});
