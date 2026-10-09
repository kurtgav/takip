# TAKIP — Judge Q&A (the 12 hardest questions)

> Owner: Hermes · Updated Session 3 (2026-10-09 18:5x) — answers reflect the **built** app
> (F1–F16). Answer **short and honest**; when a number isn't measured yet, say "not yet measured" —
> never estimate.
> Tags map each answer to the PRD §14.1 judging criteria: **Problem & Usefulness (25%)**,
> **Local AI Implementation (25%)**, **Technical Execution (20%)**, **Innovation (15%)**,
> **Product & Demo Quality (15%)**.

**Q1. "Isn't on-device AI just worse than a cloud API?"**
*(Local AI Implementation · Technical Execution)*
Worse on some tail cases, better where it matters here. We use four focused models — OCR, face
detection, NER, and a small summary LLM — tuned to the narrow job of finding ID fields, not general
vision. And cloud redaction is a contradiction: you'd upload the exact photo you're protecting.
Local is the only design that keeps the promise. Where it's weaker (angled photos) we say so and
ask the user to review — we don't hide it.

**Q2. "What happens when it misses something?"**
*(Technical Execution · Product & Demo Quality)*
The review screen is **mandatory**: you tick "I reviewed the covers" before you can export, and you
can **remove any cover or draw a new one**. The risk summary lists what was found so you can check
it against the photo. We never auto-send; the model proposes, the human confirms.

**Q3. "Why not just use the phone's blur tool?"**
*(Problem & Usefulness · Innovation)*
Manual blur is slow and miss-prone — people forget the back of the ID, the birthday, the QR code,
or the phone number in a screenshot. TAKIP finds **every category in one pass** and keeps the rest
of the photo readable. And our covers are **opaque and flattened** — light blur and thin scribbles
can still be read.

**Q4. "Does local really matter, or is it a gimmick?"**
*(Local AI Implementation · Innovation)*
It's the whole point. The threat model is *untrusted intermediaries* — sellers, landlords, chat
apps. A tool that uploads your ID to redact your ID has just created the leak. Running everything
on-device also means it works with **no signal** and costs **nothing per use**.

**Q5. "How big are the models? Will it run on a normal phone?"**
*(Technical Execution)*
Text: **Tesseract.js 7.0.0** (LSTM, `eng`). Faces: **MediaPipe Tasks-Vision 1.1.0** (BlazeFace
short-range, float16). Names/addresses: **Transformers.js 3.8.1** running DistilBERT-NER
**int8-quantized**. Optional summary: **WebLLM 0.2.85** running **Qwen2.5-0.5B-Instruct** (q4f16)
— only on WebGPU, and it falls back to a template if the device can't run it. Weights are cached
once; the app works after that in airplane mode.

**Q6. "Show me there are really zero uploads."**
*(Local AI Implementation · Product & Demo Quality)*
*(Show the badge + live counter.)* The app counts **every network request made while processing**
and shows it — during a full photo → scan → export it stays at **zero requests, zero blocked
attempts**. In our automated suite a fresh **offline reload**, a full scan and an export all pass
with that counter at zero. To be precise about what's verified: the offline flow is verified in our
test suite; the on-stage **airplane-mode toggle** is shown once the venue phone passes rehearsal.

**Q7. "Does it work on the phones real users have?"**
*(Technical Execution · Product & Demo Quality)*
It's a PWA — first load online, then offline. Core redaction is Chrome/Edge/Safari. The *optional*
on-device LLM summary needs WebGPU and simply falls back to a template elsewhere. It's a vanilla
phone web app; no install from a store. **Scan time on a mid-range phone is the next number we
measure** — pending, not claimed.

**Q8. "What's actually new here?"**
*(Innovation)*
Local AI **as a pre-share privacy filter**, aimed at the one photo people are most afraid to leak —
not another cloud vault. Three things together: automatic category detection, a **plain-language
risk summary**, and an **anti-reuse watermark** that names the recipient and purpose.

**Q9. "Your watermark and export — is that AI, or fake AI?"**
*(Technical Execution)*
Deterministic on purpose — the watermark and the flattened, metadata-free export don't need AI
and shouldn't guess. The AI is where judgment is needed: what text is sensitive, which faces, which
entities, and the wording of the summary.

**Q10. "Will it catch Filipino names, addresses and BHW-style formats?"**
*(Technical Execution · Problem & Usefulness)*
Yes, within limits. We combine the AI with **label proximity** ("Pangalan", "Petsa ng Kapanganakan",
"Tirahan", "Address") and PH-specific patterns: PhilSys 16-digit, TIN, SSS, UMID/CRN, PhilHealth,
Pag-IBIG MID, driver's license, `09XX` mobiles. A **safety net** covers any unlabelled run of 9+
digits. Formats are heuristics — we verify them on our own test set and report misses.

**Q11. "Is the live demo real, or prerecorded?"**
*(Product & Demo Quality)*
Live, on the phone — that's the rule (PRD §14.2). We photograph the **SAMPLE** card in the room.
Airplane mode is toggled live **only after** it passes the venue rehearsal; until then we show the
on-device badge and counter. We keep a backup image only for camera/lighting failure, and we say so.

**Q12. "Did AI write this? Which tools?"**
*(Rules compliance — PRD §14.2)*
Disclosed openly: **OpenAI Codex** as the coding agent and the **Hermes agent** running **DeepSeek
V4.1 Flash** for content, testing and documentation. Neither is part of the product at runtime —
every model that runs is open-source and listed in the README. The product was built during the
hackathon; test data is team-made; no fake benchmarks.

## Coverage check — every criterion is exercised

| Judging criteria (PRD §14.1) | Weight | Questions |
|---|---|---|
| Problem & Usefulness | 25% | Q3, Q10 |
| Local AI Implementation | 25% | Q1, Q4, Q6 |
| Technical Execution | 20% | Q1, Q2, Q5, Q7, Q9, Q10 |
| Innovation | 15% | Q3, Q4, Q8 |
| Product & Demo Quality | 15% | Q2, Q6, Q7, Q11 |
