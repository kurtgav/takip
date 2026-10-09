# TAKIP — Judge Q&A (the 12 hardest questions)

> Owner: Hermes (docs) · First written: 2026-10-09 16:2x Asia/Manila · Session 1
> Mapped to the judging criteria: **Usefulness · Local AI · Execution · Innovation · Demo**.
> Answers are **short and honest**. Where an answer depends on the built app, verify it
> against `README.md` / `eval/results.md` before the pitch.

## Build status (honest)

As of **2026-10-09 16:2x**, the app is **not built yet** (see `docs/HERMES_NOTES.md`). The
answers below state the design intent and the honest fallback ("planned", "if it ships"). Do
not claim a number or a feature that the built app cannot back up. Any figure you quote must
come from `eval/results.md`.

---

**Q1. If the AI runs on the device, how good can it be compared to a cloud model? — Local AI**
> Good enough for the job, and the job is *detection*, not writing essays. Small models are
> fine at OCR, face detection and pattern matching, which is most of what ID redaction needs.
> The one place quality matters is the risk summary — and that's a short, templated sentence,
> not open-ended reasoning. We trade a little accuracy for the thing that actually matters
> here: the photo never leaves the phone. *(If the NER model ships: quote its real recall
> from `eval/results.md`; if it doesn't, say the pattern rules + labels carry it.)*

**Q2. What if the model misses something? — Usefulness / Execution**
> We never claim 100%, and the PRD says so explicitly. Three layers catch misses: the
> pattern rules (a safety-net rule covers *any* 9+ digit run), the manual touch-up step where
> the user draws a cover, and the review screen that shows every detection with a
> before/after toggle. Real recall numbers, including misses, are in `eval/results.md`.

**Q3. Why not just let people blur by hand? — Usefulness**
> Because they forget. People miss the ID number on the back, the birthday, the QR code, the
> phone number in a screenshot. Hand blurring is also often too light to be safe. TAKIP does
> the boring, easy-to-forget parts automatically, then leaves the last check to the human.

**Q4. Is "local AI" actually necessary, or is it a gimmick? — Innovation / Local AI**
> It's the whole point. The image a user is trying to *protect* is the same image a cloud tool
> would have to *upload*. Sending your ID to a server to have it redacted is self-defeating.
> Local isn't a feature bolted on here — it's the only correct architecture.

**Q5. Which models run locally, and how big are they? — Local AI**
> Per PRD §8: Tesseract.js for OCR, MediaPipe Face Detector, a small Transformers.js NER
> model, and a small WebLLM model for the summary; QR via the `BarcodeDetector` API with a
> WASM fallback. The big ones are fetched once on first load and cached for offline use.
> **The exact models, versions and sizes that actually shipped are in `README.md`** — quote
> those, not this list, if they differ.

**Q6. How do you prove there are zero network requests? — Demo / Local AI**
> Two ways: the in-app counter that stays at 0 during processing, and the airplane-mode test
> — the full flow runs with the radios off. The demo runs in airplane mode on camera.
> *(Confirm the counter is implemented before asserting this live.)*

**Q7. Does it work on normal users' phones, not just the demo phone? — Execution**
> Target is latest Chrome on Android and desktop. WebGPU is required only for the LLM
> summary, and there's a **template fallback** so the summary still appears on devices
> without it. Everything else (OCR, faces, patterns, covering, export) runs without WebGPU.
> Safari/iOS is best-effort.

**Q8. What's genuinely new here that other apps don't do? — Innovation**
> The combination: a pre-share privacy filter that (1) runs fully on-device, (2) explains the
> risk in plain language instead of just blurring, and (3) adds a purpose-bound watermark to
> discourage reuse. Redaction tools exist; an offline, explainable, anti-reuse filter built
> for the "someone asked for my ID" moment is the novel part.

**Q9. Where's the AI in the watermark and export? — Execution**
> Not every step is AI — and that's fine. The AI is OCR, face detection, entity recognition
> and the summary LLM. Watermarking, covering and metadata-stripping are deterministic image
> processing, which is exactly what you want there: predictable and safe.

**Q10. How do you handle Filipino names and addresses that English models get wrong? — Local AI / Execution**
> NER alone won't catch everything, so it's backed by **label proximity** ("Pangalan",
> "Tirahan", "Last Name", "Address") and address keywords (Brgy., St., City, Province), plus
> the digit safety-net for numbers. That hybrid is deliberately designed for PH documents.
> *(If the NER model didn't ship, say the rules + label proximity do the work today.)*

**Q11. Is the demo real, or pre-recorded? — Demo**
> Live, on a phone, in airplane mode. We keep a pre-loaded backup image only in case the
> venue camera struggles with the lighting — the flow itself is real every time. No fake
> results: `eval/results.md` includes what we got wrong.

**Q12. Did AI write this? — Execution**
> Yes, and we disclose it (PRD §15). Codex wrote the application code; a Hermes agent on
> DeepSeek V4.1 Flash wrote the docs, test plan and this Q&A; an orchestrator script ran the
> agents and the git checkpoints. None of them is part of the product at runtime — the
> shipped app uses only the open-source models running on your device.

---

### Quick do/don't for the judges' round
- **Do** say "planned" or "if it ships" when unsure. Honesty scores; bluffing loses.
- **Don't** quote a metric you can't point to in `eval/results.md`.
- **Do** steer every privacy question back to: *the original never leaves the device.*
