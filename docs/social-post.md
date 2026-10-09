# TAKIP — Social Posts (X + LinkedIn)

> Owner: Hermes (docs) · First written: 2026-10-09 16:2x Asia/Manila · Session 1
> For the demo video. Both posts **tag Devin / Cognition** and include **#AppBuildersPH**.
> Replace `[VIDEO LINK]`, `[REPO LINK]` and `[TEAM HANDLES]` before posting.
>
> Handles: on X, Cognition is **@cognition** (the older **@cognition_labs** now redirects).
> Devin's tag is available via Cognition. On LinkedIn, tag the **Cognition** company page
> (and any Devin page the account search offers). Confirm the tag resolves before posting.

## Build status (honest)

As of **2026-10-09 16:2x** the app is **not built yet** (see `docs/HERMES_NOTES.md`). These
posts advertise the **demo video**, so do not publish until the video is recorded and the
features shown actually work. If a feature is cut, cut it from the post too.

---

## X (Twitter)

### Main post (single tweet)

```
Strangers ask for your ID to “verify” a deal. Send it once and they keep it forever.

TAKIP uses local AI to auto-cover your ID number, face, birthday, address & account numbers before you share — 100% on-device, works in airplane mode ✈️

#AppBuildersPH @cognition

[VIDEO LINK]
```

### Optional thread (post as a reply chain if you want more reach)

```
1/ We built TAKIP for #AppBuildersPH: a pre-share privacy filter for IDs, receipts and payment screenshots. The whole point — your original photo NEVER leaves your phone. 📵

2/ Everything runs on-device: OCR (Tesseract.js), face detection (MediaPipe), name/address recognition (Transformers.js) and a small local LLM (WebLLM) that explains the risk in plain language. No cloud. No uploads. 0 network requests while processing.

3/ Turn on airplane mode, photograph your ID, and watch the sensitive items get covered, explained and watermarked. Blur before you share.

Repo: [REPO LINK]
Built with OpenAI Codex + a Hermes agent (DeepSeek V4.1 Flash). Thanks @cognition 🧵
```

> Keep the main post **under X's 280-character limit** and the thread under 280 per tweet.
> Trim the repo/credit lines if needed.

---

## LinkedIn

```
Sending a photo of your ID has become normal. Sending it safely hasn't.

In a marketplace deal, a landlord chat, a job application or a delivery "verification," we
hand a stranger our ID number, our birthday, our address and our face — and then it lives on
their phone forever. Most of us blur it by hand, and forget something.

So for AppBuildersPH, our team built TAKIP: an on-device privacy filter that automatically
finds and permanently covers sensitive information in a photo before you share it —
government ID numbers, faces, birthdays, addresses, phone and account numbers, and QR codes.

What makes it different is where the AI runs: entirely on your phone. No upload, no cloud AI,
no analytics. After the first load it works in airplane mode, so you can see for yourself
that the photo never leaves the device.

• Local AI: OCR, face detection, named-entity recognition and a small language model — all on-device
• Plain-language risk summary so people understand *why* it matters
• A purpose-bound watermark to discourage reuse
• Metadata (EXIF/GPS) stripped on export

Built in a hackathon by our team, with OpenAI Codex writing the code and a Hermes agent
(DeepSeek V4.1 Flash) handling docs, testing and the pitch.

Privacy tools shouldn't need your data in order to protect your data. Blur before you share. 🔒

#AppBuildersPH #LocalAI #Privacy #OnDevice #EdgeAI

Demo: [VIDEO LINK]
Repo: [REPO LINK]
Team: [TEAM HANDLES]

(Thanks @Cognition for Devin and the local-AI-first tooling that made this build possible.)
```

> On LinkedIn, tag **Cognition** properly using @-mention (type "Co" and pick the company) —
> plain "@Cognition" text may not notify. Keep the hashtag #AppBuildersPH in both posts.

---

## Posting checklist
- [ ] Demo video recorded and uploaded; `[VIDEO LINK]` filled.
- [ ] Repo is **public**; `[REPO LINK]` filled.
- [ ] Devin/Cognition tagged (X: @cognition · LinkedIn: Cognition company page).
- [ ] **#AppBuildersPH** present in the post text (and hashtags).
- [ ] Every feature mentioned is actually shown in the video.
- [ ] No real ID or personal data visible in any attached frame.
- [ ] Copy the live post URLs into `docs/submission.md` field 6.
