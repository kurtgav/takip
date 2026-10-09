# TAKIP — Manual test plan (30 cases)

> Owner: Hermes (docs) · Session 1 created, updated Session 3 (2026-10-09 18:5x Asia/Manila).
> Goal: measure the PRD §12 metrics honestly — **sensitive-item recall**, **false covers**,
> **scan time** and **demo success** — across ~30 team-made photos covering every category in
> PRD §7, under varied conditions (angle, glare, low light). "Measured honestly" is the whole
> point: record misses, not just hits.
>
> **Data rule — synthetic / team-made only.** Use the clearly labeled **SAMPLE** card with
> made-up details, team-drawn fixtures, or the committed synthetic portrait. Real IDs live only
> in `eval/private/` (git-ignored, never committed) and are used only to run the numbers — never
> in the public demo, screenshots or video (PRD §16.3).

## Build status (read first — 2026-10-09 18:5x)

The app is **built**: PRD **F1–F16 are implemented and verified** in the automated browser suite;
**F17 (PaddleOCR)** is deferred. `eval/results.md` records the executed automated results:
`npm run lint`, `npm run typecheck`, `npm test` (**30/30 unit**), `npm run build`, and
`npm run test:browser` (**11/11 browser tests, 2.7 min**) all PASSED, including the full
photo → scan → covers → risk summary → watermark → flattened metadata-free export flow, a fresh
offline reload, and a zero-processing-request network log.

**Therefore every case below is now RUNNABLE — no case is blocked on a missing feature.** What is
**NOT yet run** (and is exactly why this plan exists) is the human pass over real photos on a real
phone: **recall / false-cover / scan-time metrics and the venue rehearsals are NOT YET RUN.** Do not
copy automated pass/fail into the Result column; the automated synthetic cases prove specific code
paths, not general accuracy.

### Verified behaviour the "Expected" columns encode

- **QR/barcode → always `High`** (conservative; there is no document classifier, so QR is never
  under-rated). **Unknown long digit runs (9+) → `Medium`, covered by the safety-net rule.**
  **Multiple minor exposed categories → `Medium`.** A single minor category → `Low`.
- **Reference / transaction numbers** (labelled "Ref No.", "Reference") are **detected but left
  uncovered by default** (PRD §7 optional-cover rule). The user covers them in review if wanted.
- **Document titles and field labels** ("REPUBLIC OF THE PHILIPPINES", "Pangalan", "Address") are
  **never covered by default** — they must stay visible to keep the photo useful. Covering a label
  counts as a **false cover**.
- **Birthday alone is not evidence of an ID** — the document *guess* stays `Unknown`/generic on a
  birthday-only image; the date is still detected and covered.
- Covers are **opaque solid black**, flattened into the exported PNG. **Export strips metadata**
  (canvas re-encode; no `eXIf`/`iTXt`/`tEXt`/`zTXt`). Offline flow shows **0 requests · 0 blocked
  attempts** during processing.

## How to run (per case)

1. Serve the **production** build over **HTTPS** (`npm run build && npm run preview`, behind HTTPS
   for a phone), open on the target device, wait for **Ready offline** and enabled photo buttons.
2. (Optional) download the smart-summary model while online if testing the local-LLM summary.
3. Turn on **airplane mode** (Wi-Fi off too), reload, wait for **Ready offline** again.
4. Run the case: Choose/Take Photo → scan → review → (as the case says) watermark → check the
   mandatory review box → **Save safe copy / Share**.
5. Record, per case: **covered correctly** (hit / miss), **false covers**, **scan time** (the UI
   shows it), and any condition notes. Count hits ÷ total sensitive items for recall.

## Recording sheet (fill the **Result** column — leave blank until actually run)

Legend — Result: `PASS` / `PARTIAL` (misses) / `FAIL`; Risk: Low/Med/**High**; Cover: ✔ covered by
default, ✎ left uncovered by default (user decides).

| # | Document type | Condition | SAMPLE / synthetic test data | Expected detections → covers | Expected risk | Result |
|---|---|---|---|---|---|---|
| 01 | PH **Driver's License** (front) | clean, straight, good light | fake name "Sample Person", DL `A01-23-456789`, DOB, address, face | name ✔, DOB ✔, address ✔, DL no. ✔, face ✔; **agency title/labels not covered** | High | |
| 02 | **PhilSys / National ID** (front) | clean | 16-digit `1234-5678-9012-3456`, name, DOB, address, face, QR | 16-digit ✔, name ✔, DOB ✔, address ✔, face ✔, QR ✔ | High | |
| 03 | **Passport** data page | clean | passport `P1234567A`, name, DOB, face | passport no. ✔, name ✔, DOB ✔, face ✔ | High | |
| 04 | **UMID / CRN** | clean | CRN `1234-1234567-8`, name, DOB, face | CRN ✔, name ✔, DOB ✔, face ✔ | High | |
| 05 | **TIN** card | clean | TIN `123-456-789-000`, name, address | TIN ✔, name ✔, address ✔ | High | |
| 06 | **SSS** ID / E-1 form | clean | SSS `34-1234567-8`, name, DOB | SSS ✔, name ✔, DOB ✔ | High | |
| 07 | **PhilHealth** ID | clean | PhilHealth `12-345678901-2`, name, DOB | PhilHealth no. ✔, name ✔, DOB ✔ | High | |
| 08 | **Pag-IBIG** MID / Loyalty card | clean | MID `1234-5678-9012`, name, DOB | MID ✔, name ✔, DOB ✔ | High | |
| 09 | **Birth certificate** snippet | clean | name + "Date of Birth: 09/10/1998" only | DOB ✔, name ✔; **guess stays non-ID (birthday alone)** | Medium | |
| 10 | **Barangay clearance** / utility bill | clean | name + address (Brgy., St., City, Province) | name ✔, address ✔; **address keywords not over-covered** | Medium | |
| 11 | **Business card** | clean | name, mobile `0917 123 4567`, email, address | name ✔, mobile ✔, email ✔, address ✔; **company name/title not covered** | Medium | |
| 12 | **Email signature** block | clean | `sample@example.invalid` only | email ✔ | Low | |
| 13 | **Chat screenshot** — phone number | clean | "0917 123 4567" in message text | mobile ✔ (spaces handled) | Low | |
| 14 | **Bank transfer** screenshot | clean | account no. (12–19 digit), name, "Ref No. 000123456" | account ✔ (Luhn), name ✔; **Ref No. ✎ uncovered by default** | Medium | |
| 15 | **E-wallet (GCash)** receipt | clean | phone, amount, "Reference 000123456789" | phone ✔; **reference ✎ uncovered by default** | Medium | |
| 16 | **Credit / debit card** (both sides) | clean | 16-digit Luhn `4111 1111 1111 1111`, expiry, name | card no. ✔, name ✔; expiry covered if detected | High | |
| 17 | **QR code only** (encodes vCard) | clean | generated QR, no readable text | QR ✔ | High | |
| 18 | **Parcel label with Code128** | clean | Code128 + recipient name + address | barcode ✔, name ✔, address ✔ | Medium | |
| 19 | **National ID back** (MRZ + barcode) | clean | 16-digit run, name, barcode, MRZ digits | 16-digit ✔, name ✔, barcode ✔, MRZ digits ✔ | High | |
| 20 | **Receipt** with card last-4 + phone | clean | "**** 1234", phone `09171234567` | phone ✔; **4 digits alone NOT covered (below 9-digit net)** | Medium | |
| 21 | **ID number** under **glare** | **glare** over the number | SAMPLE ID, specular highlight on the ID no. | best-effort: number may be **missed** → judge manual review | High | |
| 22 | **ID** in **low light** | **low light** | SAMPLE ID, underexposed | best-effort: partial OCR; expect misses on small text | High | |
| 23 | **ID** photographed **at ~30°** | **angle** | SAMPLE ID, tilted | best-effort: partial; F17 deferred (see limits) | High | |
| 24 | **ID rotated 90° / 180°** | rotated | SAMPLE ID sideways/upside-down | browser orientation should recover it; verify | High | |
| 25 | **Small ID photo** inside a full-page scan | small text | A4 page with a small ID region + text | face ✔ + small-text tile OCR | Medium | |
| 26 | **Blurry / out-of-focus ID** | **blur** | SAMPLE ID, defocused | best-effort: partial; expect misses | High | |
| 27 | **Rich chat screenshot** | clean | name + phone + address + email in one thread | name ✔, phone ✔, address ✔, email ✔ | Medium | |
| 28 | **Group photo** (3 faces, no IDs) | clean | synthetic 3-person scene | 3 faces ✔; no text | Medium | |
| 29 | **Text-free landscape** | clean | no text, no faces, no codes | **nothing detected → no covers** (false-cover check) | Low | |
| 30 | **Unlabelled long digit run** (safety net) | clean | bare `987654321098` with no label | digits ✔ (safety net); user can uncover | Medium | |

## PRD §7 coverage map (proof every category is exercised)

| §7 category | Cases |
|---|---|
| Face | 01, 02, 03, 04, 28 |
| Full name | 01, 02, 03, 05, 09, 10, 11, 14, 18, 19, 27 |
| Birthday | 01, 02, 03, 04, 06, 07, 08, 09 |
| Address | 01, 02, 05, 10, 11, 18, 27 |
| PhilSys / National ID no. | 02, 19 |
| TIN | 05 |
| SSS number | 06 |
| UMID / CRN | 04 |
| PhilHealth number | 07 |
| Pag-IBIG MID | 08 |
| Driver's license number | 01 |
| Passport number | 03 |
| Mobile number | 11, 13, 15, 20, 27 |
| Card / account number (Luhn) | 14, 16 |
| Reference / transaction number | 14, 15 |
| Email address | 11, 12, 27 |
| QR code / barcode | 02, 17, 18, 19 |
| Safety net (9+ unlabelled digits) | 19, 20, 30 |

**Never covered by default:** document titles, agency names, field labels (checked as *false
covers* in cases 01, 05, 10, 11).

## Conditions covered
angle (23), glare (21), low light (22), blur (26), rotation (24), small text (25), mixed
content (27), negative control (29), safety-net probe (30).

## Scoring the run (PRD §12)

- **Sensitive-item recall** = items covered correctly ÷ total sensitive items across the ~30
  photos. Target **≥ 90%**.
- **False covers** = non-sensitive items covered (incl. labels/titles) **≤ 2 per photo**.
- **Scan time** on a mid-range phone **≤ 8 s** (timed in the app).
- **Demo success** = 3/3 rehearsal runs succeed in a noisy environment.

Write the real numbers, **misses included**, into `eval/results.md`. If a target is missed, say so
and name the miss — that is the rule the judges score on.

## Notes / limits

- `eval/private/` holds any real test photos: **git-ignored, never committed, never shown**.
- Automated browser tests pass on synthetic fixtures; they are **not** a phone scan benchmark and
  do not establish recall. This plan is the only source of the §12 metrics.
- Physical camera capture, native OS share sheet, Safari/iOS and phone scan timing remain
  **NOT RUN** until executed on a real device (see `eval/results.md` → "Not yet measured").
