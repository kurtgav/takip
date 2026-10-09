# TAKIP — Social post(s) for the #AppBuildersPH campaign

> Owner: Hermes (docs) · Session 1 → **Session 3 (2026-10-09 18:5x Asia/Manila)**.
> Rules: post the **video**, tag **Devin / Cognition**, include **#AppBuildersPH**.
> Post only what the video actually shows. As of this session the **full flow is built and
> verified** (detect → review → covers → risk summary → watermark → flattened, metadata-free
> export → share/download, offline). Numbers below come from `eval/results.md` only.

---

## Option 1 — X (main post)

> Your ID photo leaks more than you think. 🔒
> TAKIP finds the ID number, birthday, face, address and QR — and covers them **before** you
> share. Adds a "for X verification only" watermark and strips the photo's hidden metadata.
> 100% on-device. Airplane-mode clean. Your photo never leaves your phone. 📵
> @devingo #AppBuildersPH

## Option 2 — X (builder-story angle)

> We built TAKIP for @devingo #AppBuildersPH: an on-device privacy filter.
> OCR, face, QR & name detection + a tiny local LLM — all in the browser. No cloud. No uploads.
> Verified in our suite: a full scan-and-export with **zero** network requests.
> Cover before you share. 🛡️

## Option 3 — LinkedIn (longer)

> **TAKIP — "Cover before you share."**
>
> People hand over photos of their IDs every day. Every one of them carries an ID number, a
> birthday, an address, a face — and often a QR code that holds the whole record.
>
> TAKIP is a photo-privacy filter that finds those details and covers them in solid black,
> **entirely on your own device.** You review the automatic covers, add any it missed, drop in a
> recipient/purpose watermark, and export a flattened PNG with the original metadata removed —
> no EXIF, no GPS.
>
> The image is never uploaded. Everything runs in the browser: OCR, face detection, name/address
> recognition, QR/barcode reading, the risk rules, the covers and the export. After the one-time
> model download it all works in airplane mode, and the in-app counter shows **0 requests** while
> it processes.
>
> Built with React, TypeScript & Vite, on-device AI: Tesseract.js (OCR), MediaPipe (faces),
> Transformers.js (names/places), ZXing (QR) and an optional local Qwen model for the plain-English
> risk summary. Built for the @Devin / @Cognition **#AppBuildersPH** builder challenge.
>
> **Cover before you share.**

---

## Hashtags & tags
- Always: **#AppBuildersPH**, tag **@devingo** (X) / **@Devin** + **@Cognition** (LinkedIn).
- Optional: **#OnDeviceAI #Privacy #BuildInPublic #Philippines**

## Do / Don't
- **Do** post the real video; a real demo beats a promise.
- **Do** keep every claim to what the video shows and what `eval/results.md` measured.
- **Don't** quote recall, false-cover, scan-time or phone-compatibility numbers — those are
  **not measured yet**. "Zero requests" is measured (automated suite); phrase it as "in our tests".
- **Don't** use any real personal data in the screenshots you post — SAMPLE card only.

## Pre-post checklist
- [ ] Video recorded per `docs/demo-script.md` (SAMPLE content only).
- [ ] No real personal data visible anywhere.
- [ ] Tag Devin/Cognition + `#AppBuildersPH`.
- [ ] Text matches the video — nothing extra promised.
- [ ] Any number quoted traces to `eval/results.md`.
