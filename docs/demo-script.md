# TAKIP — Live demo script (5 min) + video shot list (~1 min)

> Owner: Hermes · PRD §16.1–§16.3. Updated Session 3 (2026-10-09 18:5x) — the app is **built**
> (F1–F16); every on-screen element below exists in the real app. Say only what the run shows,
> and quote numbers only from `eval/results.md`.
>
> **Golden rule of this script:** speak the *spoken* lines, do the *on-screen* actions, in the
> listed order. If something hasn't been rehearsed on the actual venue phone yet, use its fallback
> line — do not narrate a result you haven't seen.

## Pre-flight (before you walk up)

- Phone: **TAM build / highest brightness**, **Do Not Disturb on**, **auto-rotate off**, screen
  timeout **off** (or 10 min), notifications cleared.
- App already **loaded once online** and showing **Ready offline**; the offline photo buttons are
  enabled. Smart-summary model downloaded **only if** you're showing the local-LLM line.
- **SAMPLE** test card in hand (made-up details, clearly labelled, not a replica of a real ID).
- **Backup image** loaded in the gallery in case venue lighting defeats the camera (PRD §16.3).
- Second device (if any) showing `eval/results.md` for the 3:15–4:30 proof beat.
- If the phone has **passed** the offline rehearsal, plan to go airplane mode live. If it has
  **not**, keep the live airplane-mode toggle **out** of the pitch and use it only as a stated fact
  (fallback lines below) — a live toggle that fails on stage costs you the beat.

## Live pitch — 5:00 (mall venue)

### 0:00–0:30 — Hook
**Say:** "A seller asks for your ID. You send it. Then a week later — where is that photo now?
Who has it? TAKIP fixes that before you tap send."

### 0:30–0:45 — It runs offline
**Do:** (if rehearsed) pull down the Control Centre, **turn Airplane Mode ON**, hold the phone up.
Point to the **"On-device · 0 uploads"** badge and the **live network counter**.
**Say:** "Airplane mode. Watch the counter — it stays at **zero requests** while it works. Nothing
leaves this phone."
**Fallback (if not rehearsed live):** keep airplane mode off and **say:** "This runs
offline — in our test suite a fresh reload, a full scan and an export ran with **zero network
requests and zero blocked attempts**. I'll show you the app." (then continue; don't toggle.)

### 0:45–2:15 — SAMPLE ID card: the core flow (PRD §5 steps 1–6)
**Do & say, in order:**
1. Tap **Take Photo** / **Choose Photo** → "I photograph our SAMPLE card — made-up details, that's
   the rule for a public demo."
2. While **scanning** (progress: "Reading text… Finding faces… Checking sensitive info… Writing
   summary…") **say:** "It's reading text, finding faces, and checking for sensitive info — all
   on the phone."
3. **Review screen** appears; tap the **before/after toggle** so the covers pop in, then back.
   **Say:** "In one pass it covered the **name, birthday, address, ID number and the face**."
4. Point to the **risk summary** (🔴 **High**, because it's a full ID). **Say:** "It tells you, in
   plain English, what was exposed."
5. Tap **Add watermark** → recipient `Angelica — apartment rental`, purpose `verification`,
   date → tiled diagonal text appears. **Say:** "So this photo can only be used for one purpose,
   by one person."
6. Tick the **mandatory review** checkbox → tap **Save safe copy** (or **Share**).
   **Say:** "What gets saved is the flat safe copy — **metadata stripped, no EXIF, no GPS** — and
   the original pixels under those covers are gone."

### 2:15–3:15 — A screenshot, not an ID
**Do:** open the **bank-transfer / e-wallet screenshot** (SAMPLE). Let it scan.
**Say:** "Here it's not an ID — it's a GCash receipt. It covered the **phone number and account
number**. The reference number it **left visible on purpose** — receipts need those — and you can
cover it yourself if you want."
(If you have a second sample: show a **chat screenshot** — name, phone, address — same story.)

### 3:15–4:30 — Proof beat: models, offline split, real numbers
**Do:** show `eval/results.md` on the second screen (or the "What runs locally" screen).
**Say:** "Four AI models run **on this phone**: **Tesseract** for text, **MediaPipe** for faces,
**Transformers.js** for names and addresses, and an optional **on-device language model** for the
summary. They're downloaded **once**; after that it's **airplane-mode clean**.
Our measured suite: **30 of 30 unit tests, 11 of 11 browser tests**, and a full
scan-and-export with the network log at **zero**. What still needs the internet? **Only the first
load.**"
**Honesty line (say it before a judge asks):** "Recall and scan-time on real phones is our next
measurement — we run the 30-photo set on-device; we report it exactly as measured, misses
included."

### 4:30–5:00 — Close
**Say:** "Privacy tools shouldn't need your data. TAKIP never touches the cloud."
**Do:** lower the phone; stop.

## Video shot list (~1:00) — PRD §16.2

Silent-friendly: every beat readable without sound; add captions in post.

| Time | Shot | Notes |
|---|---|---|
| 0:00–0:06 | Phone held up, **Airplane Mode ON**, badge **"On-device · 0 uploads"** visible | If not rehearsed, show the badge + on-screen counter over "0 requests during processing" instead |
| 0:06–0:16 | Camera → **SAMPLE** card fills frame → tap shutter | Card is clearly labelled SAMPLE |
| 0:16–0:30 | Scanning progress → **review screen**; before/after toggle reveals **name, DOB, address, ID no., face** covered | Hold on the 🔴 **High** risk summary |
| 0:30–0:40 | Add **watermark** → tiled text appears | Recipient + purpose + date |
| 0:40–0:50 | **Save / Share** the safe copy | If native share sheet untested, show **Save safe copy** + the flattened PNG; caption "metadata stripped" |
| 0:50–1:00 | **End card**: "All AI runs on your device." + **TAKIP** | Also add "0 uploads" for reinforcement |

## Demo safety rules (PRD §16.3) — non-negotiable

- **Never** show a real, uncovered ID on screen or in the video.
- Use **only** the clearly labelled **SAMPLE** card with made-up details.
- Keep a **pre-loaded backup image** in case venue lighting defeats the camera.
- Never quote a metric that isn't in `eval/results.md`. If it isn't measured, say
  "not yet measured" — never estimate.
- Airplane-mode toggle on stage **only** after the offline rehearsal has passed; otherwise show the
  counter/badge and state the verified fact.
- Rehearse **3/3** in the noisy venue before the run (PRD §12 demo-success metric).
