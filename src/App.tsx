import { useEffect, useRef, useState } from 'react';
import { canRunSmartSummary, validatePhoto } from './platform';
import { Pipeline } from './pipeline/client';
import type { ScanOutput } from './workers/protocol';
import { Review } from './ui/Review';
import { prepareOffline, processingNetwork, toolsReady, downloadTools, cancelTools, type NetworkCount } from './offline';
import { SummaryEngine } from './pipeline/summary';
import { LocalPhoto } from './render/photo';

export function App() {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pipeline = useRef<Pipeline>(null);
  const photo = useRef<LocalPhoto>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('Saving the offline editor…');
  const [result, setResult] = useState<ScanOutput>();
  const [attempt, setAttempt] = useState(0);
  const [network, setNetwork] = useState<NetworkCount>({ requests: 0, blocked: 0 });
  const [summaryEngine] = useState(() => new SummaryEngine());
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartReady, setSmartReady] = useState(false);
  const [smartStatus, setSmartStatus] = useState('');
  const [gpuReady, setGpuReady] = useState(false);
  const [summary, setSummary] = useState<{ text: string; source: 'model' | 'template' }>();
  useEffect(() => () => { summaryEngine.dispose(); pipeline.current?.dispose(); photo.current?.dispose(); }, [summaryEngine]);
  useEffect(() => { void canRunSmartSummary().then(setGpuReady); }, []);
  useEffect(() => {
    let current = true;
    const count = ({ data }: MessageEvent<NetworkCount & { type: string }>) => { if (data.type === 'NETWORK_COUNT') setNetwork(data); };
    navigator.serviceWorker?.addEventListener('message', count);
    void prepareOffline(text => { if (current) setProgress(text); }).then(async () => {
      if (!current) return;
      setReady(true);
      const available = await toolsReady();
      if (current) setAutomatic(available);
    }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; navigator.serviceWorker?.removeEventListener('message', count); };
  }, [attempt]);
  async function select(file?: File) {
    if (!file || !ready || busy || downloading || smartLoading) return;
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    setError(''); setBusy(true); setResult(undefined); setSummary(undefined); setProgress('Opening your photo…');
    try {
      setNetwork(await processingNetwork('PROCESS_START'));
      const local = await LocalPhoto.open(file); photo.current = local;
      let output: ScanOutput = {
        width: local.width, height: local.height, original: local.original, preview: local.original,
        detections: [], elapsedMs: 0, documentGuess: 'Unknown', analysisStatus: 'manual',
        warnings: ['Manual mode: no automatic checks ran. Add covers over every detail you want to hide.'],
      };
      if (automatic) {
        let client: Pipeline | undefined;
        try {
          client = new Pipeline(); pipeline.current = client; client.onProgress = setProgress;
          const scan = await client.request({ action: 'scan', file: local.original, width: local.width, height: local.height });
          output = { ...scan, original: local.original, preview: local.original };
        } catch {
          output.warnings = ['Automatic checks stopped. Your photo is still here; use Add cover to hide details manually.'];
        } finally { client?.dispose(); pipeline.current = null; }
      }
      if (output.analysisStatus === 'complete') setSummary(await summaryEngine.summarize(output.detections.map(box => box.category)));
      setSmartReady(summaryEngine.ready); setResult(output);
    } catch (error) {
      photo.current?.dispose(); photo.current = null;
      setError(error instanceof Error ? error.message : 'Photo could not be read. Try a JPEG or PNG.');
      await processingNetwork('PROCESS_END').catch(() => { setReady(false); setError('Offline protection stopped. Reload to continue.'); });
    } finally { setBusy(false); }
  }
  function retry() { setError(''); setReady(false); setProgress('Saving the offline editor…'); setAttempt(value => value + 1); }
  async function reset() {
    setResult(undefined); setError(''); setBusy(true); photo.current?.dispose(); photo.current = null;
    try { await processingNetwork('PROCESS_END'); }
    catch (error) { setReady(false); setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function prepareTools() {
    setDownloading(true); setError(''); setProgress('Checking saved automatic checks…');
    try { await downloadTools(setProgress); setAutomatic(true); }
    catch (error) { setError((error as Error).message); }
    finally { setDownloading(false); }
  }
  async function stopDownload() {
    try { await cancelTools(); }
    catch (error) { setError((error as Error).message); }
  }
  async function prepareSummary() {
    setSmartLoading(true); setSmartStatus('Preparing smart summary…');
    try { await summaryEngine.init(setSmartStatus); setSmartReady(true); setSmartStatus('Smart summary ready on this device.'); }
    catch { setSmartReady(false); setSmartStatus('Smart summary is unavailable on this device. Standard local summaries still work.'); }
    finally { setSmartLoading(false); }
  }
  return <main className="shell">
    <header><a className="wordmark" href={import.meta.env.BASE_URL}>TAKIP<span>Cover before you share.</span></a><span className="badge">On-device · 0 uploads</span></header>
    <div className="local-status" role="status"><span>{ready ? (automatic ? 'Editor and checks ready offline' : 'Manual editor ready offline') : 'Saving offline editor'}</span><span data-testid="network-counter" title="Application requests during this photo. Browser update checks and unrelated tabs are outside this counter.">{network.requests} network requests · {network.blocked} blocked attempts</span></div>
    {result && photo.current ? <Review result={result} photo={photo.current} summary={summary} onReset={() => void reset()} /> : <>
      <section className="intro"><p className="eyebrow">A LITTLE COVER. A LOT MORE PRIVACY.</p><h1>Your photo.<br />Your information.<br /><em>Your choice.</em></h1><p>Cover personal details before they leave your hands. Everything happens right here, on your device.</p></section>
      <section className="panel"><h2>{busy ? 'A private check, right here.' : 'Start with a photo'}</h2>
        <p>{busy ? 'Your photo stays on this device.' : 'An ID, a receipt, or a screenshot. You decide what stays visible.'}</p>
        {!busy && <div className="actions"><button disabled={!ready || downloading || smartLoading} onClick={() => camera.current?.click()}>Take Photo</button><button disabled={!ready || downloading || smartLoading} className="secondary" onClick={() => picker.current?.click()}>Choose Photo</button></div>}
        {(!ready || busy || downloading) && <p className="setup" role="status">{progress}</p>}
        {busy && pipeline.current && <button className="secondary" onClick={() => pipeline.current?.dispose()}>Continue with manual covers</button>}
        {error && <div className="notice" role="alert"><p>{error}</p>{!ready && <button className="secondary" onClick={retry}>Retry setup</button>}</div>}
        {!busy && <p className="caption">{automatic ? 'Automatic checks can miss details. ' : 'Manual covers work without downloading automatic checks. '}Always review the entire photo before sharing.</p>}
      </section>
      {!busy && <section className="smart-summary"><h2>Automatic checks</h2><p className="caption">Optional one-time download, about 205 MB. Finds text, faces and codes on your device. Keep this tab open while downloading; completed files are saved for retry.</p>
        {downloading ? <button className="secondary" onClick={() => void stopDownload()}>Cancel download</button> : <button className="secondary" disabled={!ready || automatic || smartLoading} onClick={() => void prepareTools()}>{automatic ? 'Automatic checks ready offline' : 'Download automatic checks'}</button>}
      </section>}
      {!busy && <section className="smart-summary"><h2>Optional smart summary</h2><p className="caption">A small local language model chooses a short explanation. One-time download, about 290 MB. Only detected categories reach this model.</p>
        <button className="secondary" disabled={!ready || !automatic || !gpuReady || downloading || smartLoading || smartReady} onClick={() => void prepareSummary()}>{smartReady ? 'Smart summary ready' : smartLoading ? 'Preparing smart summary…' : 'Download smart summary'}</button>
        {smartStatus && <p className="caption" role="status">{smartStatus}</p>}
      </section>}
    </>}
    <input ref={camera} aria-label="Take photo" type="file" accept="image/*" capture="environment" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <input ref={picker} aria-label="Choose photo" type="file" accept="image/*" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <footer>Photos stay in memory. No account. No uploads.<br />{gpuReady ? 'WebGPU available for optional smart summaries.' : 'This device uses the standard local summary.'}</footer>
  </main>;
}
