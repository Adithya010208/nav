# NAV executed audit checks — 23 October 2026

## Automated results

Final run: 2026-10-23T15:40:32.251Z. **27/27 suites passed**, 0 failed. These are suites, not an individual assertion total. Providers are mocked in this runner; actual Gemini browser checks are separately recorded in NAV_COMPLETE_AUDIT_REPORT.md.

| Suite | Result | Milliseconds |
|---|---|---:|
| scripts/test-agents-memory.mjs | PASS | 818 |
| scripts/test-ai-context.mjs | PASS | 406 |
| scripts/test-audit-edges.mjs | PASS | 423 |
| scripts/test-core.mjs | PASS | 445 |
| scripts/test-desktop-api.mjs | PASS | 479 |
| scripts/test-desktop-relay.mjs | PASS | 303 |
| scripts/test-device-sync.mjs | PASS | 789 |
| scripts/test-digest.mjs | PASS | 507 |
| scripts/test-file-quota.mjs | PASS | 378 |
| scripts/test-isolation.mjs | PASS | 953 |
| scripts/test-mobile-api.mjs | PASS | 524 |
| scripts/test-mobile-relay.mjs | PASS | 361 |
| scripts/test-notice-transfer.mjs | PASS | 578 |
| scripts/test-ocr.mjs | PASS | 5122 |
| scripts/test-phone-setup.mjs | PASS | 1879 |
| scripts/test-relay-consume.mjs | PASS | 570 |
| scripts/test-relay-edge.mjs | PASS | 345 |
| scripts/test-roadmap-active.mjs | PASS | 605 |
| scripts/test-studio.mjs | PASS | 706 |
| scripts/test-voice.mjs | PASS | 660 |
| companions/windows/test-connection.cjs | PASS | 291 |
| companions/windows/test-login-diagnostics.cjs | PASS | 225 |
| companions/windows/test-notification-policy.cjs | PASS | 213 |
| companions/windows/test-poller.cjs | PASS | 188 |
| companions/windows/test-registration.cjs | PASS | 161 |
| companions/windows/test-verification.cjs | PASS | 208 |
| companions/windows/test.cjs | PASS | 182 |

The runner excludes test-api.mjs (needs running local server) and test-voice-live.mjs (external provider); they are not silently counted in its 27-suite total. test-api.mjs was separately executed successfully against the actual local preview: simulated session, anonymous denial, origin rejection, persistence, stale revision 409, invalid schema rejection, private upload/download and synthetic file cleanup. Existing actual/synthetic live voice evidence is retained with its date; no fresh user microphone was captured by automation.

Real in-memory SQLite executes four migrations for isolation, memory, quota and device route tests. Actual OCR engine recognizes an image-only PDF; Tamil/Hindi models load but language accuracy is not established. The new graph test validates restored dependency references/cycles and imported-roadmap eligibility. File quota cases test count, byte limit, owner separation and rejected-blob cleanup.

## TypeScript and production build

- node node_modules/typescript/bin/tsc --noEmit: **PASS**, exit 0 after final functional edits.
- node scripts/run-framework.mjs build: **PASS**, exit 0, all five framework environments built. Routes: /, /api/assistant, /api/desktop, /api/device-inbox, /api/devices, /api/files, /api/files/:id, /api/phone-reminders, /api/transcribe, /api/workspace.
- Build produced plugin timing warnings, not compile failures. Checkout-local raw build log: .sites-runtime/audit/build.log (ignored, not a secret store).
- Final source includes local-development identity banner only in development; production simulated identity must never be enabled.

## Runtime dependency audit and currency

Executed npm audit --omit=dev --json for web and Windows runtime trees: zero reported vulnerabilities in each. Initial restricted-network DNS failure was retried with authorized network access; only completed audits are used as evidence. npm outdated was separately executed against the official registry. Newer versions are not automatically security defects; pinned framework upgrades need their own migration testing.

| Package | Installed | Wanted | Latest |
|---|---|---|---|
| @base-ui/react | 1.7.0 | 1.9.0 | 1.9.0 |
| @cloudflare/vite-plugin | 1.37.1 | 1.37.1 | 1.65.0 |
| @cloudflare/workers-types | 4.20260515.1 | 4.20260515.1 | 5.20261023.1 |
| @hookform/resolvers | 5.7.1 | 5.9.2 | 6.0.0 |
| @shadcn/react | 0.3.0 | 0.3.1 | 0.3.1 |
| @tailwindcss/postcss | 4.2.1 | 4.2.1 | 4.3.3 |
| @types/node | 22.19.19 | 22.19.19 | 26.6.5 |
| @types/react | 19.2.14 | 19.2.14 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.2.3 | 19.3.0 |
| @vitejs/plugin-react | 6.0.2 | 6.0.2 | 6.1.2 |
| @vitejs/plugin-rsc | 0.5.26 | 0.5.26 | 0.5.38 |
| drizzle-kit | 0.31.10 | 0.31.10 | 0.31.11 |
| drizzle-orm | 0.45.2 | 0.45.2 | 0.45.4 |
| eslint | 9.39.4 | 9.39.4 | 10.13.0 |
| input-otp | 1.4.2 | 1.5.0 | 1.5.0 |
| json-rpc-2.0 | 1.7.1 | 1.7.1 | 1.8.1 |
| lucide-react | 1.31.0 | 1.61.0 | 1.61.0 |
| radix-ui | 1.6.7 | 1.8.1 | 1.8.1 |
| raw-body | 3.0.2 | 3.0.2 | 4.0.0 |
| react | 19.2.6 | 19.2.6 | 19.3.1 |
| react-day-picker | 10.0.1 | 10.0.2 | 10.0.2 |
| react-dom | 19.2.6 | 19.2.6 | 19.3.1 |
| react-hook-form | 7.85.0 | 7.90.0 | 7.90.0 |
| react-resizable-panels | 4.12.2 | 4.14.8 | 4.14.8 |
| react-server-dom-webpack | 19.2.6 | 19.2.6 | 19.3.1 |
| recharts | 3.8.0 | 3.10.1 | 3.10.1 |
| tailwind-merge | 3.6.0 | 3.6.0 | 3.7.0 |
| tailwindcss | 4.2.1 | 4.2.1 | 4.3.3 |
| typescript | 5.9.3 | 5.9.3 | 7.0.2 |
| vinext | 1.0.0-beta.5 | 1.0.0-beta.5 | 1.3.0 |
| vite | 8.0.13 | 8.0.13 | 8.3.5 |
| wrangler | 4.92.0 | 4.92.0 | 4.152.0 |
| zod | 3.25.76 | 3.25.76 | 4.6.7 |

## Actual browser and device checks

See B01–B09 and D01–D04 in NAV_COMPLETE_AUDIT_REPORT.md for inputs/results and dates. Local browser tests ran through real forms, API and local D1/R2 with a simulated identity; live Gemini calls used synthetic fixture context. Production auth negatives were actual unauthenticated HTTP probes. Desktop and narrow mobile viewport layout checks passed without horizontal overflow. Tablet, full screen-reader/keyboard audit, noisy speech, actual new command audio, and complete seven-workflow acceptance are explicitly not claimed as passes.

Native source did not change during this audit. Historical Android 43-test run and user-accepted scheduled phone sound remain valid for Android 0.8; Windows 0.5.4 portable scheduled sound acceptance remains valid. The optional unsigned Windows installer has not been executed. No new OS permission or store publication was performed.

## Failures and recovery retained

- Score changed when unfinished tasks were rescheduled: found in browser, fixed denominator, regression suite passed.
- Missing arbitrary PDF-roadmap activation/dependency guidance and first-interval-only revision action: implemented, browser and unit tests passed.
- Repeated AI suggestion could duplicate a source task: added exact normalized-title/source guard; browser reopened saved task and unit tests passed.
- Browser error-page access was blocked: user refreshed local preview and confirmed loaded; testing resumed only after that correction.
- One earlier file chooser was not executed while account usage approval was blocked. It was not counted as passed; after usage became available the actual upload executed and was verified.
- Earlier native reminder failures are preserved in DELIVERY.md; subsequent actual user-accepted results are dated separately.
- Calendar eligibility capability absent; no unsupported workaround or fictional external test result.

Lint was not requested and is not claimed. No store, new-device permission, calendar, or secret-provisioning test was silently inferred from a successful build.

## Publication and final packaging checks
The verified application was privately published on 23 October: source 56e916f73c7bad1d04c41687cdf40681df211fff, deployment appgdep_6adb79969c6081918f19385cbbd4aa7e, existing environment revision 2 and owner-private audience retained. The generic Sites build launcher initially failed because the Windows npm shim resolved a nonexistent node_modules/npm path. Retrying the supported source helper with NAV's existing scripts/run-framework.mjs wrapper rebuilt successfully and packaged the exact source. No application change was made to hide that infrastructure failure.

A provider-key pattern scan initially flagged one encoded string in Tesseract's bundled WASM JavaScript. Its complete SHA256 matched the official installed vendor asset byte-for-byte; it is embedded WASM base64, not a credential. All 18 application client JS/JSON/HTML files outside the three vendor OCR core assets had zero provider-key pattern matches. This pattern scan is an additional check, not a general proof that all possible secrets are absent.

## Follow-up browser acceptance and reported hosted timeout
The fresh continuous document workflow passed after the initial report: saved image-only PDF -> real local English OCR -> editable College excerpt -> reviewed suggestion -> saved exam task with confirmed 24 October date and source, local revision 45. Feature 55 is now COMPLETE. The daily capacity warning was corrected and browser-verified: 185 unfinished + 25 completed minutes against 150 capacity correctly shows 60 over; the prior UI understated it by omitting completed work. TypeScript and the final source-helper rebuild passed after the display fix; exact source 59514eadbe462aa2ebd4221558590d155507f2a2 was successfully published privately.

The user reported a gateway timeout during fresh hosted sign-in. Positive post-release authentication acceptance is therefore NOT VERIFIED (feature 62), even though earlier genuine ChatGPT sign-in had passed. Counts remain 53 COMPLETE, 13 PARTIAL, 1 BLOCKED, 6 NOT VERIFIED after swapping these two feature statuses. Actual unauthenticated probes: root 401 (~2.3 seconds), workspace API 401 (~2.4 seconds), sign-in 302 to auth.openai.com (~2.4 seconds). Recent NAV Worker log events were 200 for root and 404 for one crawler sign-in request; no matching 504/crash was observed. This does not prove the user's timeout resolved. The user confirmed the timeout is on auth.openai.com or chatgpt.com; no auth protection was weakened or bypassed.

## Final audit closure
Assessment complete on 23 October 2026 (Asia/Calcutta). Re-ran all 27 suites and TypeScript successfully against the final application source. Matrix validator confirmed 73 unique ordered rows, seven nonempty columns, legal statuses, exact calculated counts/percentages, and all 26 concrete source-file references. The current hosted browser remains at Sign in required; no fresh positive authenticated acceptance is claimed. Calendar eligibility remains unavailable in the callable tool inventory. The full expanded release gate remains NOT READY. Machine-readable evidence: NAV_AUDIT_STATUS.json.

## Sprint 1 implementation and verification
The original 27-suite baseline plus test-sprint-foundations.mjs and test-priorities-api.mjs passed (29 suites). The new foundational test covers UTC/India conversion, DST gaps/folds, original wording/ambiguity hints, exact-deadline persistence/confirmation/schema rejection, before/on/overdue browser boundaries and exact ICS export. It also covers preparation capacity/busy/prerequisites/dedup, ICS all-day/recurrence/UID behavior and stale conflict alternatives. The API test uses real SQLite and a mocked provider: owner isolation, consent, shared daily quota, origin denial, invalid AI IDs, no implicit changes and explicit changed-priority database persistence.
One real Gemini call was separately approved and passed through the browser. It ranked the two synthetic tasks by deadlines and retained their current priority values. User-review selection then persisted successfully at revision 46; no claim that this particular live answer proposed a numerical change. No additional live provider test was made. Actual browser exam/preparation, exact deadline save/reopen and imported-calendar conflict resolution passed at revisions 47–51. Native protocol remains v1; exact native alert support is still pending.
# 24 October 2026 — Sprint 2 browser policy

## Native compatibility staging on 24 October
- All 33 isolated automated suites passed, with targeted native protocol/relay/Windows tests repeated after final date guards. TypeScript passed. Added actual handler v1/v2 negotiation and API readiness/opt-in guards. These use synthetic fixtures and no live AI provider.
- Both live reminder Edge Functions are ACTIVE version 3. Final direct anonymous POST probes return 401 for each. Authenticated rolling-upgrade behaviour is verified in handler fixtures, not claimed as actual device delivery.
- Managed SQL refresh migration applied. Actual database transaction tests for both owner functions passed and rolled back: equal-revision generated-window refresh, late/stale rejection, unchanged task/profile guard, higher-revision acceptance and no public function execute grants. Follow-up query found zero synthetic snapshot rows. RLS stays enabled and anon/authenticated table access stays false. Security advisors report only six informational no-policy findings for intentionally service-only tables.
- Android 0.9 main/test APK builds and lint succeeded; APK signature verification passed using v2 signing. Windows 0.6 staged packaging passed. Public package hashes are saved outside source in outputs/NAV_NATIVE_STAGING_ARTIFACTS.json. Prepared 53 Android isolated checks have NOT run: no authorized phone was connected. Prior 43-device-check evidence belongs to installed 0.8.
- Browser verified native opt-in disabled with rollout-inactive explanation; saving browser policy passed at local revision 58 while native remained off. Subsequent actual HTTP API isolation/revision/file checks passed. Sites environment metadata confirms revision 2 and no NAV_ADVANCED_REMINDERS_READY key. No production owner preference, token or device permission changed.
- Native timed popup/sound acceptance remains pending. No broadened credential, API key readout, new provider charge or completion claim was introduced.

- All 30 isolated suites passed, including new `scripts/test-proactive-reminders.mjs`; TypeScript passed. No new live provider call. Real local HTTP API persistence/origin/revision/file checks passed separately.
- New policy cases: explicit opt-in; India wall clock; start/end catch-up boundaries; New York DST fold/gap; overnight and same-day quiet hours; no task mutations; archived/completed exclusion; saved evening-check-in suppression; missed-slot grace; invalid form/schema values; unchanged strict native snapshot shape.
- Real browser synthetic account: enabled policy and 08:15 morning saved revision 54; reload retained both. Existing actual API test restored its fixture, then policy disabled revision 57. No production settings changed. Native relay calls are unavailable in the local simulated account; local UI labels their unavailable status honestly.
- Browser reminder controller is now mounted on all NAV sections. New browser policy actual audible delivery and all advanced native reminder deliveries remain NOT VERIFIED. Prior native user acceptance dates are historical and are not reused for these new policies.

