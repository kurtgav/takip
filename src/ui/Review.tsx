import { useEffect, useState } from 'react';
import { Pipeline } from '../pipeline/client';
import { riskLevel, templateSummary } from '../pipeline/risk';
import { categoryLabels, type Box, type Watermark } from '../types';
import type { ScanOutput } from '../workers/protocol';
import { downloadCopy } from '../render/download';
import { useBlobUrl } from './useBlobUrl';
import { PhotoEditor } from './PhotoEditor';
import { WatermarkEditor } from './WatermarkEditor';

interface Props { result: ScanOutput; pipeline: Pipeline; summary?: { text: string; source: 'model' | 'template' }; onReset: () => void }

export function Review({ result, pipeline, summary, onReset }: Props) {
  const [detections, setDetections] = useState(result.detections);
  const [before, setBefore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [watermark, setWatermark] = useState<Watermark>();
  const [rendered, setRendered] = useState<{ blob: Blob; key: string }>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const key = JSON.stringify({ detections, watermark });
  const ready = rendered?.key === key;
  const originalUrl = useBlobUrl(result.original);
  const previewUrl = useBlobUrl(rendered?.blob ?? result.preview);
  const categories = result.detections.map(box => box.category);
  const risk = riskLevel(categories);
  const exposed = detections.filter(box => !box.enabled);
  const invalidWatermark = !!watermark && (!watermark.recipient.trim() || !watermark.purpose.trim() || !watermark.date);

  useEffect(() => {
    let current = true;
    setSaved(false); setReviewed(false);
    void pipeline.request({ action: 'render', detections, watermark }).then(blob => {
      if (current) { setRendered({ blob, key }); setError(''); }
    }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [detections, watermark, key, pipeline]);

  function toggle(id: string) {
    setDetections(items => items.map(box => box.id === id ? { ...box, enabled: !box.enabled } : box)); setSelected(id);
  }
  function add(box: Box) {
    const id = `manual-${crypto.randomUUID()}`;
    setDetections(items => [...items, { ...box, id, category: 'manual', enabled: true }]); setSelected(id); setAdding(false);
  }
  function save() {
    if (!ready || !reviewed || invalidWatermark) return;
    downloadCopy(rendered.blob); setSaved(true);
  }
  async function share() {
    if (!ready || !reviewed || invalidWatermark) return;
    const file = new File([rendered.blob], 'takip-safe-copy.png', { type: 'image/png' });
    setShareMessage('');
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) { save(); return; }
    setSharing(true);
    try { await navigator.share({ files: [file], title: 'TAKIP safe copy' }); setSaved(true); }
    catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setShareMessage('Share cancelled. Your covered copy is still here.');
      else { downloadCopy(rendered.blob); setSaved(true); setShareMessage('Sharing was unavailable. Downloaded the covered copy instead.'); }
    } finally { setSharing(false); }
  }
  return <section className="review" aria-label="Review your photo">
    <div className="section-heading"><div><p className="eyebrow">02 / REVIEW & COVER</p><h1>Your details. Your decision.</h1></div><button className="secondary" onClick={onReset}>New photo</button></div>
    <div className="review-grid"><div>
      <div className="toolbar" aria-label="Photo view"><div className="segmented"><button aria-pressed={before} onClick={() => { setBefore(true); setAdding(false); }}>Before</button><button aria-pressed={!before} onClick={() => setBefore(false)}>After</button></div>
        <button className="secondary" aria-pressed={adding} onClick={() => { setAdding(!adding); setBefore(false); }}>Add cover</button></div>
      <PhotoEditor src={before ? originalUrl : previewUrl} width={result.width} height={result.height} detections={detections} before={before} adding={adding} selected={selected} onToggle={toggle} onAdd={add} />
      <p className="caption">{before ? 'Original view. Your saved copy always uses the covers selected in After.' : adding ? 'Drag across the detail you want to cover. Check the whole area is inside the box.' : 'Tap any cover to uncover it. Use Add cover for signatures or missed details.'}</p>
      {adding && <button className="secondary" onClick={() => add({ x: 0, y: 0, width: result.width, height: result.height })}>Cover entire photo</button>}
    </div><aside className="review-details">
      <div className={`risk risk-${risk.toLowerCase()}`}><span>Original exposure</span><strong>{risk} risk</strong></div>
      <p className="summary">{summary?.text ?? templateSummary(categories)}</p><p className="caption" data-testid="summary-source">{summary?.source === 'model' ? 'Local model summary' : 'Standard on-device summary'} · {(result.elapsedMs / 1000).toFixed(1)}s scan</p>
      {result.warnings.map(warning => <p className="notice" key={warning}>{warning}</p>)}
      <h2>Detected details</h2><p className="caption">{result.detections.length} sensitive items found. Select a chip to highlight its box; use its checkbox to change coverage.</p>
      <ul className="detection-list" aria-label="Detected items">{detections.map((box, index) => <li key={box.id} data-category={box.category}>
        <button className={selected === box.id ? 'chip selected' : 'chip'} onClick={() => { setSelected(box.id); setBefore(false); }}>{categoryLabels[box.category]} <span>{index + 1}</span></button>
        <label className="cover-toggle"><input type="checkbox" checked={box.enabled} onChange={() => toggle(box.id)} aria-label={`Cover ${categoryLabels[box.category]} ${index + 1}`} />Covered</label>
      </li>)}</ul>
      {detections.length === 0 && <p>No details detected. This is not a guarantee of safety. Add any covers needed.</p>}
      {exposed.length > 0 && <p className="notice">{exposed.length} detected {exposed.length === 1 ? 'item remains' : 'items remain'} visible. Check that you intend to share {exposed.length === 1 ? 'it' : 'them'}.</p>}
    </aside></div>
    <WatermarkEditor value={watermark} onChange={setWatermark} />
    <div className="export-panel"><label className="review-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I checked the photo, including signatures and any missed details.</label>
      <div className="actions"><button disabled={!ready || !reviewed || invalidWatermark || sharing} onClick={save}>Save safe copy</button><button className="secondary" disabled={!ready || !reviewed || invalidWatermark || sharing} onClick={() => void share()}>{sharing ? 'Sharing…' : 'Share safe copy'}</button></div>
      {!ready && !error && <p role="status">Preparing covered copy…</p>}{error && <p role="alert">{error}</p>}
      {saved && <p className="success" role="status">Location data removed. Original stays on your device.</p>}
      {shareMessage && <p role="status" className="caption">{shareMessage}</p>}
    </div>
  </section>;
}
