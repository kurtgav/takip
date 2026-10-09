# TAKIP — Demo Script & Video Shot List

> Owner: Hermes (docs) · First written: 2026-10-09 16:2x Asia/Manila · Session 1
> Built from PRD §16 (16.1 live pitch, 16.2 video, 16.3 safety).

## Build status (honest)

As of **2026-10-09 16:2x**, the app is **not built yet** (see `docs/HERMES_NOTES.md`). The
spoken lines and on-screen beats below describe the **intended** product from the PRD. Before
rehearsing, check `README.md` / `PROGRESS.md` / the running app and change any line whose
feature does not actually exist, or mark it as a plan. **Never speak a feature the app cannot
show.** "NOT YET VERIFIED" = confirm on the real build first.

---

## Part A — 5-minute live pitch (PRD §16.1)

Venue: noisy mall hall. **Everything is image-based** — no audio dependency. Speak slowly,
show the screen, point with your finger.

### Beat 1 — Hook (0:00–0:30)
**Spoken:**
> "You're selling a phone. A buyer asks for your ID to 'verify' you. You send it — and now
> your ID number, your birthday, your address and your face live forever on a stranger's
> phone. Where does it go next? You'll never know."

**On screen:** nothing yet — just your face and the phone held up. Beat, then continue.

### Beat 2 — Airplane mode (0:30–0:45)
**Spoken:**
> "TAKIP fixes the part people get wrong. Before we do anything, watch this."
> *(pull down the control shade and switch airplane mode ON)*
> "Airplane mode. No data, no Wi-Fi. Look at the badge — 'On-device, 0 uploads.' That
> number stays at zero the whole time, and I'll show you."

**On screen:** phone settings → airplane mode ON → open TAKIP → point at the **"On-device ·
0 uploads"** badge and the live network counter. *(Badge and counter: NOT YET VERIFIED.)*

### Beat 3 — The SAMPLE card, end to end (0:45–2:15)
**Spoken:**
> "This is our SAMPLE test card — completely made-up details, so nothing real is on screen.
> I'll photograph it exactly like a real user would."
> *(tap Take/Choose Photo, capture the SAMPLE card)*
> "Reading the text... finding faces... checking sensitive info... writing the summary."
> *(let the scanning steps play — name them out loud as they light up)*
> "And there — every risky item is already covered: the ID number, the birthday, the
> address, the face. Risk: HIGH. Here's why, in plain language —"
> *(read the summary card out loud, or paraphrase it)*
> *(tap the Watermark button, type "SAMPLE BUYER" / "seller verification", export)*
> "I add a watermark so my photo can't be reused, and I export. Location data stripped.
> The original never left the phone."

**On screen:** photo input → scanning steps → review screen with covers + 🔴 High banner →
summary → watermark sheet → export confirmation. *(All NOT YET VERIFIED until built.)*

### Beat 4 — Screenshot case (2:15–3:15)
**Spoken:**
> "But IDs are only half of it. Here's a chat screenshot — the kind people send every day."
> *(load the chat/transfer screenshot)*
> "Phone number — covered. Delivery address — covered. Account number — covered. And a
> watermark so the screenshot can't be resold. Same phone, still in airplane mode."

**On screen:** load the saved chat / e-wallet transfer image → covers appear → risk shown.
*(NOT YET VERIFIED.)*

### Beat 5 — The proof (3:15–4:30)
**Spoken:**
> "Four AI models run right here on this phone — text reading, face detection, name and
> address recognition, and a small language model that writes the summary. Nothing is sent
> anywhere. Here's our real test run on about thirty photos we made ourselves —"
> *(show `eval/results.md` on screen: recall %, false covers, scan time, 0 requests)*
> "— including the ones it missed. What runs locally: everything. What needs internet: only
> the first load and the one-time model download."

**On screen:** `eval/results.md` figures, then a simple two-column slide: **Runs locally /
Needs internet (first load only)**. *(Figures NOT YET VERIFIED — use only real measured
numbers from `eval/results.md`.)*

### Beat 6 — Close (4:30–5:00)
**Spoken:**
> "Privacy tools shouldn't need your data in order to protect your data. TAKIP never touches
> the cloud. Blur before you share. Thank you."

**On screen:** app home with the badge, then hold the phone up. *(No slide needed.)*

### Live-demo checklist (print this)
- [ ] Airplane mode ON before you start; confirm the badge shows "On-device · 0 uploads".
- [ ] Models already downloaded on this phone (first load done earlier, on Wi-Fi).
- [ ] SAMPLE card + chat screenshot pre-loaded as backup images.
- [ ] Phone charged, brightness high, notifications OFF, portrait lock ON.
- [ ] Watermark fields pre-filled so you don't type under pressure.
- [ ] Know your numbers from `eval/results.md` without looking.

---

## Part B — ~1-minute demo video shot list (PRD §16.2)

Target: 55–60 s, phone screen recording with a few live shots. Airplane mode must be visible.

| Shot | Time | What to show | Notes |
|---|---|---|---|
| 1 | 0:00–0:06 | Title card: **TAKIP — "Blur before you share."** | Text only, high contrast |
| 2 | 0:06–0:14 | Pull down shade → airplane mode ON | Prove no network, on camera |
| 3 | 0:14–0:24 | Open TAKIP → photograph the SAMPLE card → scanning steps run | Capture the four progress steps |
| 4 | 0:24–0:34 | Review screen: before/after toggle, covers, 🔴 High risk + summary | Toggle before↔after at least once |
| 5 | 0:34–0:42 | Watermark sheet → type purpose → export | Show the tiled diagonal watermark |
| 6 | 0:42–0:50 | Share/save the safe copy | Point out the "0 uploads" counter still at 0 |
| 7 | 0:50–0:58 | End card: **"All AI runs on your device."** + TAKIP logo | Add the repo URL once public |

Editing notes: no music with lyrics, captions on (venue was noisy), keep the airplane-mode
shot uncut so it's obviously real.

---

## Part C — Demo-safety rules (PRD §16.3)

1. **Never** show a real, uncovered ID — not on the phone screen, not on a laptop, not in the
   video, not in a still frame.
2. Use **only** the clearly labeled **SAMPLE** card with made-up details. It must not copy a
   real government ID's design (PRD §12.1).
3. Keep a **pre-loaded backup image** on the device in case the venue camera or lighting
   fails; the "Choose Photo" path is the fallback.
4. Blur or avoid the notification shade / any personal banners before screen-recording.
5. Before posting the video, check every frame for accidental real data.
6. If a feature isn't working live, **say so plainly** and move to the next beat — never fake
   a result on screen.
