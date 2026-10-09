# TAKIP — Social Post(s) for the #AppBuildersPH campaign

> Owner: Hermes (docs) · Session 1, updated Session 2 (2026-10-09 16:46 Asia/Manila)
> Rules: post the **video**, tag **Devin / Cognition**, include **#AppBuildersPH**.

## Build status (honest — read first)
As of **2026-10-09 16:46** the app is **partly built**: on-device OCR, pattern rules, solid
covering, face / QR-barcode / NER detection all work; the review UI, touch-up, risk banner,
export, live network counter, local-LLM summary and watermark are **not built yet**, and
`eval/results.md` does not exist. **Post only what the video actually shows.** If the video
skips a beat (see `demo-script.md`), the post must skip it too. When in doubt, cut the claim.

---

## Option 1 — X (main post)

> Your ID photo? It's leaking more than you think. 🔒
> TAKIP finds your ID number, birthday, face & QR — and covers them before you share.
> 100% on-device. Works in airplane mode. Your photo never leaves your phone. 📵
> @devingo #AppBuildersPH

*(This is the "detection + covering" story, which the build already does. Nothing here claims
the summary, watermark or export.)*

## Option 2 — X (builder-story angle)

> We built TAKIP for @devingo #AppBuildersPH: an on-device privacy filter.
> OCR, face, QR & name detection all run in the browser. No cloud. No uploads.
> Blur before you share. 🛡️

## Option 3 — LinkedIn (longer)

> **TAKIP — "Blur before you share."**
>
> People hand over photos of their IDs every day. Those photos carry an ID number, a birthday,
> an address, a face, and often a QR code.
>
> TAKIP is a photo-privacy filter that finds those sensitive details and covers them in solid
> black — **entirely on your own device.** The image is never uploaded. After the one-time model
> download, the core flow works in airplane mode.
>
> Built with React, TypeScript & Vite. On-device AI: Tesseract.js (OCR), MediaPipe (faces),
> Transformers.js (names/places), ZXing (QR). Built for the @Devin / @Cognition
> #AppBuildersPH builder challenge.
>
> **Blur before you share.**
>
> *(Add a line with real numbers only after `eval/results.md` exists — never invent them.)*

---

## Hashtags & tags
- Always: **#AppBuildersPH**, tag **@devingo** (X) / **@Devin** + **@Cognition** (LinkedIn).
- Optional: **#OnDeviceAI #Privacy #BuildInPublic #Philippines**

## Do / Don't
- **Do** post the real video; a real demo beats a promise.
- **Don't** mention the summary, watermark, export, live network counter or any scan-time/
  recall number until those exist and `eval/results.md` backs them.
- **Don't** use any real personal data in the screenshots you post.
- **Do** keep the main post free of claims you can't show in the video.

## Pre-post checklist
- [ ] Video recorded per `docs/demo-script.md` (only BUILT beats).
- [ ] No real personal data visible anywhere.
- [ ] Tag Devin/Cognition + `#AppBuildersPH`.
- [ ] Text matches the video — nothing extra promised.
