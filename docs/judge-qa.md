# TAKIP — Judge Q&A (the 12 hardest questions)

> Owner: Hermes (docs) · Session 1, updated Session 2 (2026-10-09 16:46 Asia/Manila)
> Mapped to the judging criteria: **Usefulness · Local AI · Execution · Innovation · Demo**.
> Answers are **short and honest**. Where an answer depends on the built app, it names what
> actually runs today; re-verify against `README.md` / `eval/results.md` before the pitch.

## Build status (honest)

As of **2026-10-09 16:46** the app is **partly built**: photo input, on-device OCR, §7 pattern
rules, solid covering, MediaPipe face detection, ZXing QR/barcode, Transformers.js NER and box
merge are implemented and were verified in isolated Chromium runs; risk scoring exists as a
module with unit tests. **Not built yet:** the review UI (before/after, risk banner, chips,
touch-up), export with metadata stripping, the **live** network counter, the local-LLM summary
and the watermark. `eval/results.md` does not exist, so **no recall / scan-time / "0 requests"
figure may be quoted anywhere yet.** When a feature below is not in the build, say "not in this
build" rather than implying it works.

---

**Q1. If the AI runs on the device, how good can it be compared to a cloud model? — Local AI**
> Good enough for the job, and the job is *detection*, not writing essays. Small models are
> fine at OCR, face detection and pattern matching, which is most of what ID redaction needs.
> The one place quality matters is the risk summary — and that's a short, templated sentence,
> not open-ended reasoning. We trade a little accuracy for the thing that actually matters
> here: the photo never leaves the phone. *(The NER model is integrated — a DistilBERT
> token-classification model run through Transformers.js — but it is English-trained, so
> Filipino names/addresses rely on label-proximity rules. Quote real recall only from
> `eval/results.md` once it exists.)*

**Q2. What if the model misses something? — Usefulness / Execution**
> We never claim 100%, and the PRD says so explicitly. The catches are: the pattern rules (a
> safety-net rule covers *any* long unlabeled digit run), and a manual review step where the
> user can look at every detection and add or remove covers. Real recall numbers, including
> misses, will be in `eval/results.md`. *(The touch-up UI is **not in this build yet** — say so
> if asked to demonstrate it live.)*

**Q3. Why not just let people blur by hand? — Usefulness**
> Because they forget. People miss the ID number on the back, the birthday, the QR code, the
> phone number in a screenshot. Hand blurring is also often too light to be safe. TAKIP does
> the boring, easy-to-forget parts automatically, then leaves the last check to the human.

**Q4. Is "local AI" actually necessary, or is it a gimmick? — Innovation / Local AI**
> It's the whole point. The image a user is trying to *protect* is the same image a cloud tool
> would have to *upload*. Sending your ID to a server to have it redacted is self-defeating.
> Local isn't a feature bolted on here — it's the only correct architecture.

**Q5. Which models run locally, and how big are they? — Local AI**
> Running today, all in the browser, all fetched once on first load and cached: **Tesseract.js
> 7.0.0** for OCR, **MediaPipe `@mediapipe/tasks-vision` 1.1.0 + BlazeFace short-range** for
> faces, **Transformers.js 3.8.1** with **`distilbert-NER-ONNX` (q8, ~66 MB)** for names and
> places, and **ZXing-WASM 3.1.5** for QR/barcodes (not AI). A small **WebLLM / Qwen2.5-0.5B**
> model is chosen for the plain-language summary but **is not integrated yet**. The exact list
> that ships is in `README.md` — quote those, not this.

**Q6. How do you prove there are zero network requests? — Demo / Local AI**
> The intended proof is two-fold: an in-app counter that stays at 0 during processing, and an
> airplane-mode test where the whole flow still runs. **Be straight about the state:** the
> "On-device · 0 uploads" badge exists, but the **live counter is not implemented yet**, and
> the offline (airplane-mode) flow has not been verified. So prove what you can — the models
> are bundled locally and loaded from local files — and do not assert a live zero-request
> counter on stage until it is built.

**Q7. Does it work on normal users' phones, not just the demo phone? — Execution**
> Target is latest Chrome on Android and desktop. OCR, face detection, QR/barcode, NER,
> pattern rules and covering all run **without** WebGPU. WebGPU is only needed for the optional
> LLM summary. **Note the build state:** neither the LLM summary **nor** its template fallback
> exists in the app yet, so there is simply no summary card today. Say that plainly instead of
> promising a fallback you can't show.

**Q8. What's genuinely new here that other apps don't do? — Innovation**
> The combination: a pre-share privacy filter that (1) runs fully on-device, (2) explains the
> risk in plain language instead of just blurring, and (3) adds a purpose-bound watermark to
> discourage reuse. Redaction tools exist; an offline, explainable, anti-reuse filter built
> for the "someone asked for my ID" moment is the novel part. *(Items 2 and 3 are design goals
> that are not in this build yet — present them as the direction, not as shipped.)*

**Q9. Where's the AI in the watermark and export? — Execution**
> Not every step is AI — and that's fine. The AI is OCR, face detection and entity recognition.
> Watermarking, covering and metadata-stripping are deterministic image processing, which is
> exactly what you want there: predictable and safe. *(Watermark and metadata-stripping are
> still to be built; the covering is done.)*

**Q10. How do you handle Filipino names and addresses that English models get wrong? — Local AI / Execution**
> NER alone won't catch everything — it is an English-trained model — so it is backed by
> **label proximity** ("Pangalan", "Tirahan", "Last Name", "Address") and address keywords
> (Brgy., St., City, Province), plus the digit safety-net for numbers. That hybrid is
> deliberately designed for PH documents.

**Q11. Is the demo real, or pre-recorded? — Demo**
> Live, on a phone. We keep a pre-loaded backup image only in case the venue camera struggles
> with the lighting — the flow itself is real every time. No fake results: `eval/results.md`
> will include what we got wrong.

**Q12. Did AI write this? — Execution**
> Yes, and we disclose it (PRD §15). Codex wrote the application code; a Hermes agent on
> DeepSeek V4.1 Flash wrote the docs, test plan and this Q&A; an orchestrator script ran the
> agents and the git checkpoints. None of them is part of the product at runtime — the shipped
> app uses only the open-source models running on your device.

---

### Quick do/don't for the judges' round
- **Do** say "not in this build yet" when unsure. Honesty scores; bluffing loses.
- **Don't** quote a metric you can't point to in `eval/results.md` (it does not exist yet).
- **Don't** demo the touch-up, watermark, export, summary or network counter until they exist.
- **Do** steer every privacy question back to: *the original never leaves the device.*
