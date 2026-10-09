import { useEffect, useRef, useState } from 'react';
import { supportsWebGPU, validatePhoto } from './platform';
import { Pipeline } from './pipeline/client';
import type { ScanOutput } from './workers/protocol';
import { categoryLabels } from './types';

export function App() {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState('');
  const pipeline = useRef<Pipeline>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('Preparing local tools…');
  const [result, setResult] = useState<ScanOutput>();
  useEffect(() => {
    const client = new Pipeline();
    pipeline.current = client;
    client.onProgress = setProgress;
    void client.request({ action: 'init' }).then(() => setReady(true)).catch(error => setError(error.message));
    return () => client.dispose();
  }, []);
  async function select(file?: File) {
    if (!file) return;
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    setError('');
    setBusy(true);
    try {
      const output = await pipeline.current!.request({ action: 'scan', file });
      if (photo) URL.revokeObjectURL(photo);
      setPhoto(URL.createObjectURL(output.preview));
      setResult(output);
    } catch (error) { setError(error instanceof Error ? error.message : 'Photo could not be read.'); }
    finally { setBusy(false); }
  }
  return <main className="shell">
    <header><a className="wordmark" href="/">TAKIP<span>Cover before you share.</span></a><span className="badge">On-device · 0 uploads</span></header>
    <section className="intro"><p className="eyebrow">A LITTLE COVER. A LOT MORE PRIVACY.</p><h1>Your photo.<br />Your information.<br /><em>Your choice.</em></h1><p>Cover personal details before they leave your hands. Everything happens right here, on your device.</p></section>
    <section className="panel"><h2>Start with a photo</h2><p>An ID, a receipt, or a screenshot. You decide what stays visible.</p>
      <div className="actions"><button disabled={!ready || busy} onClick={() => camera.current?.click()}>Take Photo</button><button disabled={!ready || busy} className="secondary" onClick={() => picker.current?.click()}>Choose Photo</button></div>
      <input ref={camera} aria-label="Take photo" type="file" accept="image/*" capture="environment" hidden onChange={e => select(e.target.files?.[0])} />
      <input ref={picker} aria-label="Choose photo" type="file" accept="image/*" hidden onChange={e => select(e.target.files?.[0])} />
      {error && <p role="alert">{error}</p>}
      {(!ready || busy) && <p role="status">{progress}</p>}
      {result && <p>{result.detections.length} sensitive items found. Review every detail before sharing.</p>}
      {result && <ul aria-label="Detected items">{result.detections.map(box => <li key={box.id} data-category={box.category}>{categoryLabels[box.category]}</li>)}</ul>}
      {photo && <img className="preview" src={photo} alt="Selected photo" />}
    </section>
    <footer>Photos stay in memory. No account. No uploads.<br />{supportsWebGPU() ? 'WebGPU available' : 'This device uses the standard local summary.'}</footer>
  </main>;
}
