import { useEffect, useRef, useState } from 'react';
import { supportsWebGPU, validatePhoto } from './platform';
import { Pipeline } from './pipeline/client';
import type { ScanOutput } from './workers/protocol';
import { Review } from './ui/Review';

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
  useEffect(() => {
    let current = true;
    const client = new Pipeline(); pipeline.current = client;
    client.onProgress = text => { if (current) setProgress(text); };
    void client.request({ action: 'init' }).then(() => { if (current) setReady(true); })
      .catch(error => { if (current) setError(error.message); });
    return () => { current = false; client.dispose(); };
  }, [attempt]);
  async function select(file?: File) {
    if (!file || !ready || busy) return;
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    setError(''); setBusy(true); setResult(undefined);
    try { setResult(await pipeline.current!.request({ action: 'scan', file })); }
    catch (error) { setReady(false); setError(error instanceof Error ? error.message : 'Photo could not be read.'); }
    finally { setBusy(false); }
  }
  function retry() { setError(''); setReady(false); setProgress('Preparing local tools…'); setAttempt(value => value + 1); }
  function reset() {
    setResult(undefined); setError('');
    void pipeline.current?.request({ action: 'clear' }).catch(error => setError(error.message));
  }
  const steps = ['Reading text', 'Finding faces', 'Finding QR codes and barcodes', 'Checking sensitive information'];
  const step = steps.findIndex(text => progress.startsWith(text));
  return <main className="shell">
    <header><a className="wordmark" href="/">TAKIP<span>Cover before you share.</span></a><span className="badge">On-device · 0 uploads</span></header>
    {result && pipeline.current ? <Review result={result} pipeline={pipeline.current} onReset={reset} /> : <>
      <section className="intro"><p className="eyebrow">A LITTLE COVER. A LOT MORE PRIVACY.</p><h1>Your photo.<br />Your information.<br /><em>Your choice.</em></h1><p>Cover personal details before they leave your hands. Everything happens right here, on your device.</p></section>
      <section className="panel"><h2>{busy ? 'A private check, right here.' : 'Start with a photo'}</h2>
        <p>{busy ? 'Your photo stays on this device while local tools find sensitive details.' : 'An ID, a receipt, or a screenshot. You decide what stays visible.'}</p>
        {!busy && <div className="actions"><button disabled={!ready} onClick={() => camera.current?.click()}>Take Photo</button><button disabled={!ready} className="secondary" onClick={() => picker.current?.click()}>Choose Photo</button></div>}
        {busy && <ol className="scan-steps" aria-label="Scanning progress">{steps.map((text, index) => <li key={text} className={index === step ? 'active' : index < step ? 'complete' : ''}><span>{index < step ? '✓' : index + 1}</span>{text}</li>)}</ol>}
        {(!ready || busy) && !error && <p className="setup" role="status">{progress}</p>}
        {error && <div className="notice" role="alert"><p>{error}</p>{!ready && <button className="secondary" onClick={retry}>Retry setup</button>}</div>}
        {!busy && <p className="caption">Use a clear, well-lit photo. Automatic checks can miss details; always review before sharing.</p>}
      </section>
    </>}
    <input ref={camera} aria-label="Take photo" type="file" accept="image/*" capture="environment" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <input ref={picker} aria-label="Choose photo" type="file" accept="image/*" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <footer>Photos stay in memory. No account. No uploads.<br />{supportsWebGPU() ? 'WebGPU available for optional smart summaries.' : 'This device uses the standard local summary.'}</footer>
  </main>;
}
