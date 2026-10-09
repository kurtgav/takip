# TAKIP — Demo Script (5-minute live pitch + ~1-minute video)

> Owner: Hermes (docs) · Session 1, updated Session 2 (2026-10-09 16:46 Asia/Manila)
> Structure follows PRD §16: **Part 1 = live pitch (5 min, mall venue)**, **Part 2 = video shot
> list (~1 min)**, **Part 3 = demo-safety rules**. Every beat is tagged **[BUILT]** or
> **[NOT BUILT YET]** so nobody narrates a feature the app cannot show.
> Re-verify against the running app before you rehearse.

## Build status (honest)

Image input, on-device OCR, §7 pattern rules, solid covering, face detection, QR/barcode, NER
and box merge are **implemented and verified**. The review UI (before/after, risk banner,
chips, touch-up), export with metadata stripping, the **live** network counter, the local-LLM
summary and the watermark are **not built yet**. `eval/results.md` does not exist, so quote
**no** scan-time, recall or "0 requests" figure on stage or in the video. Where a PRD beat
depends on an unbuilt feature, the beat below says how to handle it today.

---

# PART 1 — Live pitch (5 minutes, mall venue)  [PRD §16.1]

Read the **Spoken** column aloud. The **On-screen** column is what the audience sees.

| Time | Beat | Spoken line (exact) | On-screen action | State |
|---|---|---|---|---|
| 0:00–0:30 | **Hook** | *"A seller asks for your ID. You send it. Where does it go next? Into a group chat. A folder. A stranger's phone. Today we make that photo safe — without sending it anywhere."* | Stand away from the screen; no slides. | **[BUILT]** (talk only) |
| 0:30–0:45 | **It's offline** | *"Watch — I'll turn on airplane mode right now."* (turn it on) *"The models were downloaded once and now run from the phone itself. The photo never leaves this device."* | Toggle **airplane mode**; point at the **"On-device · 0 uploads"** badge. | **[PARTLY]** badge exists; **live counter NOT BUILT** — do not promise a moving counter; skip airplane mode if the offline flow isn't verified yet |
| 0:45–2:15 | **Scan the SAMPLE card** | *"Here's our SAMPLE card — made-up name, made-up number, clearly fake. Photo… and the app reads it on the device."* | Take/Choose Photo → **SAMPLE** (fake) card → progress → **covered preview** → list of detected items. | **[BUILT]** capture + covering + list; **NOT BUILT:** the 🔴 High risk banner, removable chips, watermarking, and export — do **not** perform those steps |
| 2:15–3:15 | **Screenshot case** | *"Now a normal screenshot — the kind people forward every day. It's not an ID, but it still has a phone number, an address, an account number."* | Run the app on a chat/transfer screenshot with a **fake** number → the numbers come back covered. | **[BUILT]** pattern rules + safety net |
| 3:15–4:30 | **Proof** | *"Four models run on this phone: OCR, face detection, name/place recognition, and QR detection. Nothing is uploaded — the app has no server."* | Show the on-device model list. **Show real test results only from `eval/results.md`** — which does not exist yet, so describe honestly instead of quoting numbers. | **[BUILT]** for the models; **results numbers NOT AVAILABLE yet** |
| 4:30–5:00 | **Close** | *"Privacy tools shouldn't need your data. TAKIP never touches the cloud. Blur before you share."* | End on the app or the title card. | **[BUILT]** |

**If the summary / watermark / export land in time,** insert the PRD §16.1 step *"auto-covers →
🔴 High risk summary → add watermark → export"* inside 0:45–2:15 and re-time the beats. Until
then, do them for nobody — an unbuilt step is the one thing that sinks a live demo.

---

# PART 2 — Demo video (~1 minute)  [PRD §16.2]

PRD's target arc: *airplane mode on → photo → covers appear → risk summary → watermark → share →
end card "All AI runs on your device."* Build-state mapping:

| Shot | What to film | State | Fallback if unbuilt |
|---|---|---|---|
| 1 | Phone home → open TAKIP | **[BUILT]** | — |
| 2 | Airplane mode on; camera on the "0 uploads" badge | **[PARTLY]** | Show the badge; don't claim a live counter; skip if offline isn't verified |
| 3 | Take/Choose Photo → **SAMPLE** (fake) card | **[BUILT]** | — |
| 4 | Progress messages → covered preview + detected-items list | **[BUILT]** | — |
| 5 | Risk summary card (🔴 High) | **[NOT BUILT]** | **Omit** until it exists |
| 6 | Add watermark → Share/Save with metadata stripped | **[NOT BUILT]** | **Omit** until it exists |
| 7 | End card: **"All AI runs on your device."** | **[BUILT]** (title card) | — |

**Length:** keep ≤60s. If you must omit shots 5–6, the video becomes a ~45s "detect and cover"
demonstration — that is honest and still strong; do **not** fake the missing beats.

### Captions to burn in (they double as accessibility)
- 0:02 "Runs on your phone."
- 0:08 "Photo never leaves the device."
- 0:20 "Finds IDs, faces, numbers, QR codes."
- 0:35 "Covers them in solid black."
- 0:50 "TAKIP — Blur before you share."

---

# PART 3 — Demo-safety rules  [PRD §16.3]

- **Never** show a real, uncovered ID on screen or in the video — not even briefly, not even
  "just to show it works."
- **Use only the clearly labeled SAMPLE card** with made-up details (fake name, fake
  0000-0000-0000-0000 number, fake address). A teammate's drawn cartoon or a consenting
  teammate's photo is fine; a real document is not.
- **Have a pre-loaded backup image** in case the venue camera struggles with the lighting —
  the "Choose Photo" path is the backup.
- **Airplane mode / "0 uploads"** may only be shown once the offline flow has been verified in
  the actual demo build; otherwise skip that beat rather than risk it.
- **No metrics on stage** unless they come straight from `eval/results.md` (which does not
  exist yet). Say "we'll publish the numbers, including what we miss" instead.
- **Rehearse the tap sequence** on the exact demo device; venue Wi-Fi and lighting are
  unreliable.

## Do / Don't (whole demo)
- **Do** show a real tap sequence — judges value a real app over polish.
- **Don't** narrate any beat tagged NOT BUILT YET.
- **Do** keep the live pitch inside 5 minutes; the hook earns the first 30 seconds.
- **Do** end every privacy question back on: *the original never leaves the device.*
