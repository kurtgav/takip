# HERMES NOTES — documentation session 4 (update)

> Written: 2026-10-09 20:59 (Asia/Manila) · Agent: Hermes (DeepSeek V4.1 Flash) · Docs role.
> This **supersedes sessions 1–3**. Handover note: what changed, what I re-verified against the
> **built and now deployed** app, and what the **human** must still do.

## Headline: the app is BUILT (F1–F16) AND DEPLOYED to a live HTTPS origin

Sessions 1–3 documented a built-but-unhosted app. Since session 3 the builder/orchestrator **shipped
a live deployment**: the static PWA is published to **GitHub Pages over HTTPS at
https://kurtgav.github.io/takip/**, and the public source repo is **https://github.com/kurtgav/takip**.
`README.md` (§Deploy, §Verification) and `DECISIONS.md` (§Deployment to GitHub Pages) record the
exact build shape and a **15/15 live HTTPS verification** run on 2026-10-09 — page load, UI mounted
on the `/takip/` subpath, no horizontal overflow, service worker controlling the page with scope
`https://kurtgav.github.io/takip/`, complete first-load precache, offline reload, OCR + NER + face +
QR/barcode pipelines running offline, safe-copy PNG export, and zero network requests during offline
processing. The same suite passes **11/11 locally** against `npm run preview`.

This matters for the docs because three things that used to be open caveats are now resolved facts:

- The "no HTTPS host exists" prerequisite for a **phone rehearsal** is **met** — the live URL is the
  team's HTTPS origin (deploy workflow `.github/workflows/pages.yml`, no secrets, builds with
  `VITE_BASE=/takip/`).
- The **public repo URL is known** (it was a bare blank placeholder).
- The submission's demo field can point at a **live app**, not only at a video.

## What I re-verified this session (read-only, from the authoritative sources)

- Read `README.md` (updated 20:46), `DECISIONS.md` (§Deployment), `eval/results.md`, `PROGRESS.md`,
  `ORCHESTRATOR_DONE.md`, `ORCHESTRATOR_STABLE.md`, `ORCHESTRATOR_STATUS.md`, `PRD.md` (§14–§18),
  and the driver `.orchestrator/hermes_prompt.md`.
- Live origin checked over HTTP: `https://kurtgav.github.io/takip/` → **HTTP 200**,
  `<title>TAKIP — Cover before you share</title>`; `manifest.webmanifest` → **200**, `start_url` and
  `scope` both `"/takip/"`; `sw.js` → **200**. Public repo `https://github.com/kurtgav/takip` →
  **200**.
- Unchanged verified state: F1–F16 implemented; F17 (PaddleOCR) deferred; `npm run lint`,
  `npm run typecheck`, `npm test` (30/30), `npm run build` (53 precache entries, 224093.40 KiB),
  `npm run test:browser` (11/11, ~2.7 min) all PASSED; all 53 assets match recorded size/SHA-256;
  runtime has no external URL literals and the processing network counter stays at zero.
- Still **NOT measured**: human 30-photo accuracy set (recall / false covers), mid-range-phone scan
  time, Safari/iOS, physical camera capture, native OS share sheet, and the three venue rehearsals.

## What I did this session

Boundaries kept: I edited only files under `docs/` plus `eval/test-plan.md`. No git commands, no
installs, no servers, no source or README edits.

| File | Change |
|---|---|
| `eval/test-plan.md` | Header bumped to Session 4; build-status note now records the live HTTPS deploy and the 15/15 live run; "How to run" notes the deployed HTTPS URL satisfies the phone/server prerequisite; added a live-deploy bullet under limits. The 30 cases (every PRD §7 category), conditions and expected values are unchanged; the "Result" column stays empty for the human. |
| `docs/demo-script.md` | Pre-flight now loads the app from the live HTTPS URL; the 3:15–4:30 proof beat may cite the verified 15/15 live deployment; SAMPLE-only and "not yet measured" rules kept. |
| `docs/judge-qa.md` | The 12 hardest questions (mapped to the judging criteria) now note there is a public live app and public repo; still refuse to quote recall/phone numbers as measured. |
| `docs/submission.md` | Rewritten to carry **every PRD §15.1 field** (project name, short description, what runs locally, what requires internet, models used, technologies & frameworks, APIs & cloud services, existing code & assets, AI development tools, and the "why local" answer). **Team members and URLs are left as clearly marked `[BLANK — …]` placeholders for the human** (per the driver); the verified repo + live-demo URLs are recorded below so the human can paste them. Build-status header records the live deploy. |
| `docs/social-post.md` | X post + LinkedIn post for the demo video, now **tagging Devin / Cognition and including #AppBuildersPH** (PRD §15.1); banner corrected to built + deployed; post URL left blank for the human; unmeasured-number rule kept. |
| `docs/HERMES_NOTES.md` | This file — rewritten for session 4. |

`README.md`, `PROGRESS.md`, `DECISIONS.md`, `ORCHESTRATOR_*.md`, `PRD.md`, `IMPLEMENTATION_PLAN.md`
are owned by the builder/orchestrator; I only **read** them. Where a doc under `docs/` disagreed with
them, the doc under `docs/` was corrected.

## Decisions made this session

- **URLs stay as clearly marked blanks (the driver wins).** The driver prompt explicitly says to
  leave **team members and URLs as clearly marked blanks for the human**, so `docs/submission.md`
  keeps `[BLANK — …]` placeholders for the public repo, demo video and post URLs (and team members).
  The **verified, non-invented** deployment facts are instead recorded in this notes file (see
  "Verified live URLs" below) so the human can paste them without guessing — that satisfies both the
  driver and the "docs must match reality" rule, without any doc claiming an unconfirmed URL.
- **No phone/deploy claim invented or softened.** The live verification is an automated HTTPS run,
  not a phone rehearsal; the docs keep saying the phone/camera/Safari/rehearsal items are NOT RUN.

## Verified live URLs (for the human to paste into the blank fields)

- **Public repo:** `https://github.com/kurtgav/takip` — HTTP 200 on 2026-10-09; must be PUBLIC before
  10:00 AM Oct 10.
- **Live PWA demo (HTTPS):** `https://kurtgav.github.io/takip/` — HTTP 200; `manifest.webmanifest`
  `start_url`/`scope` = `/takip/`; `sw.js` served. Independently verified **15/15** over live HTTPS.
- These live here (not in the submission draft) so the human pastes a verified value while the
  driver-required blank fields stay blank.

## Verified facts worth reusing (unchanged from session 3 where not superseded)

- **Versions:** React 19.3.0, Vite 8.3.4, TypeScript **6.0.3 installed** (registry "latest" 7.0.2 is
  *not* what the lock resolves to), Tailwind 4.3.3, vite-plugin-pwa 2.0.0.
- **OCR:** Tesseract.js 7.0.0 (core 7.0.0), English data from the 4.0.0 tessdata mirror; Apache-2.0.
- **Faces:** `@mediapipe/tasks-vision` 1.1.0 + BlazeFace short-range float16 v1 (229,746 bytes);
  Apache-2.0; load via the ES-module `FilesetResolver` — the classic loader throws
  `ModuleFactory not set` in a module worker.
- **NER:** Transformers.js **3.8.1** (4.3.1 failed in-browser), model
  `onnx-community/distilbert-NER-ONNX` (q8, 65,772,734 bytes), base `dslim/distilbert-NER`
  (Apache-2.0). English CoNLL; Filipino names/addresses lean on label-proximity rules.
- **QR:** ZXing-WASM 3.1.5 (966,895 bytes), MIT, always through the local worker.
- **LLM — integrated (optional):** WebLLM 0.2.85 + `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (WebGPU only;
  template fallback). Category-identifiers-only request contract verified.
- **Test fixture:** `tests/assets/sample-synthetic-face.png` — fictional face generated with OpenAI's
  image tool (SHA-256 `831872d94e751b322d705e31d9395467611b75226b02abdb334027148a0e0c0f`); no real
  person, no government design.

## What future sessions must do

1. Keep every doc anchored to `README.md` + `eval/results.md`; re-reconcile if they change.
2. When the human runs `eval/test-plan.md` on real photos, quote only measured figures in
   `judge-qa.md`, `demo-script.md` and `social-post.md`.
3. When a physical phone / Safari / venue rehearsal is actually run, move the matching item from
   "NOT YET MEASURED" to measured in the docs it touches.
4. Do **not** invent team identity, a video URL, a social URL, or a submitted status — those stay
   `[BLANK]` / "NOT PROVIDED" until the human supplies them.

## Human to-do list (short)

1. Fill the `[BLANK — …]` fields in `docs/submission.md`: **team members**, **public repo URL**
   (verified value in "Verified live URLs" above), **demo video URL**, and **X / LinkedIn post URL**.
2. Ensure the public repo (`https://github.com/kurtgav/takip`) is up to date and public before
   **10:00 AM Oct 10**.
3. Run `eval/test-plan.md` on team-made data over the live HTTPS URL (or a local HTTPS preview),
   record misses / false covers / scan times into `eval/results.md`; only then quote accuracy numbers.
4. Record the ~1-minute video from `docs/demo-script.md` (SAMPLE content only) and post via
   `docs/social-post.md` (tag **Devin / Cognition**, include **#AppBuildersPH**).
5. Submit **once**; PRD §15 allows no edits or resubmission.
