import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { categoryLabels, type Box, type Detection } from '../types';

interface Props {
  src?: string; width: number; height: number; detections: Detection[];
  before: boolean; adding: boolean; selected?: string; readOnly?: boolean;
  onToggle: (id: string) => void; onAdd: (box: Box) => void;
}

export function PhotoEditor({ src, width, height, detections, before, adding, selected, readOnly = false, onToggle, onAdd }: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number }>();
  const [draft, setDraft] = useState<Box>();
  function position(event: PointerEvent) {
    const bounds = surface.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(width, (event.clientX - bounds.left) / bounds.width * width)),
      y: Math.max(0, Math.min(height, (event.clientY - bounds.top) / bounds.height * height)) };
  }
  function rectangle(event: PointerEvent): Box | undefined {
    if (!start) return;
    const end = position(event);
    return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) };
  }
  function down(event: PointerEvent) {
    if (readOnly || !adding || before || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setStart(position(event));
  }
  function up(event: PointerEvent) {
    const box = rectangle(event);
    if (box && box.width >= 4 && box.height >= 4) onAdd(box);
    setStart(undefined); setDraft(undefined);
  }
  const style = (box: Box) => ({ left: `${box.x / width * 100}%`, top: `${box.y / height * 100}%`, width: `${box.width / width * 100}%`, height: `${box.height / height * 100}%` });
  return <div className="photo-frame">
    <div ref={surface} className={`photo-surface ${adding ? 'drawing' : ''}`} style={{ aspectRatio: `${width}/${height}` }}
      onPointerDown={down} onPointerMove={event => { if (start) setDraft(rectangle(event)); }} onPointerUp={up}
      onPointerCancel={() => { setStart(undefined); setDraft(undefined); }}>
      <img src={src} alt={before ? 'Original photo before covers' : 'Photo with permanent covers preview'} draggable={false} />
      {!before && detections.map((box, index) => readOnly ? <span key={box.id} className={`cover-hit ${box.enabled ? 'covered' : 'uncovered'}`} style={style(box)} aria-hidden="true" /> : <button key={box.id} type="button"
        className={`cover-hit ${box.enabled ? 'covered' : 'uncovered'} ${selected === box.id ? 'highlighted' : ''}`}
        style={style(box)} tabIndex={adding || readOnly ? -1 : 0} disabled={adding || readOnly}
        aria-label={`${box.enabled ? 'Uncover' : 'Cover'} ${categoryLabels[box.category]} ${index + 1}`}
        aria-pressed={box.enabled} onClick={() => { if (!adding) onToggle(box.id); }} />)}
      {draft && <div className="draw-preview" style={style(draft)} />}
    </div>
  </div>;
}
