import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedSummarySentences, categoriesPayload, normalizeSummaryCategories, renderModelSummary, SummaryEngine } from '../src/pipeline/summary.ts';

test('validates, deduplicates, and removes manual categories', () => {
  assert.deepEqual(normalizeSummaryCategories(['phone', 'manual', 'phone']), ['phone']);
  assert.throws(() => normalizeSummaryCategories(['phone', 'raw_text']), /known category/);
  assert.throws(() => normalizeSummaryCategories('phone'), /known category/);
});

test('accepts only the constrained result matching input risk', () => {
  const allowed = allowedSummarySentences(['full_name', 'birthday']);
  const valid = { riskSentence: allowed.riskSentences[1], adviceSentence: allowed.adviceSentences[0] };
  const text = renderModelSummary(['full_name', 'birthday'], valid);
  assert.match(text!, /^Detected: Full name and Birthday\./);
  assert.equal(renderModelSummary(['phone'], valid), null);
  assert.equal(renderModelSummary(['full_name', 'birthday'], { ...valid, extra: 'no' }), null);
  assert.equal(renderModelSummary(['full_name', 'birthday'], { ...valid, adviceSentence: 'Share it now.' }), null);
  assert.equal(renderModelSummary(['raw_text' as never], valid), null);
  assert.doesNotMatch(text!, /Address|Account number|QR code/);
  assert.ok(text!.split(/[.!?](?:\s|$)/).filter(Boolean).length <= 3);
});

test('category payload contains only the validated category array', () => {
  assert.equal(categoriesPayload(normalizeSummaryCategories(['email', 'email', 'manual'])), '["email"]');
});

test('zero/manual input uses bounded template fallback', async () => {
  const result = await new SummaryEngine().summarize(['manual', 'manual']);
  assert.equal(result.source, 'template');
  assert.match(result.text, /Nothing sensitive was detected/);
  assert.ok(result.text.split(/[.!?](?:\s|$)/).filter(Boolean).length <= 3);
});

test('model summary request serializes categories only', async () => {
  const originalWorker = globalThis.Worker;
  const originalNavigator = globalThis.navigator;
  const messages: unknown[] = [];
  class FakeWorker extends EventTarget {
    postMessage(message: unknown) {
      messages.push(message);
      const request = message as { id: number; type: string };
      const data = request.type === 'init'
        ? { id: request.id, type: 'ready' }
        : { id: request.id, type: 'result', result: {
          riskSentence: allowedSummarySentences(['phone']).riskSentences[0],
          adviceSentence: allowedSummarySentences(['phone']).adviceSentences[0],
        } };
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data })));
    }
    terminate() {}
  }
  Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
  Object.defineProperty(globalThis, 'navigator', { value: { gpu: { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) } }, configurable: true });
  try {
    const engine = new SummaryEngine();
    await engine.init(() => {});
    const result = await engine.summarize(['phone', 'phone', 'manual']);
    assert.equal(result.source, 'model');
    assert.deepEqual(messages[1], { id: 2, type: 'summarize', categories: ['phone'] });
    assert.equal(JSON.stringify(messages[1]).includes('recipient'), false);
    engine.dispose();
  } finally {
    Object.defineProperty(globalThis, 'Worker', { value: originalWorker, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
  }
});
