import { useEffect, useRef, useState } from 'react';
import { canRunSmartSummary, validatePhoto } from './platform';
import { Pipeline } from './pipeline/client';
import type { ScanOutput } from './workers/protocol';
import { Review } from './ui/Review';
import { prepareOffline, processingNetwork, toolsReady, downloadTools, cancelTools, type NetworkCount } from './offline';
import { SummaryEngine } from './pipeline/summary';
import { LocalPhoto } from './render/photo';
import { Icon } from './ui/Icon';
import { useBlobUrl } from './ui/useBlobUrl';

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
  const [scanImage, setScanImage] = useState<Blob>();
  const scanPreview = useBlobUrl(scanImage);
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
      const local = await LocalPhoto.open(file); photo.current = local; setScanImage(local.original);
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
    } finally { setBusy(false); setScanImage(undefined); }
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
  return <main className={`shell ${result ? 'shell-review' : ''}`} id="main-content">
    <a className="skip-link" href="#photo-workspace">Skip to photo tools</a>
    <header className="app-header"><a className="wordmark" href={import.meta.env.BASE_URL} aria-label="TAKIP home"><span className="brand-mark" aria-hidden="true" />TAKIP</a><span className="badge"><Icon name="lock" />On-device · 0 uploads</span></header>
    <div className="local-status" role="status"><span className={ready ? 'is-ready' : ''}>{ready ? (automatic ? 'Editor and checks ready offline' : 'Manual editor ready offline') : 'Saving offline editor'}</span></div>
    {result && photo.current ? <Review result={result} photo={photo.current} summary={summary} onReset={() => void reset()} /> : <>
      <div className={busy ? 'scan-screen' : 'home-screen'} id="photo-workspace" tabIndex={-1}>
      <section className="intro">
        {busy ? <div className="scan-art">{scanPreview ? <img src={scanPreview} alt="Your selected photo" /> : <Icon name="photo" />}{automatic && <span className="scan-line" />}</div> : <div className="wallet-art" aria-hidden="true"><div className="wallet-back" /><div className="wallet-card"><span className="wallet-portrait" /><div className="wallet-lines"><i /><i /><i /><i /></div><span className="wallet-seal"><Icon name="check" /></span></div></div>}
        <h1>{busy ? automatic ? 'A private check, right here.' : 'Opening your photo…' : <>Cover before<br />you share.</>}</h1>
        <p>{busy ? 'Your photo stays on this device. You can review and adjust every cover.' : 'Your ID, receipt, or screenshot. Cover personal details before you send it.'}</p>
      </section>
      <section className="photo-actions" aria-label="Start with a photo">
        {!busy && <div className="actions"><button disabled={!ready || downloading || smartLoading} onClick={() => camera.current?.click()}><Icon name="camera" />Take Photo</button><button disabled={!ready || downloading || smartLoading} className="secondary" onClick={() => picker.current?.click()}><Icon name="photo" />Choose Photo</button></div>}
        {(!ready || busy) && <div className="setup" role="status"><span className="activity" aria-hidden="true" /><p>{progress}</p></div>}
        {busy && pipeline.current && <button className="secondary" onClick={() => pipeline.current?.dispose()}>Continue with manual covers</button>}
        {error && <div className="notice" role="alert"><p>{error}</p>{!ready && <button className="secondary" onClick={retry}>Retry setup</button>}</div>}
        {!busy && <p className="offline-tip"><Icon name="check" />{automatic ? 'Your saved checks work offline.' : 'Manual covers work offline. No model needed.'}</p>}
      </section>
      </div>
      {!busy && <section className="offline-kit" aria-labelledby="offline-kit-title"><div className="kit-heading"><p className="eyebrow">YOUR OFFLINE TOOLKIT</p><h2 id="offline-kit-title">A little help finding details.</h2><p>Optional tools, saved on this device. Download once while connected, then use them offline.</p></div><div className="kit-grid">
      <section className="smart-summary"><div className="tool-heading"><span className="tool-icon"><Icon name={automatic ? 'check' : 'download'} /></span><span className="tool-size">205 MB</span></div><h3>Automatic checks</h3><p>Find text, faces and codes on your device. Always review the whole photo: automatic checks can miss details.</p>
        {downloading && <div className="download-progress" role="status"><span className="activity" aria-hidden="true" /><p>{progress}</p></div>}
        {downloading ? <><p className="caption">Keep this tab open. Completed files are saved if you cancel or need to retry.</p><button className="secondary" onClick={() => void stopDownload()}>Cancel download</button></> : <button className="secondary" disabled={!ready || automatic || smartLoading} onClick={() => void prepareTools()}>{automatic ? 'Automatic checks ready offline' : 'Download automatic checks'}</button>}
      </section>
      <section className="smart-summary"><div className="tool-heading"><span className="tool-icon"><Icon name="photo" /></span><span className="tool-size">290 MB</span></div><h3>Optional smart summary</h3><p>A local language model explains the detected categories. Your photo and its text stay out of this model.</p>
        <button className="secondary" disabled={!ready || !automatic || !gpuReady || downloading || smartLoading || smartReady} onClick={() => void prepareSummary()}>{smartReady ? 'Smart summary ready' : smartLoading ? 'Preparing smart summary…' : 'Download smart summary'}</button>
        {smartStatus && <p className="caption" role="status">{smartStatus}</p>}
        <p className="caption">{gpuReady ? automatic ? 'Available on this device.' : 'Download automatic checks first.' : 'This device uses the standard local summary.'}</p>
      </section></div></section>}
    </>}
    <input ref={camera} aria-label="Take photo" type="file" accept="image/*" capture="environment" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <input ref={picker} aria-label="Choose photo" type="file" accept="image/*" hidden onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
    <footer><span className="footer-brand">TAKIP</span><p>Photos stay in memory. No account. No uploads.</p><span data-testid="network-counter" title="Application requests during this photo. Browser update checks and unrelated tabs are outside this counter.">{network.requests} network requests · {network.blocked} blocked attempts</span></footer>
  </main>;
}
