import type { Watermark } from '../types';

export function WatermarkEditor({ value, onChange }: { value?: Watermark; onChange: (value?: Watermark) => void }) {
  function enable() {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(value ? undefined : { recipient: '', purpose: '', date });
  }
  return <section className={`watermark-panel ${value ? 'enabled' : ''}`} aria-label="Purpose watermark">
    <label className="watermark-toggle"><span><strong>Add a purpose watermark</strong><small>A visible reminder that discourages reuse. It cannot prevent it.</small></span><input type="checkbox" checked={!!value} onChange={enable} /></label>
    {value && <div className="watermark-fields">
      <label>Sending to<input value={value.recipient} maxLength={40} autoComplete="off" onChange={event => onChange({ ...value, recipient: event.target.value })} placeholder="Recipient or organization" /></label>
      <label>Purpose<input value={value.purpose} maxLength={60} autoComplete="off" onChange={event => onChange({ ...value, purpose: event.target.value })} placeholder="What this copy may be used for" /></label>
      <label>Date<input type="date" value={value.date} onChange={event => onChange({ ...value, date: event.target.value })} /></label>
      <p className="caption">Preview updates on the photo as you type.</p>
    </div>}
  </section>;
}
