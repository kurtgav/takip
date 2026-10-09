# TAKIP — Product Requirements Document

> **"Blur before you share."**
> *Takip* is Filipino for "cover."

| | |
|---|---|
| **Product** | TAKIP — On-device privacy filter for photos before sharing |
| **Event** | AppBuildersPH Hackathon 2026 · Theme: Local AI |
| **Version** | 1.0 (Hackathon MVP) |
| **Build window** | Oct 9, 2026 (3:30 PM) → Oct 10, 2026 (10:00 AM code freeze) |
| **Build team** | Human team + AI agents (Codex for code, Hermes on DeepSeek V4.1 Flash for content, testing, docs) |
| **Status** | Approved for build |

---

## 1. Summary

TAKIP is an installable web app (PWA) that runs **entirely on the user's phone or laptop**. Before a user sends a photo of their ID, a receipt, a bank or e-wallet screenshot, or a chat screenshot to someone, TAKIP uses **local AI models** to:

1. Read all the text in the image,
2. Find faces and QR codes,
3. Detect sensitive personal information (ID numbers, names, birthdays, addresses, phone and account numbers),
4. Permanently cover them,
5. Explain the risk in plain language,
6. Add a "for verification only" watermark, and
7. Remove hidden location data from the file.

**The original photo never leaves the device.** After the first load, the app works fully in **airplane mode**.

---

## 2. Problem

### 2.1 The situation
People are routinely asked to send photos of sensitive documents online:
- Online sellers and buyers ("send your ID for verification")
- Landlords and rental agents
- Job applications and employers
- Delivery and courier verification
- Online lending and financing apps
- Proof-of-payment screenshots (bank / e-wallet transfers)

### 2.2 What goes wrong
- Once sent, the photo can be **saved, forwarded, and reused** for identity theft, fake accounts, SIM or account registration, and loan fraud.
- Manual blurring is **slow and error-prone**: people forget the ID number on the back, the birthday, the signature, the QR code, or the phone number in a screenshot.
- Weak blurring (light blur or thin scribbles) can often still be read.
- Photos carry **hidden metadata** (EXIF), sometimes including the GPS location where the photo was taken.

### 2.3 Why cloud tools fail here
A cloud-based redaction tool requires **uploading the exact image the user is trying to protect**. That defeats the purpose. The only trustworthy design is one where the AI runs on the user's own device.

---

## 3. Target Users

| Persona | Description | Need |
|---|---|---|
| **Primary: "Online Seller / Buyer" (Ana, 27)** | Buys and sells on marketplaces and social media. Often asked for an ID before a transaction. | Share proof of identity without handing over everything. |
| **Secondary: "Job Seeker / Renter" (Mark, 23)** | Sends IDs and documents to employers and landlords he has never met. | Share only what's necessary, with a watermark limiting reuse. |
| **Secondary: "Careful Parent" (Lorna, 52)** | Not tech-savvy, worried about scams, shares payment screenshots. | One tap, clear verdict, no settings to learn. |

---

## 4. Goals and Non-Goals

### 4.1 Goals
- **G1:** Automatically detect and cover sensitive information in a photo **on-device**.
- **G2:** Work with **zero network requests** after the first load (airplane-mode proof).
- **G3:** Explain the risk in **plain language** so users understand *why* it matters.
- **G4:** Discourage reuse with a **purpose-bound watermark**.
- **G5:** Deliver a **reliable live demo** in a noisy mall venue (image-based, no audio dependency).

### 4.2 Non-Goals (out of scope for MVP)
- User accounts, login, or cloud sync
- Storing photos or history
- Native iOS / Android apps (PWA only)
- Video redaction
- Signature detection by AI (users cover signatures manually with the touch-up tool)
- Guaranteeing 100% detection (manual review step always exists)

---

## 5. Core User Flow

```
Open TAKIP → Take / pick photo → AI scans on-device (progress shown)
→ Review screen: sensitive items auto-covered + risk summary
→ (Optional) tap to add/remove covers → (Optional) add watermark
→ Save / Share safe copy
```

1. **Home:** large "Take Photo" and "Choose Photo" buttons, plus an **"On-device · 0 uploads"** badge.
2. **Scanning:** step-by-step progress ("Reading text… Finding faces… Checking sensitive info… Writing summary…").
3. **Review:** before/after toggle, colored boxes over each detected item, risk level, and plain-language summary.
4. **Touch-up:** tap a box to uncover it; draw a box to cover something missed.
5. **Watermark:** recipient name + purpose + date, tiled diagonally.
6. **Export:** save or share the safe copy (flattened image, metadata removed).

---

## 6. Functional Requirements

### 6.1 Must Have (P0)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| **F1** | Photo input | User can take a photo with the camera or pick one from the gallery / file system. |
| **F2** | Local text reading (OCR) | All text is extracted with position boxes, on-device, with no network calls. |
| **F3** | Sensitive text detection | Detects the categories in §7 and marks their boxes. |
| **F4** | Local face detection | Detects faces (including the small ID photo) and marks them. |
| **F5** | QR / barcode detection | Detects QR codes and barcodes and marks them. |
| **F6** | Permanent covering | Covers use **solid fill or heavy pixelation**, flattened into the exported image. Original pixels under covers are not recoverable from the export. |
| **F7** | Manual touch-up | User can remove any auto-cover and draw new covers. |
| **F8** | Risk summary | Shows risk level (Low / Medium / High) and a plain-language list of what was exposed. |
| **F9** | Export without metadata | Exported image is re-encoded via canvas so EXIF (including GPS) is stripped. |
| **F10** | Offline operation | After first load, the full flow works in airplane mode. |
| **F11** | Local-proof badge | UI shows "On-device" status and a live counter of network requests made during processing (should stay at 0). |

### 6.2 Should Have (P1)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| **F12** | Local LLM risk explanation | A small local LLM writes the risk summary in friendly English (Taglish optional), based **only** on the detected categories. Falls back to a template if the device can't run it. |
| **F13** | Purpose watermark | Tiled diagonal text: "For [recipient] verification only · [purpose] · [date]". |
| **F14** | Native share | Uses the Web Share API where supported; otherwise download. |

### 6.3 Nice to Have (P2)

| ID | Requirement |
|---|---|
| **F15** | Document-type guess (ID / receipt / chat screenshot / bank transfer) shown on the review screen. |
| **F16** | "Minimum share" presets, e.g., *Seller verification* keeps name + photo visible and covers everything else. |
| **F17** | Upgrade OCR to PaddleOCR via ONNX Runtime Web for better accuracy on angled photos. |

---

## 7. Sensitive Data Categories

Detection combines **local AI** (OCR, NER, face detection, LLM) with **pattern rules**. Formats below are heuristics; verify them during the build. A safety-net rule covers any long digit sequence.

| Category | Detection method | Examples / notes |
|---|---|---|
| **Face** | MediaPipe Face Detector (AI) | ID photo, selfies |
| **Full name** | NER model (AI) + label proximity ("Name", "Pangalan", "Last Name") | |
| **Birthday** | Date patterns + label proximity ("Date of Birth", "Petsa ng Kapanganakan") | |
| **Address** | NER model (AI) + label proximity ("Address", "Tirahan") + address keywords (Brgy., St., City, Province) | |
| **PhilSys / National ID number** | Pattern: 16 digits, often `XXXX-XXXX-XXXX-XXXX` | |
| **TIN** | Pattern: `XXX-XXX-XXX` (+ optional `-XXX`) | |
| **SSS number** | Pattern: `XX-XXXXXXX-X` | |
| **UMID / CRN** | Pattern: `XXXX-XXXXXXX-X` | |
| **PhilHealth number** | Pattern: `XX-XXXXXXXXX-X` | |
| **Pag-IBIG MID** | Pattern: `XXXX-XXXX-XXXX` | |
| **Driver's license number** | Pattern: letter + digits, e.g., `A01-23-456789` | |
| **Passport number** | Pattern: letter(s) + 7 digits (+ optional letter) | |
| **Mobile number** | Pattern: `09XXXXXXXXX` / `+639XXXXXXXXX` (with spaces or dashes) | |
| **Card / account number** | 12–19 digit sequences; Luhn check for cards | Bank and e-wallet screenshots |
| **Reference / transaction number** | Label proximity ("Ref No.", "Reference") | Optional cover, user decides |
| **Email address** | Pattern | |
| **QR code / barcode** | QR / barcode detector | Often encodes the full ID record |
| **Safety net** | Any unlabeled sequence of 9+ digits | Covered by default, user can uncover |

**Never covered by default (to keep the photo useful):** document titles such as "REPUBLIC OF THE PHILIPPINES", agency names, field labels.

---

## 8. Local AI Architecture

All models run **in the browser on the user's device**. Models are fetched **once** on first load, stored in the browser cache, and then run offline using WebAssembly / WebGPU.

| # | Job | Model / library | Runtime | Approx. size |
|---|---|---|---|---|
| 1 | Read text with positions | **Tesseract.js** (LSTM OCR), language data `eng` (+ `fil` if available) bundled locally | WebAssembly | ~5–20 MB |
| 2 | Find faces | **MediaPipe Face Detector** (`@mediapipe/tasks-vision`, BlazeFace short-range model) bundled locally | WebAssembly / WebGL | ~1 MB |
| 3 | Classify names / addresses / places | **Small NER model via Transformers.js** (ONNX), e.g., a quantized BERT-base NER model; verify availability on Hugging Face | ONNX Runtime Web (WASM / WebGPU) | ~60–130 MB |
| 4 | Write the risk summary | **Small LLM via WebLLM** (e.g., a 0.5–1.5B Qwen or Llama instruct model, 4-bit) | WebGPU | ~0.4–1 GB |
| — | QR / barcode | `BarcodeDetector` API where available, fallback `jsQR` / `zxing-wasm` (not AI) | WASM | small |
| — | Pattern rules | Regex + label proximity (not AI) | JS | — |

### 8.1 Pipeline

```
Image
 ├─► [1] OCR ───────────► words + boxes
 │                          ├─► Pattern rules ──┐
 │                          └─► [3] NER model ──┤
 ├─► [2] Face detector ───► face boxes ─────────┤
 └─► QR detector ─────────► code boxes ─────────┤
                                                ▼
                                   Merge + de-duplicate boxes
                                                ▼
                               Risk scoring (category weights)
                                                ▼
                    [4] Local LLM → plain-language summary
                         (template fallback if no WebGPU)
                                                ▼
                         Review UI → touch-up → watermark
                                                ▼
                     Flatten on canvas → export (no EXIF)
```

### 8.2 Risk scoring
- **High:** ID number **or** (name + birthday) **or** (name + address) **or** card/account number **or** QR code on an ID.
- **Medium:** name + phone, or address alone, or face + name.
- **Low:** only one minor item (e.g., first name only).

### 8.3 LLM prompt rules (F12)
- Input: the **list of detected categories only** (e.g., `["full_name","birthday","philsys_number","face"]`), never the raw extracted text.
- Output: max 3 short sentences, plain English (optional Taglish), stating what was exposed and the realistic misuse risk.
- Must not invent categories not in the input.
- Template fallback produces equivalent text when WebGPU / LLM is unavailable.

### 8.4 Offline strategy
- PWA with a service worker (e.g., `vite-plugin-pwa` / Workbox) precaches app code, Tesseract worker + core + language data, MediaPipe WASM + model, and the NER model files.
- WebLLM manages its own model cache; the app shows a one-time "Download smart summary (≈X MB)" step.
- No analytics, no telemetry, no external fonts or CDNs at runtime.

---

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Privacy** | No image, text, or result is ever sent over the network. Photos are processed in memory and not stored. No analytics. |
| **Offline** | Full core flow (F1–F11) works in airplane mode after first load. |
| **Performance (targets)** | Scan (OCR + faces + NER) ≤ 8 s on a mid-range phone for a typical ID photo; LLM summary ≤ 15 s; UI never freezes (heavy work in Web Workers). |
| **Compatibility** | Latest Chrome on Android and desktop (primary). Safari / iOS best-effort. LLM requires WebGPU; app degrades gracefully without it. |
| **Security of covers** | Covers are solid or heavy pixelation, flattened into the output. No light Gaussian blur on text. |
| **Accessibility** | Large tap targets, high-contrast colors, risk level shown by color **and** text. |
| **Language** | UI in English; summaries optionally in Taglish. |

---

## 10. UX / UI Guidelines

- **Tone:** calm, trustworthy, protective. Not scary.
- **Home:** two big buttons + "On-device · 0 uploads" badge + airplane-mode tip.
- **Review screen:**
  - Before / After toggle at the top.
  - Risk banner: 🟢 Low / 🟡 Medium / 🔴 High, with text.
  - Summary card (LLM or template).
  - Chips listing detected items ("ID number", "Birthday", "Face", "QR code"); tapping a chip highlights its box.
- **Touch-up:** tap a cover to toggle it; "Add cover" mode to draw a rectangle.
- **Watermark sheet:** fields for "Sending to" and "Purpose", date auto-filled, live preview.
- **Export:** "Save safe copy" / "Share safe copy". Confirmation: "Location data removed. Original stays on your device."
- **Colors (suggested):** deep green primary (trust), amber for medium, red for high risk, neutral background. Dark mode supported.

---

## 11. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React + Vite + TypeScript |
| PWA / offline | `vite-plugin-pwa` (Workbox) |
| OCR | `tesseract.js` (local worker, core and language paths) |
| Face detection | `@mediapipe/tasks-vision` Face Detector |
| NER | `@huggingface/transformers` (Transformers.js) |
| LLM | `@mlc-ai/web-llm` |
| QR / barcode | `BarcodeDetector` → fallback `jsQR` / `zxing-wasm` |
| Image processing | HTML Canvas / OffscreenCanvas in Web Workers |
| Styling | Tailwind CSS (bundled, no runtime CDN) |
| Hosting (first load only) | Any static host (e.g., GitHub Pages / Vercel) |

### 11.1 Suggested repo structure

```
takip/
├─ public/
│  └─ models/            # bundled OCR lang data, face model, NER files
├─ src/
│  ├─ app/               # screens: Home, Scanning, Review, Watermark, Export
│  ├─ pipeline/
│  │  ├─ ocr.ts
│  │  ├─ faces.ts
│  │  ├─ qr.ts
│  │  ├─ ner.ts
│  │  ├─ patterns.ts     # PH ID / phone / card rules
│  │  ├─ merge.ts        # combine + de-duplicate boxes
│  │  ├─ risk.ts
│  │  └─ summary.ts      # WebLLM + template fallback
│  ├─ render/
│  │  ├─ covers.ts
│  │  ├─ watermark.ts
│  │  └─ export.ts       # flatten + strip metadata
│  ├─ workers/
│  └─ ui/
├─ tests/
│  └─ patterns.test.ts
├─ eval/
│  ├─ results.md         # real test results (no images)
│  └─ private/           # LOCAL ONLY — gitignored, never committed
├─ PRD.md
└─ README.md
```

> ⚠️ `eval/private/` must be in `.gitignore`. **Never commit real IDs or screenshots to the public repo.**

---

## 12. Success Metrics (measured honestly on own test set)

| Metric | Target | How measured |
|---|---|---|
| Sensitive-item recall | ≥ 90% | Items correctly covered ÷ total sensitive items, across ~30 team-made test photos |
| False covers | ≤ 2 per photo | Non-sensitive items covered unnecessarily |
| Network requests during processing | **0** | Browser DevTools + in-app counter, in airplane mode |
| Scan time (mid-range phone) | ≤ 8 s | Timed in app |
| Demo success | 3/3 rehearsal runs succeed in a noisy environment | Rehearsal |

Results are reported **exactly as measured** in `eval/results.md`, including misses.

### 12.1 Test set (created by the team only)
- Team members' own IDs (kept in `eval/private/`, never committed)
- A clearly labeled **"SAMPLE"** test card with made-up details (for public demo and video). It must not replicate a real government ID's design.
- Receipts, bank / e-wallet transfer screenshots, chat screenshots with phone numbers and addresses
- Varied conditions: angled, low light, glare

---

## 13. Build Plan (Agents + Timeline)

| Time (Oct 9–10) | Deliverable | Owner |
|---|---|---|
| 3:30–5:00 PM | Public repo, Vite + React + TS + PWA scaffold, photo input (F1), WebGPU check on demo phone | Codex · Human |
| 5:00–8:00 PM | OCR + pattern rules + cover rendering (F2, F3, F6) | Codex |
| 8:00–10:00 PM | Face + QR detection, NER model, box merge (F4, F5, F3) | Codex |
| 10:00 PM–1:00 AM | Review UI, touch-up, risk scoring, export without EXIF (F7, F8, F9) | Codex |
| 1:00–3:00 AM | Offline precaching, airplane-mode test, network counter (F10, F11); LLM summary + fallback (F12) | Codex · Human |
| 3:00–5:00 AM | Run test set, measure metrics, fix top misses; watermark (F13) | Hermes · Human · Codex |
| 5:00–7:00 AM | README with all disclosures; `eval/results.md` | Hermes |
| 7:00–8:30 AM | ~1-minute demo video; X / LinkedIn post | Human |
| 8:30–9:30 AM | Final review, submit **once** on the Cerebral Valley event page | Human |
| **10:00 AM** | **Code freeze. Repo public.** | — |

### 13.1 Cut order if behind schedule
1. Cut P2 features (F15–F17)
2. Cut watermark (F13)
3. Replace LLM summary with template only (F12 fallback)
4. **Never cut:** F1–F11 (core local AI + offline + export)

---

## 14. Hackathon Alignment

### 14.1 Judging criteria

| Criteria | Weight | How TAKIP addresses it |
|---|---|---|
| Problem & Usefulness | 25% | Real, everyday risk of sharing ID and payment photos; clear target users (§3). |
| Local AI Implementation | 25% | Four local models (OCR, face, NER, LLM). Local is fundamental: cloud redaction would require uploading the image being protected. |
| Technical Execution | 20% | Mature open-source models; image-based input is reliable live; graceful fallbacks. |
| Innovation | 15% | Local AI as a pre-share privacy filter, with risk explanation and anti-reuse watermark. |
| Product & Demo Quality | 15% | One-tap flow; instant before/after; live airplane-mode demo with 0-request counter. |

### 14.2 Rules compliance

| Rule | Compliance |
|---|---|
| Substantially built during the hackathon | New repo created at build start; frequent commits |
| Meaningful AI inference runs locally | All AI inference runs on-device |
| Working product, demonstrated | Live demo on phone in airplane mode |
| Models, APIs, frameworks, tools disclosed | Full list in README (§15) |
| Core works without a cloud AI API | No cloud AI API used at all |
| No pre-existing project | None reused; any existing code/assets disclosed |
| No external help | Built and tested by team members only |
| No fake benchmarks | Real results in `eval/results.md`, including failures |

---

## 15. Submission Requirements

### 15.1 Checklist
- [ ] Project name: **TAKIP**
- [ ] Short description
- [ ] Team members
- [ ] Public GitHub repository (public before 10:00 AM, Oct 10)
- [ ] Demo video (~1 minute)
- [ ] X / LinkedIn video post URL (tag Devin / Cognition, include **#AppBuildersPH**)
- [ ] What runs locally
- [ ] What requires internet
- [ ] Models used
- [ ] Technologies and frameworks
- [ ] APIs and cloud services
- [ ] Existing code and assets
- [ ] AI development tools
- [ ] Answer: *Why does this product benefit from running AI locally?*
- [ ] Submitted **once** (no edits or resubmission allowed)

### 15.2 Short description (draft)
> TAKIP is an on-device privacy filter that automatically finds and covers ID numbers, faces, birthdays, addresses, and account numbers in photos before you share them. All AI runs locally on your phone, works in airplane mode, and your original photo never leaves your device.

### 15.3 What runs locally
OCR (Tesseract.js), face detection (MediaPipe), named-entity recognition (Transformers.js), risk-summary LLM (WebLLM), QR detection, pattern rules, covering, watermarking, and export. **All processing.**

### 15.4 What requires internet
Only the **first load** of the app and the one-time model download. Nothing is uploaded at any time.

### 15.5 AI development tools (disclose)
OpenAI Codex (coding agent), Hermes agent running DeepSeek V4.1 Flash (content, testing, documentation). These were used to **build** the product; neither is part of the product at runtime.

### 15.6 Why does this product benefit from running AI locally?
> TAKIP protects the images people are most afraid to leak: their IDs and personal screenshots. A cloud tool would require uploading the very image it is meant to protect. By running OCR, face detection, entity recognition, and a small language model on the user's own device, TAKIP keeps the original private, works with no internet, responds instantly, and costs nothing per use.

---

## 16. Demo Plan

### 16.1 Live pitch (5 minutes, mall venue)
| Time | Beat |
|---|---|
| 0:00–0:30 | **Hook:** "A seller asks for your ID. You send it. Where does it go next?" |
| 0:30–0:45 | Turn on **airplane mode** in front of the judges; point to the "0 uploads" badge. |
| 0:45–2:15 | Photograph the **SAMPLE** test card → auto-covers → 🔴 High risk summary → add watermark → export. |
| 2:15–3:15 | Load a chat / transfer screenshot → phone number, address, account number covered. |
| 3:15–4:30 | Show real test results, the four local models, and "what runs locally vs. needs internet." |
| 4:30–5:00 | **Close:** "Privacy tools shouldn't need your data. TAKIP never touches the cloud." |

### 16.2 Demo video (~1 minute)
Airplane mode on → photo → covers appear → risk summary → watermark → share. End card: "All AI runs on your device."

### 16.3 Demo safety
- Never show a real, uncovered ID on screen or in the video.
- Use only the clearly labeled **SAMPLE** card with made-up details.
- Have a pre-loaded backup image in case the camera struggles with venue lighting.

---

## 17. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OCR misses text on angled / glare photos | Missed items | Manual touch-up (F7); safety-net digit rule; capture tips; PaddleOCR upgrade (F17) |
| Demo phone lacks WebGPU | No LLM summary | Template fallback (F12); test WebGPU in the first hour; laptop browser as backup device |
| Large model downloads at venue | Slow first load | Pre-load all models on demo devices before the event; verify in airplane mode |
| NER weak on Filipino names / addresses | Missed names / addresses | Label-proximity rules ("Pangalan", "Tirahan", "Brgy.") alongside NER |
| Running out of time | Incomplete product | Cut order in §13.1; core F1–F11 first |
| Real IDs accidentally committed | Privacy breach | `eval/private/` gitignored; review repo before making public |
| Venue lighting / camera issues | Demo failure | Pre-loaded backup images; "Choose Photo" path |

---

## 18. Future Roadmap (post-hackathon)
- Native Android app with system share-sheet integration ("Share → TAKIP → safe copy")
- Signature detection model
- Video and PDF support
- More document types and languages
- Enterprise mode for HR and KYC teams receiving IDs
