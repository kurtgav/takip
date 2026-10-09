# TAKIP — Human-QA Test Plan (30 cases)

> Owner: Hermes (docs) · Session 1, updated Session 2 (2026-10-09 16:46 Asia/Manila)
> Purpose: a **person** runs these 30 cases against the real app and records what actually
> happens. The **Result** column is filled **by hand** — nothing here is pre-recorded, and no
> result is asserted as passing.
> ⚠️ **Re-check before use:** the app is still changing (Phase 4 in progress). Confirm expected
> values against the running build and the latest `DECISIONS.md` before treating any row as a
> requirement.

## Build status (honest)
Implemented and verified so far: photo input, on-device OCR, the §7 pattern rules, solid
covering, MediaPipe face detection, ZXing QR/barcode, Transformers.js NER, and box merge. The
review UI (before/after, risk banner, chips, touch-up), export with metadata stripping, the
**live** network counter, the local-LLM summary and the watermark are **not built yet**. So:
cases that check the **detection + covering** are runnable now; cases whose "Expected result"
names the risk banner, touch-up, watermark or "0 requests" counter **cannot pass yet** — mark
them **BLOCKED (feature not built)**, not failed.

## How to record
1. Run each case on the built app (Chrome, desktop first, then an Android phone).
2. Fill **Result** with **PASS / FAIL / BLOCKED** and one line of what you saw.
3. If a case **FAILS**, that is a finding — record it; do not hide it.
4. Cases that need a specific fixture say so in **Setup**.
5. Copy the finished table's failures into `eval/results.md` (which does not exist yet).

## Conventions
- **Fixtures are synthetic.** Use the committed sample and your own clearly-fake documents.
  Never a real ID, never a real person's number.
- **Cover** = solid black rectangle with no readable pixels.
- **Detected** = flagged or covered. **Uncovered** = still readable.
- Risk levels are the PRD §8 bands: **High** (card/account number, QR on an ID, ≥2 strong
  categories, or any strong under glare), **Medium** (name+phone, address alone, face+name, or
  several minor categories), **Low** (single minor field or clean).
- **Document titles, agency names and field labels** (e.g. "REPUBLIC OF THE PHILIPPINES",
  "Name") are **never** covered by default (PRD §7) — the photo must stay useful. Verify this
  in TC-02/TC-03.

### Three verified-behaviour notes that override the PRD wording
- **QR codes always score High.** PRD P2 document-classification (ID vs receipt) is not
  implemented, so the app is deliberately conservative: *any* QR/barcode pushes risk to High.
- **Reference / transaction numbers are detected but left UNCOVERED by default** (PRD §7
  optional-cover rule — the user may add a cover). So "reference no." appears under
  **Detected** but **not** under **Expected covers**.
- **Unknown long digit runs score Medium** (PRD §8 safety-net band, P9).

---

## Test cases

| # | Case | Setup (synthetic) | Expected detections | Expected covers | Expected risk | Expected UX | Result |
|---|---|---|---|---|---|---|---|
| TC-01 | Clean landscape photo | Garden photo, no text/faces | None | None | Low | "Nothing sensitive found." *(banner not built yet)* | |
| TC-02 | PH Driver's License | Fake DL, clearly-marked sample | Name, DOB, license no., address, face | All of those | High | License no. unreadable | |
| TC-03 | PH National ID (PhilSys) | Fake PhilSys-style card | Name, DOB, ID no., face, address | All of those | High | ID no. unreadable | |
| TC-04 | Passport data page | Fake passport page | Name, DOB, passport no., face, country | All of those | High | MRZ bottom lines covered | |
| TC-05 | ID with QR code | Fake ID + QR | ID fields + QR | QR + ID fields | High | QR not scannable after cover | |
| TC-06 | QR-only card | Business card, just a QR | QR | QR | High | QR covered | |
| TC-07 | UMID card | Fake UMID | Name, CRN/UMID no., DOB, face | All of those | High | CRN unreadable | |
| TC-08 | Postal ID | Fake postal ID | Name, address, ID no., face | All of those | High | ID no. unreadable | |
| TC-09 | TIN card | Fake TIN, format 123-456-789-000 | Name, TIN | Both | High | TIN unreadable | |
| TC-10 | SSS / Pag-IBIG / PhilHealth card | Fake SSS, Pag-IBIG or PhilHealth card | Name, member no., face | All of those | High | Member no. unreadable | |
| TC-11 | Bank statement | Fake statement, amounts visible | Acct no., name, address | Acct no., name, address | High | Acct no. unreadable | |
| TC-12 | Credit/debit card | Fake card, 0000-0000-0000-0000 | Card no., name, expiry, CVV area | All of those | High | Card no. unreadable | |
| TC-13 | Mobile screenshot (GCash) | Fake screenshot with phone + balance | Phone, any acct/ref no., name | Phone, name | High | Phone unreadable | |
| TC-14 | Chat screenshot | Fake chat: phone + email | Phone, email | Both | Medium | Both unreadable | |
| TC-15 | Group photo | 4 faces, no text | 4 face boxes | All 4 covered | High | Every face covered | |
| TC-16 | Events photo | 3 faces + background text | 3 faces | Faces covered | Medium | Faces covered | |
| TC-17 | Receipt (parcel) | Fake receipt, no card | Name, address, order no. | Name, address | Medium | Order no. covered? (see note) | |
| TC-18 | Receipt with card | Fake receipt, last-4 + ref no. | Card no., ref no. | Card no. (ref no. optional) | High | Card no. unreadable | |
| TC-19 | Glare on card | Card no. under glare | Best-effort card no./name | Any found | High | Best-effort; weak = uncovered | |
| TC-20 | Low light on ID | ID in low light, half-shadowed | Some fields only | Those found | High | Unclear = uncovered; state it | |
| TC-21 | Rotated ID 90° | ID sideways | If OCR handles rotation | Those found | High | Note: rotation may reduce detection | |
| TC-22 | ID at an angle | Skewed ID | Some fields | Those found | High | Skew may reduce detection | |
| TC-23 | Small text | ID with tiny footer text | Best-effort | Any found | Medium | Tiny text may be mixed | |
| TC-24 | Business card | Name, mobile, email, address | All four | All four | Medium | All unreadable | |
| TC-25 | Junior's ID (school) | Fake student ID, name, school | Name, school, face | Name, face (school optional) | Medium | Name unreadable | |
| TC-26 | ID + handwritten note | Printed ID + handwriting | Printed fields + QR | Those found | High | Handwriting may remain; flag it | |
| TC-27 | Full personal set | Name, mobile, email, address, QR | All of them | All of them | High | Nothing readable | |
| TC-28 | Just a number (no label) | Blank card, 9+ digit number | The digit run (safety net) | The digit run | Medium | Number unreadable | |
| TC-29 | Clean, text-free | Blank wallpaper photo | None | None | Low | "Nothing sensitive found." | |
| TC-30 | Blurry ID | Out-of-focus ID | Little/nothing | Any found | Low | Must warn text is unclear | |

---

## Edge cases to watch (record findings here)
- **TC-17 / TC-18 (receipts).** No card → Medium; card present → High. **Reference/transaction
  numbers are detected but not covered by default** — confirm the app leaves them readable and
  offers a manual cover.
- **TC-19 (glare).** Any strong field under glare should still read **High**; verify the risk
  does not drop just because detection was hard.
- **TC-21 / TC-22 (rotation, angle).** These are known-hard for OCR; expect reduced detection.
  Record the **actual** miss rate — do not round up.
- **TC-26 (handwriting).** Expect handwriting to survive. This is a documented limitation, not
  a bug — record it in `eval/results.md`.
- **TC-30 (blurry).** The app should say text is unclear rather than silently passing.

## Metrics to compute from the filled table (for `eval/results.md`)
- **Detection rate** = cases with the expected cover ÷ total runnable cases.
- **False-cover rate** = clean cases (TC-01, TC-29) that got an unnecessary cover.
- **Time to scan** (seconds), median and worst case, per device.
- **Misses that matter** — list every case where a *strong* field stayed readable. These go in
  the write-up, not just a clean summary.
