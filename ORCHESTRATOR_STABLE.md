# TAKIP — feature-freeze handoff

Verified 2026-10-09 on Windows with production Vite preview and isolated Playwright Chromium. F1–F16 remain implemented. F17 PaddleOCR remains deferred. No application defect reproduced and no runtime code, dependency or feature changed during stabilization.

## Current verification

- **PASSED:** `npm run lint`, `npm run typecheck`, `npm test` (30/30), `npm run build`.
- **PASSED:** `npm run test:browser` — 11/11 in 2.7 minutes, no skips/failures. Includes real OCR, faces, NER, QR/barcodes; risk/review/manual covers; watermark and flattened metadata-free PNG; share fallback/cancellation; fresh offline reload and export; suspended-worker and update guards; real cached Qwen inference offline.
- **PASSED:** all 53 recorded asset hashes/sizes and core precache coverage. Production precache contains 53 entries, 224093.40 KiB. Optional LLM weights are explicitly downloaded/cached, not part of automatic core precaching.
- **PASSED:** no external URL literals in application source, all runtime detector/model paths local, dependency URL exceptions audited in `DECISIONS.md`. Browser processing-request assertions record zero HTTP(S) requests. This counter excludes browser-managed update checks and unrelated tabs.
- **PASSED:** repository source/assets below 95,000,000 bytes per file; largest is 68,067,328 bytes. No real personal photo/document found; sample portrait is labeled synthetic. Dependencies, generated output and Git storage are outside the source-file limit inspection.
- **PASSED:** light 320px review and dark mobile screenshots inspected; responsive browser checks pass; `git diff --check` passes.

## Run the local demo

1. Open a terminal in `D:\takip` with Node 24/npm installed. Run `npm ci` for a fresh checkout. Model assets are already included in this checkout; only run `npm run assets` and `npm run assets:summary` if they need restoring. Dependency installation and asset restoration require internet.
2. Run `npm run build`, then `npm run preview -- --port 4173 --strictPort`. Open `http://localhost:4173` in current desktop Chrome. Use production preview for offline testing; development mode bypasses offline protection.
3. Wait for **Ready offline** and enabled **Choose Photo**. First setup downloads approximately 230 MB of static files from the app host. Keep the tab open. If setup fails, reconnect, ensure free storage, and use **Retry setup** or reload.
4. Optional: click **Download smart summary** before selecting a photo, then wait for **Smart summary ready**. It needs approximately 290 MB more, compatible WebGPU with `shader-f16`, and sufficient GPU memory. If unsupported or unavailable, use the standard on-device summary; it is the supported fallback.
5. Prepare only clearly labeled fictional content. For a simple repeatable photo, write `SAMPLE — FICTIONAL PRIVACY TEST`, `Name: Sample Person`, `Date of Birth: 09/10/1998`, `TIN: 123-456-789` and `Email: sample@example.invalid` on plain paper, with a made-up signature. Photograph it clearly or keep a prepared image in the gallery. Do not imitate a government ID design or use real personal details. This paper exercises text detection; the automated composite fixture additionally exercises synthetic faces and generated codes.
6. Click **Choose Photo**, select the SAMPLE image, and wait for **Your details. Your decision.** Check original exposure risk and detected details. Use **Before** and **After**, toggle one cover, restore it, then use **Add cover** and drag over the fictional signature. Inspect the whole photo for misses. **Cover all detected** restores detected covers; it cannot cover undetected details.
7. Enable **Add a purpose watermark**. Enter `SAMPLE Recipient` in **Sending to**, `SAMPLE verification` in **Purpose**, and confirm the date. Check the rendered preview. Check **I checked the photo, including signatures and any missed details.** after the final edit, then click **Save safe copy**.
8. Open `takip-safe-copy.png` from Downloads. Confirm selected details and manual region are opaque and the watermark is visible. Export is a flattened PNG; the original input stays unchanged. Use **New photo** to discard the current in-memory review.

To rerun automated checks, stop preview first because the browser suite owns port 4173. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:browser`. Fresh environments may need `npx playwright install chromium`. The real LLM case requires compatible hardware/full Chromium and Windows-specific test flags; it must not be reported as passed if unavailable.

## Phone airplane-mode rehearsal

Prerequisite: a team-provided HTTPS static host serving the contents of `dist/` at the origin root. No host/account/domain is configured or deployed by this pass. Plain `http://<laptop-IP>:4173` cannot provide the required service worker on a phone. Do not record the phone rehearsal as passed until run on the actual device.

1. On the target phone, use current Chrome over the team's actual HTTPS URL. Keep a fictional SAMPLE photo in the local gallery. Allow setup to finish until **Ready offline** and both photo buttons are enabled. Optionally install the PWA; use the same browser profile throughout.
2. If demonstrating the optional LLM, download and initialize it now while online and wait for **Smart summary ready**. The core flow works without it. Allow enough free storage for both downloads and browser/runtime overhead.
3. Turn on airplane mode. Explicitly switch Wi-Fi off too; phones can leave Wi-Fi enabled. Reload the same app URL or installed PWA. Wait again for **Ready offline**. A failed reload/setup is a failed rehearsal; reconnect and repair setup before retrying.
4. Optional LLM: after this reload, click **Download smart summary** again while still offline to initialize from its cache. It should reach **Smart summary ready**. If it falls back, report the standard summary honestly; do not claim model inference.
5. Choose the local SAMPLE photo and complete steps 6–8 of the local demo. During scanning/review/export, expect **0 network requests · 0 blocked attempts**. Watch any available remote browser Network log too. Do not clear site storage or use private browsing between setup and the offline test.
6. Inspect the downloaded PNG while offline. Test **Share safe copy** and cancellation on the physical OS sheet separately; internet-dependent recipient apps may require a connection. Confirm no success message after cancelling. Physical native sharing is not proven by the automated stub tests.
7. Test **Take Photo** with the paper SAMPLE, including camera permission, lighting and orientation. Keep the gallery photo as the live-demo fallback. Repeat the complete offline flow three times under venue conditions and record actual scan times, missed details and failures in `eval/results.md`; none of these phone results is yet measured.

## Known limits and submission status

- Physical phone camera/native sharing, Safari/iOS, mid-range phone timing, broad accuracy across approximately 30 annotated photos, and three venue rehearsals: **NOT RUN**. Automated synthetic cases do not establish ≥90% recall, ≤2 false covers/photo or ≤8-second phone scans.
- Browser cache eviction, insufficient storage, hardware limits and poor/glared photos can prevent setup or accurate detection. Always review, including signatures; no automatic signature detector ships. Watermark discourages reuse but cannot prevent it.
- Optional Qwen initialization/inference failures use the labeled standard summary. Only category identifiers enter the LLM. F17 is deferred, not shipped. No new feature cut was needed during stabilization.
- Known non-failing diagnostics: bundler `inlineDynamicImports` deprecation and Node color-environment warning. No safeguards were disabled to pass verification.
- `README.md` is the current PRD §15 disclosure source. `docs/submission.md` is a historical draft with obsolete build claims and blank human fields; do not paste it unchanged. Team identity, public repository visibility/URL, video, social post and final one-time event submission remain human deliverables. Do not claim instant detection or verified phone performance.
- **Deployment: NOT PERFORMED.** No Git commit/push/reset/checkout/stash, external message or edit to protected orchestration files was performed. The existing orchestrator-owned status change remains untouched.
