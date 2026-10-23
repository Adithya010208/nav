# NAV executed audit checks — 23 October 2026

## Automated results

Final run: 2026-10-23T14:48:25.533Z. **27/27 suites passed**, 0 failed. These are suites, not a fabricated individual assertion total. Providers are mocked in this runner; actual Gemini browser checks are separately recorded in NAV_COMPLETE_AUDIT_REPORT.md.

| Suite | Result | Milliseconds |
|---|---|---:|
| scripts/test-agents-memory.mjs | PASS | 961 |
| scripts/test-ai-context.mjs | PASS | 617 |
| scripts/test-audit-edges.mjs | PASS | 617 |
| scripts/test-core.mjs | PASS | 721 |
| scripts/test-desktop-api.mjs | PASS | 685 |
| scripts/test-desktop-relay.mjs | PASS | 468 |
| scripts/test-device-sync.mjs | PASS | 919 |
| scripts/test-digest.mjs | PASS | 578 |
| scripts/test-file-quota.mjs | PASS | 392 |
| scripts/test-isolation.mjs | PASS | 989 |
| scripts/test-mobile-api.mjs | PASS | 656 |
| scripts/test-mobile-relay.mjs | PASS | 429 |
| scripts/test-notice-transfer.mjs | PASS | 666 |
| scripts/test-ocr.mjs | PASS | 5420 |
| scripts/test-phone-setup.mjs | PASS | 2298 |
| scripts/test-relay-consume.mjs | PASS | 783 |
| scripts/test-relay-edge.mjs | PASS | 442 |
| scripts/test-roadmap-active.mjs | PASS | 714 |
| scripts/test-studio.mjs | PASS | 713 |
| scripts/test-voice.mjs | PASS | 747 |
| companions/windows/test-connection.cjs | PASS | 349 |
| companions/windows/test-login-diagnostics.cjs | PASS | 180 |
| companions/windows/test-notification-policy.cjs | PASS | 160 |
| companions/windows/test-poller.cjs | PASS | 189 |
| companions/windows/test-registration.cjs | PASS | 167 |
| companions/windows/test-verification.cjs | PASS | 179 |
| companions/windows/test.cjs | PASS | 193 |

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
