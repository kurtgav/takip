# TAKIP — Social post drafts (for the demo video)

> Owner: Hermes · Updated Session 4 (2026-10-09 20:59) — the app is **built, verified and deployed**
> (per `README.md` / `eval/results.md`). Use **only** numbers that appear in `eval/results.md`, and
> only SAMPLE / synthetic images — never a real ID (PRD §16.3).
>
> **Required on both posts (PRD §15.1):** **tag Devin / Cognition** and include **#AppBuildersPH**.
> The **post URL itself is left blank** for the human (see the pre-post checklist).

## Option 1 — X / Twitter post (for the demo video)

> You send a photo of your ID to a seller. That photo lives on their phone forever.
>
> TAKIP finds your name, birthday, address, ID number, phone, email, faces and QR codes — and covers
> them **on your phone**. 0 uploads. All AI runs on-device.
>
> #AppBuildersPH @cognition @DevinAI
> [BLANK — attach / link the ~1-minute demo video]

## Option 2 — LinkedIn post (for the demo video)

> Every day people send photos of their ID to sellers, landlords and riders. That image — often with
> GPS and a timestamp — lives on someone else's device forever.
>
> **TAKIP** is a privacy filter that runs **entirely on your phone**. Photograph a document or a
> screenshot and it finds the sensitive parts (name, birthday, address, IDs, phone, email, faces,
> QR codes), covers them opaquely, tells you in plain language what was exposed, and exports a
> **metadata-free** safe copy. Four AI models — OCR, face detection, NER and an optional on-device
> summary model — all run locally, with a live **"0 uploads"** counter.
>
> Built during the hackathon. Recall and scan time on real phones is our next measured step — we
> report exactly what we measure, misses included. Our automated suite (unit + browser) and the
> deployed offline flow are green — see our results doc.
>
> #AppBuildersPH #privacy #ondeviceAI #PWA
> @cognition @DevinAI
> [BLANK — link the ~1-minute demo video]

## Common assets / hashtags

- **Demo video:** the ~1-minute cut from `docs/demo-script.md` ("Video shot list"). No real IDs.
- **Hashtags:** **#AppBuildersPH** (required) + `#privacy #ondeviceAI #PWA #buildinpublic`.
- **Tags:** **Devin / Cognition** (required, per PRD §15.1) on both the X and LinkedIn posts.

## Do / Don't

- **Do** tag **Devin / Cognition** and include **#AppBuildersPH** on both posts (required).
- **Do** say "runs on your phone / 0 uploads" — it's the verified core claim.
- **Do** attach the demo video (the post is the §15.1 "X / LinkedIn video post URL").
- **Don't** show any real ID — SAMPLE card or synthetic images only.
- **Don't** claim phone recall %, scan seconds or "iOS-ready" — **not yet measured**; say "next
  measurement".
- **Don't** say "zero network ever" — the **first load** needs the internet; offline applies
  **after** the first load.

## Pre-post checklist

- [ ] **Devin / Cognition tagged** on the post (required, PRD §15.1).
- [ ] **#AppBuildersPH** included (required, PRD §15.1).
- [ ] Demo video attached / linked (≤ 1 min, SAMPLE content only).
- [ ] Post URL recorded and pasted into `docs/submission.md` (the `[BLANK]` field).
- [ ] No real IDs / no private data in the image or screenshot.
- [ ] Every number traces to `eval/results.md`; not-yet-measured items labeled as such.
