# Privacy redaction fields for Philippine IDs and payment cards

> Research date: 2026-10-10. Product guidance for TAKIP's offline sharing workflow; not legal advice or a claim that every field must always be redacted.

## How to use this matrix

Philippine privacy rules are purpose- and proportionality-based. The Data Privacy Act (DPA) treats information about health and education, and information issued by government agencies peculiar to an individual, as sensitive personal information. It also requires personal data processing to be adequate, relevant, necessary, and not excessive. These rules do not create one universal mask list for every sharing context. [NPC, Data Privacy Act][npc-dpa]

TAKIP should use these product priorities:

- **High — cover by default:** holder-specific identifiers, payment credentials, machine-readable repeats, contact/address data, portraits, holder signatures, and fields that materially enable identity fraud or account misuse.
- **Review — suggest or let the user choose:** holder attributes that may be needed for the sharing purpose, or which become risky mainly when combined with other fields.
- **Optional — lower priority:** issuer branding and generic institutional or office metadata. These fields should not create a High rating by themselves. Offer a separate “Hide institution/issuer” control when the user wants to conceal affiliation or document origin.

NPC Circular 2023-03 covers organizational IDs including company, school, insurance, membership, and loyalty IDs. It says cards should contain only personal data necessary for their purpose and should not contain excessive information. It excludes IDs issued by government agencies under their regulatory mandate, such as passports, driver's licenses, PhilIDs, and TIN cards; the DPA's general principles still apply. [NPC Circular 2023-03][npc-id-circular]

## Field matrix

| Document | High — cover by default | Review — purpose-dependent | Optional — lower priority, not High by itself | Source-grounded notes |
|---|---|---|---|---|
| **Philippine passport** | Passport number wherever it appears; both complete MRZ rows; full name; birth date and place; portrait and ghost/secondary portrait; holder signature; any microtext or hidden/coded portrait region that repeats holder name or passport number | Sex, nationality, issue date, expiry date | `P` document type, `PHL` country code, `DFA MANILA`/issuing authority, Republic/DFA labels and graphics, generic official or signing-officer signature | DFA specimen pages show passport number, biographic fields, portrait, issuing authority, and two MRZ rows. ICAO defines MRZ contents including document number, name, nationality, birth date, sex, expiry, and check digits. DFA also describes hidden encoding of holder name and passport number in the portrait; another DFA instruction places the holder's signature on page 3. Cover every duplicate, not only the largest printed value. [DFA specimen][dfa-passport-sample] [ICAO Doc 9303-4][icao-9303] [DFA ePassport security advisory][dfa-security] [DFA holder-signature instruction][dfa-signature] |
| **LTO driver's license** | License number; card serial; barcode/2D code; full name; birth date; address; portrait; licensee signature; blood type and medical conditions | Sex, nationality, height, weight, eye color, DL codes/restrictions, issue/expiry dates | LTO/Republic labels and seal, agency code, generic card title, official signatory name/title/signature | LTO's official field manual specimen shows these front fields and a back serial plus 2D code. Agency code identifies an office; it is different from the holder's license number. [LTO field manual][lto-license] |
| **School/student ID** | Student number; LRN; QR/barcode or other encoded credential; full name; birth date; portrait; holder signature; personal phone/email/address; course/program, year level, section, grades or other education data when present | Campus, department, enrollment/validity dates | School name/logo, generic campus address or hotline, generic emergency instructions, issuer-authorized signature; DepEd School ID or other identifier of the institution rather than the learner | DepEd defines the LRN as one permanent 12-digit learner number and directs that learner identity and reasonably identifying information be confidential. Education information is sensitive personal information under the DPA. For private-sector school IDs, NPC Circular 2023-03 requires necessity and proportionality. [DepEd LRN order][deped-lrn] [NPC school-record opinion][npc-school-records] [NPC Circular 2023-03][npc-id-circular] |
| **Employee/company ID** | Employee/personnel number; QR/barcode/access credential; full name; portrait; holder signature; personal phone/email/address; any government ID, payroll, bank, or account number | Job title, department, work location, shift, employment/validity dates | Employer name/logo, generic office address or switchboard, generic return instructions, issuer-authorized signature | NPC has applied transparency, legitimate purpose, and proportionality to a proposed company ID containing government numbers, birth/health data, and emergency-contact details. Professional information also remains personal information even when publicly available. Organization-only metadata should remain optional; employee-linked fields deserve review or default cover according to risk. [NPC company-ID opinion][npc-company-id] [NPC professional-information opinion][npc-professional] [NPC Circular 2023-03][npc-id-circular] |
| **Bank debit/credit/payment card** | Full PAN/card number; bank account number if separately printed; CVV/CVC/CID; expiry; cardholder name; holder signature; QR/barcode; visible PIN/OTP or full-track data in screenshots/readouts | Issue/member-since date; card sequence/reference number | Bank/issuer name and logo, card-network logo, generic hotline/website, EMV/contactless symbols, chip or magnetic stripe as a generic photographed object | PCI SSC defines PAN, cardholder name, service code, and expiration as cardholder data. CVV/CVC/CID and full track data are sensitive authentication data; CVV must not be stored after authorization, even encrypted. BSP tells consumers not to disclose card number, CVV, OTP, PIN, ID number, or other sensitive data. A photograph of a generic chip or stripe does not expose its encoded contents; cover visible/decoded values, CVV, and signature rather than treating the object alone as a secret. Display masking guidance permits only the BIN and last four digits where a business need exists; TAKIP's public-sharing default should cover the whole PAN unless the user explicitly needs a partial reference. [PCI account-data FAQ][pci-account-data] [PCI CVV FAQ][pci-cvv] [PCI masking FAQ][pci-masking] [BSP fraud guide][bsp-fraud] |
| **SSS / UMID** | SS number; CRN; card serial; QR/barcode; full name; birth date; address; portrait/ghost image; holder signature; visible fingerprint images | Sex, issue/expiry dates | SSS/GSIS/Republic name and logo, issuing-agency name, generic return instructions, office/branch name, issuer official's signature, generic chip/magnetic-stripe object | UMID rules define the CRN as a lifetime unique identifier and distinguish it from control information such as issuing agency, issuance/expiry dates, and return instructions. The official SSS card design shows CRN and demographic fields; the SSS form separately uses SS number and CRN. Do not conflate the two. [UMID implementing rules][umid-rules] [SSS UMID design][sss-umid-design] [SSS UMID form][sss-umid-form] |
| **BIR TIN card / Digital TIN ID** | TIN, including branch suffix when shown; QR code; card serial; registered name; residential address; birth date; taxpayer's portrait; taxpayer/holder signature | Date of issue | BIR/DOF names and logos, RDO code/name, generic BIR contact details, Commissioner/issuer signature | BIR says the card bears a permanent TIN. Physical-card rules list serial, registered name, TIN, address, birth date, issue date, taxpayer signature, and photo. Digital TIN IDs use a QR code for verification and do not require a holder signature. Distinguish taxpayer signature from the Commissioner's issuer signature. [BIR TIN card specimen][bir-tin-card] [BIR physical-card fields][bir-card-fields] [BIR Digital TIN ID circular][bir-digital-tin] |
| **Pag-IBIG / HDMF** | Pag-IBIG MID; Registration Tracking Number (RTN); MP2 account number; QR/barcode; full name; birth date; address/contact details; portrait; holder signature; any TIN, SSS/GSIS number, CRN, employee number, bank account/PAN, CVV, or expiry printed on a combined form/card | Employer, occupation, employment status, membership category | Pag-IBIG name/logo, branch, generic contact details, partner-bank branding | Pag-IBIG defines the MID as a unique 12-digit number and the RTN as a system-generated post-registration number. Loyalty Card Plus applications can combine MID with other government, employee, employment, and bank-related data, so field labels and document context matter. [Pag-IBIG Member's Data Form][pagibig-mdf] [Pag-IBIG Loyalty Card Plus form][pagibig-loyalty] |
| **PhilHealth card / MDR / claim document** | PhilHealth PIN; QR/barcode; full name; birth date; address; membership category; portrait; holder signature; member/dependent, diagnosis, treatment, disability, or other health details | Sex, card validity date | PhilHealth/Republic logos, generic contact details, plan/card title, PhilHealth official/CEO signature, generic magnetic-stripe object | PhilHealth calls the PIN a unique and permanent number; claim guidance specifies 12 digits in `2-9-1` format. Official card guidance lists PIN, name, birth date, sex, address, membership category, holder signature, and portrait. Medical and dependent information may appear on MDR/claim documents and is higher risk than a basic card. [PhilHealth PMRF][philhealth-pmrf] [PhilHealth PIN format][philhealth-pin] [PhilHealth card fields][philhealth-card] [PhilHealth privacy notice][philhealth-privacy] |
| **PhilID / ePhilID / Digital National ID** | 12-digit PSN, including microprint; 16-digit PCN; full QR code and barcode; full name; birth date and place; address; portrait; blood type; marital status | Sex, issue/generation date | PSA/PhilSys/Republic name and logos, flag, generic issuer text | PSA distinguishes the permanent PSN from the replaceable/public-facing PCN. PSA says the PSN is microprinted and should be kept confidential, while the QR contains demographic data and a facial photo. “Public-facing” does not mean safe for unrestricted posting: the PCN still identifies/authenticates the holder, so TAKIP should cover it by default. [PSA PhilID design][psa-philid-design] [PSA PSN/PCN advisory][psa-psn-pcn] [PSA ePhilID advisory][psa-ephilid] [PhilSys Check][philsys-check] |

## Identifier and zone rules

Formats are supporting evidence, not standalone proof. Require document classification, nearby labels, valid lengths/check digits where available, and geometry before assigning a High detection. Long unrelated numbers can otherwise become false positives.

| Target | Officially supported cue | Detector action |
|---|---|---|
| Passport | Labeled passport number plus two 44-character MRZ rows on a TD3 passport; MRZ includes document number, name, nationality, birth date, sex, and expiry | Parse and checksum MRZ when possible, but cover both full rows even when parsing fails. Re-run after rotation/deskew. Search the portrait/security-feature area for repeated holder data. |
| LRN | Permanent 12-digit learner number | Require `LRN`/learner context or recognized school form/card before High. |
| UMID CRN | Lifetime unique number; SSS sample uses `9999-9999999-9` | Match only with `CRN`/UMID context. Detect SS number separately. |
| Pag-IBIG MID | Unique 12-digit number | Require `MID`, `Pag-IBIG`, or HDMF context. Treat RTN and MP2 numbers as separate identifiers. |
| PhilHealth PIN | 12 digits in `2-9-1` grouping | Require `PIN`/PhilHealth context; cover separators and surrounding label-value box. |
| PhilSys | PSN 12 digits; PCN 16 digits; QR/barcode and PSN microprint | Cover code regions and the full microprint band using template zones even when OCR returns nothing. Do not substitute PCN for PSN in labels. |
| BIR TIN | Permanent TIN; physical and digital cards may also carry serial/QR | Use `TIN`/BIR context and include branch suffix when printed. Cover the entire verification QR. |
| Payment card | PAN plus cardholder name/expiry; CVV is 3 or 4 digits on front or back | Use card layout and labels, not a generic 3-digit rule. Cover PAN, expiry, CVV, holder name/signature, and any personal QR/barcode on both sides. |

## Offline implementation recommendations

1. **Combine classifiers, OCR, formats, and geometry.** First classify document family and side/page. Then use label-value proximity, format/checksum validation, template zones, face detection, signature-region detection, and QR/barcode detection. OCR alone will miss microprint, low-contrast text, stylized signatures, portraits, and encoded regions.
2. **Scan all orientations and all supplied sides/pages.** Normalize rotation and perspective. For passports, always inspect both MRZ rows, the main and secondary portrait/security regions, and the separate holder-signature page. For cards, prompt for the back when only the front is supplied because CVV, signatures, barcodes, QR codes, or serials often live there.
3. **Cover repeats as one linked finding.** Once a passport number, PSN, PCN, TIN, PIN, MID, CRN, SS number, LRN, PAN, or employee/student number is confirmed, search the entire image for every exact and normalized repeat. Link visible text, MRZ/microprint, and code regions in review so dismissing one box does not silently dismiss all copies.
4. **Use opaque, flattened redaction.** Apply padding around the full glyph/code/portrait/signature region, render solid pixels, and export a newly encoded bitmap without original metadata or editable layers. NPC redaction guidance says released redactions should prevent the hidden information from being seen or deduced and should be irreversible. Blur, translucent paint, annotation layers, or a cover that leaves text edges visible do not meet that goal. [NPC redaction guidance][npc-redaction]
5. **Preserve useful issuer context by default.** Do not assign High solely to flags, seals, issuer logos/names, generic hotlines, agency/office codes, branch names, card titles, or official issuer signatures. Offer an optional institution/issuer mask because school, employer, bank, or office affiliation may itself be private in context.
6. **Make uncertainty visible.** Label template-inferred microprint or signature boxes as estimated. Use “Needs review” when OCR/code decoding is incomplete, image quality is poor, a back/page is missing, or field classification conflicts. Never present “no detections” as proof that an image is safe.
7. **Keep processing local and ephemeral.** No photo, OCR text, decoded code, redaction coordinates, or identifier should leave the device. Avoid durable browser logs/storage for these values. Clear working memory when the photo is closed and share only the flattened redacted copy.
8. **Test with synthetic or expressly authorized samples.** Measure per-field recall and false covers by document family, side, rotation, glare, blur, compression, font size, and old/current layout. Do not claim perfect OCR, complete coverage, legal compliance, or support for every card generation without measured evidence.

## Official sources

[npc-dpa]: https://privacy.gov.ph/data-privacy-act-/
[npc-id-circular]: https://privacy.gov.ph/wp-content/uploads/2023/11/Published-NPC-Circular-No.-2023-03_Guidelines-on-Identification-Cards_07Nov2023.pdf
[npc-school-records]: https://privacy.gov.ph/wp-content/uploads/2022/01/AONo_2018-071.pdf
[npc-company-id]: https://privacy.gov.ph/wp-content/uploads/2022/01/NPCAONo.2017-066.pdf
[npc-professional]: https://privacy.gov.ph/wp-content/uploads/2022/01/NPC_AdvisoryOpinionNo._2017-060.pdf
[npc-redaction]: https://privacy.gov.ph/wp-content/uploads/2022/08/NPC-Advisory-No.-2022-01-Request-for-Personal-Data-of-Public-Officers.pdf

[dfa-passport-sample]: https://dfa.gov.ph/images/BAC/2022/PBGS3722EP3/contract/B_CONTRACT.pdf
[dfa-security]: https://pretoriape.dfa.gov.ph/newsroom/announcements/107-e-passport-advisory
[dfa-signature]: https://phnompenhpe.dfa.gov.ph/announcements/368-new-application-forms-list-of-requirements-for-e-passport-with-10-year-validity
[icao-9303]: https://www.icao.int/publications/Documents/9303_p4_cons_en.pdf
[lto-license]: https://lto.gov.ph/wp-content/uploads/2023/10/FDM-Vol.-1-2nd-Edition.pdf
[deped-lrn]: https://www.deped.gov.ph/2012/03/20/do-22-s-2012-adoption-of-the-unique-learner-reference-number/

[pci-account-data]: https://www.pcisecuritystandards.org/faqs/1335/
[pci-cvv]: https://www.pcisecuritystandards.org/faqs/1280/
[pci-masking]: https://www.pcisecuritystandards.org/faqs/1492/
[bsp-fraud]: https://www.bsp.gov.ph/Inclusive%20Finance/Tools/How_much_do_you_know_about_Fraud_and_Scam.pdf

[umid-rules]: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/10/56073
[sss-umid-design]: https://www.sss.gov.ph/wp-content/uploads/2022/05/BD-ITB-SSS-GOODS-2022-033.pdf
[sss-umid-form]: https://www.sss.gov.ph/sss/DownloadContent?fileName=SSSForms_UMID_Application.pdf
[bir-tin-card]: https://bir-cdn.bir.gov.ph/BIR/pdf/RMO_NO.%202-2019_annex_A_TIN_CARD.pdf
[bir-card-fields]: https://web-services.bir.gov.ph/annual_reports/annual_report_2012/images/RR%20letters/RR7.pdf
[bir-digital-tin]: https://bir-cdn.bir.gov.ph/local/pdf/RMC%20No.%20120-2023.pdf
[pagibig-mdf]: https://www.pagibigfund.gov.ph/document/pdf/dlforms/providentrelated/PFF039_MembersDataForm_V11.pdf
[pagibig-loyalty]: https://www.pagibigfund.gov.ph/document/pdf/dlforms/providentrelated/PFF108_LoyaltyCardPlusApplicationForm_V08.pdf
[philhealth-pmrf]: https://www.philhealth.gov.ph/downloads/membership/pmrf_012020.pdf
[philhealth-pin]: https://www.philhealth.gov.ph/circulars/2019/circ2019-0002.pdf
[philhealth-card]: https://www.philhealth.gov.ph/circulars/2016/circ2016-027.pdf
[philhealth-privacy]: https://www.philhealth.gov.ph/privacy/
[psa-philid-design]: https://psa.gov.ph/content/psa-showcases-philid-design-assures-reliable-security-features
[psa-psn-pcn]: https://psa.gov.ph/sites/default/files/psa-release/Advisory-on-Authentication-and-Use-of-PhilID_signed-1.pdf
[psa-ephilid]: https://psa.gov.ph/content/public-advisory
[philsys-check]: https://philsys.gov.ph/philsys-check/
