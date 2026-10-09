import { useEffect, useRef, useState } from 'react';
import { LocalPhoto } from '../render/photo';
import { riskLevel, templateSummary } from '../pipeline/risk';
import { categoryLabels, type Box, type Detection, type Watermark } from '../types';
import type { ScanOutput } from '../workers/protocol';
import { downloadCopy } from '../render/download';
import { useBlobUrl } from './useBlobUrl';
import { PhotoEditor } from './PhotoEditor';
import { WatermarkEditor } from './WatermarkEditor';
import { applyCoverPreset, type CoverPreset } from '../pipeline/document';
import { canShareFile } from '../platform';

interface Props { result: ScanOutput; photo: LocalPhoto; summary?: { text: string; source: 'model' | 'template' }; onReset: () => void; onSetup: () => void }
type Stage = 'cover' | 'watermark' | 'save';
const stages: { id: Stage; label: string }[] = [{ id: 'cover', label: 'Cover' }, { id: 'watermark', label: 'Watermark' }, { id: 'save', label: 'Save' }];

export function Review({ result, photo, summary, onReset, onSetup }: Props) {
  const [stage, setStage] = useState<Stage>('cover');
  const [editingDetails, setEditingDetails] = useState(false);
  const [removed, setRemoved] = useState<Detection>();
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const key = JSON.stringify({ detections, watermark });
  const ready = rendered?.key === key;
  const originalUrl = useBlobUrl(result.original);
  const previewUrl = useBlobUrl(rendered?.blob ?? result.preview);
  const categories = detections.map(box => box.category);
  const unchangedCategories = JSON.stringify(categories.filter(category => category !== 'manual')) === JSON.stringify(result.detections.map(box => box.category));
  const complete = result.analysisStatus !== 'manual' && result.analysisStatus !== 'partial';
  const risk = riskLevel(categories);
  const exposed = detections.filter(box => !box.enabled);
  const coveredCount = detections.filter(box => box.enabled).length;
  const invalidWatermark = !!watermark && (!watermark.recipient.trim() || !watermark.purpose.trim() || !watermark.date);

  useEffect(() => {
    let current = true;
    setSaved(false); setReviewed(false);
    void photo.render(detections, watermark).then(blob => { if (current) { setRendered({ blob, key }); setError(''); } }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [detections, watermark, key, photo]);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.closest('.review')?.scrollIntoView({ block: 'start' });
  }, [stage]);

  function goTo(next: Stage) { setBefore(false); setAdding(false); setSelected(undefined); setStage(next); }
  function toggle(id: string) { setDetections(items => items.map(box => box.id === id ? { ...box, enabled: !box.enabled } : box)); setSelected(id); }
  function add(box: Box) { const id = `manual-${crypto.randomUUID()}`; setDetections(items => [...items, { ...box, id, category: 'manual', enabled: true }]); setSelected(id); setAdding(false); setEditingDetails(true); }
  function applyPreset(preset: CoverPreset) { setDetections(items => applyCoverPreset(items, preset)); setBefore(false); setAdding(false); setSelected(undefined); }
  function save() { if (!ready || !reviewed || invalidWatermark) return; downloadCopy(rendered.blob); setSaved(true); }
  async function share() {
    if (!ready || !reviewed || invalidWatermark) return;
    const file = new File([rendered.blob], 'takip-safe-copy.png', { type: 'image/png' }); setShareMessage('');
    if (!canShareFile(file)) { save(); return; }
    setSharing(true);
    try { await navigator.share({ files: [file], title: 'TAKIP safe copy' }); setSaved(true); }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') setShareMessage('Share cancelled. Your covered copy is still here.'); else { downloadCopy(rendered.blob); setSaved(true); setShareMessage('Sharing was unavailable. Downloaded the covered copy instead.'); } }
    finally { setSharing(false); }
  }

  const stageIndex = stages.findIndex(item => item.id === stage);
  return <section className={`review review-stage-${stage}`} id="photo-workspace" tabIndex={-1} aria-label="Review your photo">
    <div className="section-heading"><div><p className="eyebrow">02 / REVIEW & COVER</p><h1>Your details. Your decision.</h1></div><button className="secondary" onClick={onReset}>New photo</button></div>
    <nav className="review-steps" aria-label="Safe copy steps"><ol>{stages.map((item, index) => <li key={item.id} className={index < stageIndex ? 'complete' : index === stageIndex ? 'active' : ''}><span className="step-number" aria-hidden="true">{index < stageIndex ? '✓' : index + 1}</span><span aria-current={item.id === stage ? 'step' : undefined}>{item.label}</span></li>)}</ol></nav>
    <div className="review-stage-layout">
      <div className="review-preview">
        {stage === 'cover' && <div className="toolbar" aria-label="Photo view"><div className="segmented"><button aria-pressed={before} onClick={() => { setBefore(true); setAdding(false); }}>Before</button><button aria-pressed={!before} onClick={() => setBefore(false)}>After</button></div><button className="secondary" aria-pressed={adding} onClick={() => { setAdding(!adding); setBefore(false); }}>Add cover</button></div>}
        <PhotoEditor src={before ? originalUrl : previewUrl} width={result.width} height={result.height} detections={stage === 'cover' || !ready ? detections : []} before={before} adding={stage === 'cover' && adding} readOnly={stage !== 'cover'} selected={stage === 'cover' ? selected : undefined} onToggle={toggle} onAdd={add} />
        <p role="status" className="caption preview-status">{!ready && !error ? 'Updating covered preview…' : ''}</p>
        {error && stage !== 'save' && <p role="alert" className="notice">{error}</p>}
        {stage === 'cover' ? <><p className="caption">{before ? 'Original view. Your saved copy always uses the covers selected in After.' : adding ? 'Drag across the detail you want to cover. Check the whole area is inside the box.' : 'Tap any cover to uncover it. Use Add cover for signatures or missed details.'}</p>{adding && <button className="secondary" onClick={() => add({ x: 0, y: 0, width: result.width, height: result.height })}>Cover entire photo</button>}</> : <p className="caption">Covered copy preview. Return to Cover to change any hidden area.</p>}
      </div>
      <div className="review-stage-card">
        {stage === 'cover' && renderCoverStage()}
        {stage === 'watermark' && <><h2 ref={headingRef} tabIndex={-1}>Add a purpose watermark</h2><p className="stage-intro">Mark who this copy is for and why. Watermark is optional.</p><WatermarkEditor value={watermark} onChange={setWatermark} />{invalidWatermark && <p className="notice">Fill in all watermark fields, or turn off the watermark.</p>}<div className="stage-actions"><button className="secondary" onClick={() => goTo('cover')}>Back</button><button disabled={invalidWatermark} onClick={() => goTo('save')}>Continue</button></div></>}
        {stage === 'save' && <><h2 ref={headingRef} tabIndex={-1}>Your safe copy is ready</h2><div className="export-summary"><p><strong>{coveredCount} private {coveredCount === 1 ? 'detail' : 'details'} covered</strong></p><p>{watermark ? `Watermark for ${watermark.recipient}` : 'No watermark'}</p><p>Location metadata will be removed from the rendered copy. Original stays on your device.</p></div><div className="export-panel"><label className="review-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I checked the photo, including signatures and any missed details.</label><div className="actions"><button disabled={!ready || !reviewed || invalidWatermark || sharing} onClick={save}>Save safe copy</button><button className="secondary" disabled={!ready || !reviewed || invalidWatermark || sharing} onClick={() => void share()}>{sharing ? 'Sharing…' : 'Share safe copy'}</button></div>{!ready && !error && <p role="status">Preparing covered copy…</p>}{error && <p role="alert">{error}</p>}{saved && <p className="success" role="status">Location data removed. Original stays on your device.</p>}{shareMessage && <p role="status" className="caption">{shareMessage}</p>}</div><div className="stage-actions"><button className="secondary" onClick={() => goTo('watermark')}>Back</button></div></>}
      </div>
    </div>
  </section>;

  function renderCoverStage() {
    return <>
      <h2 ref={headingRef} tabIndex={-1}>Check every detail</h2>
      <div className={`risk risk-${complete ? risk.toLowerCase() : 'medium'}`}>
        <span>{complete ? 'Original exposure · retained detections' : 'Automatic assessment'}</span>
        <strong>{complete ? `${risk} risk` : result.analysisStatus === 'manual' ? 'Not assessed' : 'Needs review'}</strong>
      </div>
      {result.analysisStatus !== 'manual' && <p className="document-type"><span><strong>Looks like:</strong> {result.documentGuess}</span><span>{coveredCount} covered</span></p>}
      <div className="summary-card"><p className="eyebrow">WHAT THIS MEANS</p>
        <p className="summary">{result.analysisStatus === 'manual' ? 'Add covers manually. No risk rating is available without automatic checks.' : !complete ? 'Some checks were incomplete or the text was unclear. Detected boxes may miss important details; review the whole photo.' : unchangedCategories && summary ? summary.text : templateSummary(categories)}</p>
        <p className="caption" data-testid="summary-source">{result.analysisStatus === 'manual' ? 'Manual editing' : `${unchangedCategories && summary?.source === 'model' ? 'Local model summary' : 'Standard on-device summary'} · ${(result.elapsedMs / 1000).toFixed(1)}s scan`}</p>
      </div>
      {result.warnings.map(warning => <p className="notice" key={warning}>{warning}</p>)}
      {result.analysisStatus === 'manual' && <div className="manual-recovery"><p>Want automatic detection? Close this photo, set up the checks, then choose your photo again. Closing discards this session’s edits.</p><button className="secondary" onClick={onSetup}>Close photo and set up checks</button></div>}
      {!editingDetails && <div className="detection-chips" aria-label="Detected details">{detections.map((box, index) => <button key={box.id} data-category={box.category} className={selected === box.id ? 'chip selected' : 'chip'} onClick={() => { setSelected(box.id); setBefore(false); }}>{categoryLabels[box.category]} <span>{index + 1}</span></button>)}</div>}
      {detections.length > 0 && <button className="secondary edit-details" aria-expanded={editingDetails} aria-controls="detail-editor" onClick={() => setEditingDetails(!editingDetails)}>Edit detected details</button>}
      {editingDetails && <div id="detail-editor">
        <h3>Detected details</h3><p className="caption">{detections.filter(box => box.category !== 'manual').length} sensitive items found. Uncheck to uncover. Remove an incorrect detection to update the assessment.</p>
        <ul className="detection-list" aria-label="Detected items">{detections.map((box, index) => <li key={box.id} data-category={box.category}>
          <button className={selected === box.id ? 'chip selected' : 'chip'} onClick={() => { setSelected(box.id); setBefore(false); }}>{categoryLabels[box.category]} <span>{index + 1}</span></button>
          <label className="cover-toggle"><input type="checkbox" checked={box.enabled} onChange={() => toggle(box.id)} aria-label={`Cover ${categoryLabels[box.category]} ${index + 1}`} />Covered</label>
          <button className="secondary remove-detection" aria-label={`Remove ${categoryLabels[box.category]} ${index + 1}`} onClick={() => { setRemoved(box); setDetections(items => items.filter(item => item.id !== box.id)); setSelected(undefined); }}>Remove</button>
        </li>)}</ul>
        {detections.some(box => box.category !== 'manual') && <><h3>Minimum share presets</h3><p className="caption">Seller verification turns off individual name and face covers. Estimated areas and manual covers stay on and may still hide those details. Review every cover before sharing.</p><div className="actions" aria-label="Minimum share presets"><button className="secondary" onClick={() => applyPreset('seller-verification')}>Seller verification</button><button className="secondary" onClick={() => applyPreset('cover-all')}>Cover all detected</button></div></>}
      </div>}
      {removed && <div className="undo-notice" role="status"><span>{categoryLabels[removed.category]} detection removed.</span><button className="secondary" onClick={() => { setDetections(items => [...items, removed]); setRemoved(undefined); }}>Undo remove</button></div>}
      {detections.length === 0 && result.analysisStatus !== 'manual' && <p>No details detected. This is not a guarantee of safety. Add any covers needed.</p>}
      {exposed.length > 0 && <p className="notice">{exposed.length} detected {exposed.length === 1 ? 'item remains' : 'items remain'} visible. Check that you intend to share {exposed.length === 1 ? 'it' : 'them'}.</p>}
      <div className="stage-actions"><button disabled={!ready} onClick={() => goTo('watermark')}>Continue</button></div>
    </>;
  }
}
