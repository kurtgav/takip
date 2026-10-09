# TAKIP — Test Plan (30 cases)

> Owner: Hermes (docs) · First written: 2026-10-09 16:2x Asia/Manila · Session 1
> Companion to `PRD.md`. Results go in this file (fill the **Result** column) and the
> headline numbers go in `eval/results.md` (owned by the builder).

## Build status (honest)

As of **2026-10-09 16:2x (Asia/Manila)** the TAKIP application has **not been built yet**:
the repo contains only `PRD.md`, the orchestrator kit and this docs set. The one build
agent (Codex) has exited on every session so far with an invalid-flag error
(`codex exec --full-auto` is not accepted by the installed Codex CLI — see
`logs/codex-00N.log`). No `src/`, `tests/`, `README.md`, `PROGRESS.md`, `DECISIONS.md` or
`eval/results.md` exists.

Consequence for this plan: **every test case below is "NOT YET RUN".** The plan states what
*should* be covered once the app runs; it does **not** record results. Do not report any
row as passing until the app exists and a human has actually run it.

## What this test set is

- **Synthetic / team-made data only.** No real IDs, no real screenshots, no real personal
  data — ever, in this file or in the repo.
- Every image is built by the team and clearly marked **SAMPLE**; details are invented and
  the design must **not** copy any real government document (PRD §12.1).
- 30 cases cover **every sensitive-data category in PRD §7**, across the document types and
  shooting conditions the demo will face.

## Condition codes

| Code | Condition | How to shoot |
|---|---|---|
| **N** | Normal | Even light, phone flat over the document, sharp text |
| **A** | Angled | ~30–45° tilt, mild perspective skew |
| **G** | Glare | Bright point/reflection over part of the text (flash or window) |
| **L** | Low light | Dim indoor light, visible sensor noise |

## Test set inventory (create these synthetic assets first)

All values are fake. Put working copies in `eval/private/` (git-ignored). Put only
cover/blur samples in the repo if a screenshot is needed.

| Asset | Document type | Fake content to include | Used by |
|---|---|---|---|
| S1 | SAMPLE ID card, front | ID photo (face), "JUAN SAMPLE DELA CRUZ", DOB `1994-03-12`, address "12 Sampaguita St., Brgy. Sample, Quezon City", PhilSys-style `1234-5678-9012-3456`, email `juan.sample@example.com` | TC-01…04, TC-30 |
| S2 | SAMPLE ID card, back | address again, `QR` code, a barcode, an unlabeled 9+ digit "document control no." | TC-05, TC-06 |
| S3 | SAMPLE driver's-license-style card | face, name, DOB, address, license no. `A01-23-456789`, mobile `0917-000-0000` | TC-07, TC-08 |
| S4 | SAMPLE passport-style data page | face, name, DOB, passport no. `P1234567`, place of birth, MRZ-style line | TC-09, TC-10 |
| S5 | SAMPLE employment / rental form | name, DOB, address, `TIN 123-456-789-000`, `SSS 12-3456789-0`, `PhilHealth 12-345678901-2`, `Pag-IBIG 1234-5678-9012`, mobile, email | TC-11, TC-12 |
| S6 | SAMPLE UMID-style card | face, name, DOB, `CRN/UMID 1234-5678901-2`, address | TC-13 |
| S7 | SAMPLE TIN ID card | name, `TIN 123-456-789`, address, DOB | TC-14 |
| S8 | SAMPLE PhilHealth card | name, `PhilHealth 12-345678901-2`, DOB | TC-15 |
| S9 | SAMPLE Pag-IBIG card | name, `Pag-IBIG MID 1234-5678-9012`, DOB | TC-16 |
| S10 | SAMPLE SSS card | name, `SSS 12-3456789-0`, DOB | TC-17 |
| S11 | Store receipt | card line `4111 1111 1111 1111` (test card), `Ref No. 123456`, QR, store name | TC-18, TC-19 |
| S12 | Bank transfer screenshot | sender name, account no. `1234-5678-9012`, `Ref No. 987654321`, mobile on the notice | TC-20 |
| S13 | E-wallet transfer screenshot | name, mobile `0917-000-0000`, account/mobile no., `Ref No. 000123456789` | TC-21, TC-22 |
| S14 | Marketplace chat screenshot | buyer mobile `0917-000-0000`, delivery address, buyer name | TC-23, TC-24 |
| S15 | Online-lending app screenshot | name, mobile, account no., `Ref No.`, email | TC-25 |
| S16 | Courier / parcel label | name, address, mobile, QR/barcode, tracking no. `PH0000000000` | TC-26 |
| S17 | Business card / contact screenshot | name, mobile, email, address, QR | TC-27 |
| S18 | "Safety-net" note | a lone unlabeled 9+ digit number on plain paper, no label | TC-28 |
| S19 | Clean control | a product/landscape photo with brand text only — **no personal data** | TC-29 |
| S20 | "Hard" combined card | S1 content plus mobile + email, shot badly | TC-30 |

## The 30 test cases

`Expected covers` = what the app should permanently cover (solid fill / heavy pixelation,
flattened into the export — PRD F6). `Risk` is the expected risk level per PRD §8.2.
**Result** is left blank for the human: record `PASS` / `FAIL`, the risk shown, the items
actually covered, and any misses.

| # | Document type | Condition | Sensitive items present | Expected covers | Risk | Result |
|---|---|---|---|---|---|---|
| TC-01 | SAMPLE ID front (S1) | N | face, full name, birthday, address, PhilSys 16-digit | Face · Full name · Birthday · Address · PhilSys number | High | |
| TC-02 | SAMPLE ID front (S1) | A | same as TC-01 | same as TC-01 | High | |
| TC-03 | SAMPLE ID front (S1) | G | same as TC-01 | same as TC-01 | High | |
| TC-04 | SAMPLE ID front (S1) | L | same as TC-01 | same as TC-01 | High | |
| TC-05 | SAMPLE ID back (S2) | N | QR code, barcode, address, unlabeled 9+ digits | QR/barcode · Address · Safety-net digits | High | |
| TC-06 | SAMPLE ID back (S2) | G | QR code, address | QR/barcode · Address | High | |
| TC-07 | Driver's-license style (S3) | N | face, name, birthday, address, license no., mobile | Face · Full name · Birthday · Address · DL number · Mobile | High | |
| TC-08 | Driver's-license style (S3) | A | same as TC-07 | same as TC-07 | High | |
| TC-09 | Passport data page (S4) | N | face, name, birthday, passport no. | Face · Full name · Birthday · Passport number | High | |
| TC-10 | Passport data page (S4) | L | same as TC-09 | same as TC-09 | High | |
| TC-11 | Employment / rental form (S5) | N | name, birthday, address, TIN, SSS, PhilHealth, Pag-IBIG, mobile, email | Full name · Birthday · Address · TIN · SSS · PhilHealth · Pag-IBIG · Mobile · Email | High | |
| TC-12 | Employment / rental form (S5) | A | same as TC-11 | same as TC-11 | High | |
| TC-13 | UMID-style card (S6) | N | face, name, birthday, UMID/CRN no., address | Face · Full name · Birthday · UMID/CRN · Address | High | |
| TC-14 | TIN ID card (S7) | N | name, TIN, address, birthday | Full name · TIN · Address · Birthday | High | |
| TC-15 | PhilHealth card (S8) | N | name, PhilHealth no., birthday | Full name · PhilHealth · Birthday | High | |
| TC-16 | Pag-IBIG card (S9) | N | name, Pag-IBIG MID, birthday | Full name · Pag-IBIG MID · Birthday | High | |
| TC-17 | SSS card (S10) | N | name, SSS no., birthday | Full name · SSS · Birthday | High | |
| TC-18 | Store receipt (S11) | N | card/account number, ref/transaction no., QR | Card/account no. · Reference no. · QR/barcode | High | |
| TC-19 | Store receipt (S11) | G | card/account number, ref no. | Card/account no. · Reference no. | Medium | |
| TC-20 | Bank transfer screenshot (S12) | N | name, account number, ref no. | Full name · Account no. · Reference no. | High | |
| TC-21 | E-wallet transfer screenshot (S13) | N | name, mobile, account no., ref no. | Full name · Mobile · Account no. · Reference no. | High | |
| TC-22 | E-wallet transfer screenshot (S13) | L | same as TC-21 | same as TC-21 | High | |
| TC-23 | Marketplace chat screenshot (S14) | N | mobile, delivery address, buyer name | Mobile · Address | Medium | |
| TC-24 | Marketplace chat screenshot (S14) | G | mobile, address | Mobile · Address | Medium | |
| TC-25 | Lending app screenshot (S15) | N | name, mobile, account no., ref no., email | Full name · Mobile · Account no. · Reference no. · Email | High | |
| TC-26 | Courier / parcel label (S16) | N | name, address, mobile, QR/barcode, tracking no. | Full name · Address · Mobile · QR/barcode · Reference no. · Safety-net digits | High | |
| TC-27 | Business card screenshot (S17) | N | name, mobile, email, address, QR | Full name · Mobile · Email · Address · QR/barcode | Medium | |
| TC-28 | Safety-net note (S18) | N | a lone 9+ digit number, no label | Safety-net cover (on by default; user can uncover) | Low | |
| TC-29 | Clean control (S19) | N | **none** (brand/logo text only) | **none** — must not cover brand text (false-cover check) | Low | |
| TC-30 | "Hard" combined card (S20) | A + L | face, name, birthday, address, PhilSys, mobile, email | Face · Full name · Birthday · Address · PhilSys · Mobile · Email | High | |

## Coverage check — PRD §7 category → cases

| PRD §7 category | Covered by |
|---|---|
| Face | TC-01, 07, 09, 13, 30 |
| Full name | TC-01, 07, 09, 11, 13, 14, 15, 16, 17, 20, 21, 25, 26, 27, 30 |
| Birthday | TC-01, 07, 09, 11, 13, 14, 15, 16, 17, 30 |
| Address | TC-01, 05, 07, 11, 13, 14, 23, 24, 26, 27, 30 |
| PhilSys / National ID number | TC-01, 30 |
| TIN | TC-11, 14 |
| SSS number | TC-11, 17 |
| UMID / CRN | TC-13 |
| PhilHealth number | TC-11, 15 |
| Pag-IBIG MID | TC-11, 16 |
| Driver's license number | TC-07, 08 |
| Passport number | TC-09, 10 |
| Mobile number | TC-07, 11, 21, 22, 23, 24, 25, 26, 27, 30 |
| Card / account number | TC-18, 19, 20, 21, 22, 25 |
| Reference / transaction number | TC-18, 19, 20, 21, 25, 26 |
| Email address | TC-11, 25, 27, 30 |
| QR code / barcode | TC-05, 06, 18, 26, 27 |
| Safety net (9+ unlabeled digits) | TC-05, 26, 28 |

## How to run and record

1. Create the synthetic assets (S1–S20) and store working copies in `eval/private/`.
2. For each case: load the image in TAKIP, run the scan, and compare what was covered
   against **Expected covers**. For TC-29 confirm nothing is covered.
3. In the **Result** cell write: `PASS`/`FAIL`, the risk level the app showed, the items
   actually covered, and every miss or false cover.
4. Roll up into `eval/results.md` (PRD §12): sensitive-item recall %, false covers per
   photo, scan time, and the 0-network-request check. **Report misses honestly.**

> Reminder: this plan is written against the PRD design. Re-check every "Expected covers"
> value against the shipped app once it exists, because the built behaviour is the only
> truth for the submission.
