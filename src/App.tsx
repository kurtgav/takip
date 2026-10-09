import { useEffect, useRef, useState } from 'react';
import { canRunSmartSummary, validatePhoto } from './platform';
import { Pipeline } from './pipeline/client';
import type { ScanOutput } from './workers/protocol';
import { Review } from './ui/Review';
import { prepareOffline, processingNetwork, type NetworkCount } from './offline';
import { SummaryEngine } from './pipeline/summary';

export function App() {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pipeline = useRef<Pipeline>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('Preparing local tools…');
  const [result, setResult] = useState<ScanOutput>();
  const [attempt, setAttempt] = useState(0);
  const [network, setNetwork] = useState<NetworkCount>({ requests: 0, blocked: 0 });
  const [summaryEngine] = useState(() => new SummaryEngine());
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartReady, setSmartReady] = useState(false);
  const [smartStatus, setSmartStatus] = useState('');
  const [gpuReady, setGpuReady] = useState(false);
  const [summary, setSummary] = useState<{ text: string; source: 'model' | 'template' }>();
  useEffect(() => () => summaryEngine.dispose(), [summaryEngine]);
  useEffect(() => { void canRunSmartSummary().then(setGpuReady); }, []);
  useEffect(() => {
    let current = true;
    let client: Pipeline | undefined;
    const count = ({ data }: MessageEvent<NetworkCount & { type: string }>) => { if (data.type === 'NETWORK_COUNT') setNetwork(data); };
    navigator.serviceWorker?.addEventListener('message', count);
    setProgress('Saving local tools for offline use. Keep this tab open…');
    void prepareOffline(text => { if (current) setProgress(text); }).then(async () => {
      if (!current) return;
      client = new Pipeline(); pipeline.current = client;
      client.onProgress = text => { if (current) setProgress(text); };
      await client.request({ action: 'init' });
      if (current) setReady(true);
    }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; client?.dispose(); navigator.serviceWorker?.removeEventListener('message', count); };
  }, [attempt]);
  async function select(file?: File) {
    if (!file || !ready || busy || smartLoading) return;
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    setError(''); setBusy(true); setResult(undefined);
    try {
      setNetwork(await processingNetwork('PROCESS_START'));
      const output = await pipeline.current!.request({ action: 'scan', file });
      setProgress('Writing summary…');
      setSummary(await summaryEngine.summarize(output.detections.map(box => box.category)));
      setSmartReady(summaryEngine.ready);
      setResult(output);
    } catch (error) {
      setReady(false); setError(error instanceof Error ? error.message : 'Photo could not be read.');
      void processingNetwork('PROCESS_END').catch(() => setError('Offline protection stopped. Reload to continue.'));
    }
    finally { setBusy(false); }
  }
  function retry() { setError(''); setReady(false); setProgress('Preparing local tools…'); setAttempt(value => value + 1); }
  function reset() {
    setResult(undefined); setError('');
    void pipeline.current?.request({ action: 'clear' }).catch(error => setError(error.message));
    void processingNetwork('PROCESS_END').catch(error => setError(error.message));
  }
  async function prepareSummary() {
    setSmartLoading(true); setSmartStatus('Preparing smart summary…');
    try { await summaryEngine.init(setSmartStatus); setSmartReady(true); setSmartStatus('Smart summary ready on this device.'); }
    catch { setSmartReady(false); setSmartStatus('Smart summary is unavailable on this device. Standard local summaries still work.'); }
    finally { setSmartLoading(false); }
  }
  const steps = ['Reading text', 'Finding faces', 'Finding QR codes and barcodes', 'Checking sensitive information', 'Writing summary'];
  const step = steps.findIndex(text => progress.startsWith(text));
  return <main className="shell">
    <header><a className="wordmark" href={import.meta.env.BASE_URL}>TAKIP<span>Cover before you share.</span></a><span className="badge">On-device · 0 uploads</span></header>
    <div className="local-status" role="status"><span>{ready ? (import.meta.env.DEV ? 'Development mode' : 'Ready offline') : 'Setting up local tools'}</span><span data-testid="network-counter" title="Application requests during this photo. Browser update checks and unrelated tabs are outside this counter.">{network.requests} network requests · {network.blocked} blocked attempts</span></div>
    {result && pipeline.current ? <Review result={result} pipeline={pipeline.current} summary={summary} onReset={reset} /> : <>
      <section className="intro"><p className="eyebrow">A LITTLE COVER. A LOT MORE PRIVACY.</p><h1>Your photo.<br />Your information.<br /><em>Your choice.</em></h1><p>Cover personal details before they leave your hands. Everything happens right here, on your device.</p></section>
      <section className="panel"><h2>{busy ? 'A private check, right here.' : 'Start with a photo'}</h2>
        <p>{busy ? 'Your photo stays on this device while local tools find sensitive details.' : 'An ID, a receipt, or a screenshot. You decide what stays visible.'}</p>
        {!busy && <div className="actions"><button disabled={!ready || smartLoading} onClick={() => camera.current?.click()}>Take Photo</button><button disabled={!ready || smartLoading} className="secondary" onClick={() => picker.current?.click()}>Choose Photo</button></div>}
        {busy && <ol className="scan-steps" aria-label="Scanning progress">{steps.map((text, index) => <li key={text} className={index === step ? 'active' : index < step ? 'complete' : ''}><span>{index < step ? '✓' : index + 1}</span>{text}</li>)}</ol>}
        {(!ready || busy) && !error && <p className="setup" role="status">{progress}</p>}
        {error && <div className="notice" role="alert"><p>{error}</p>{!ready && <button className="secondary" onClick={retry}>Retry setup</button>}</div>}
        {!busy && <p className="caption">{ready ? 'Ready for airplane mode. ' : 'One-time download of local tools (about 205 MB). '}Use a clear, well-lit photo. Automatic checks can miss details; always review before sharing.</p>}
      </section>
      {!busy && <section className="smart-summary"><h2>Optional smart summary</h2><p className="caption">A small local language model chooses a short explanation. One-time download, about 290 MB. Only detected categories reach this model.</p>
        <button className="secondary" disabled={!ready || !gpuReady || smartLoading || smartReady} onClick={() => void prepareSummary()}>{smartReady ? 'Smart summary ready' : smartLoading ? 'Preparing smart summary…' : 'Download smart summary'}</button>
        {smartStatus && <p className="caption" role="status">{smartStatus}</p>}
      </section>}
    </>}
    <input ref={camera} aria-label="Take photo" type="file" accept="image/*" capture="environment" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <input ref={picker} aria-label="Choose photo" type="file" accept="image/*" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <footer>Photos stay in memory. No account. No uploads.<br />{gpuReady ? 'WebGPU available for optional smart summaries.' : 'This device uses the standard local summary.'}</footer>
  </main>;
}
