# NAV — Personal Assistant

NAV combines your learning roadmap, daily plan, college notices, deadlines, focus sessions and progress. The separate Nanba AI communication app is outside this project.

## Implemented
- ChatGPT identity and private per-user cloud workspace with revision conflict protection.
- Editable tasks, evidence notes, completion/partial status, archive/restore and capacity-aware rescheduling.
- Milestones and daily plans derived from the supplied 18-month developer roadmap.
- Reviewed college imports and opt-in Android capture/cloud sync for one exact approved WhatsApp group, with source preservation and deadline uncertainty.
- Private file storage; browser PDF/text extraction (text PDFs, up to 80 pages / 8 MB).
- Practice records, 3/14-day revision dates and measured focus sessions.
- JSON backups, calendar snapshots, open-app device notifications and installable web-app metadata.
- Server-side AI tutoring and planning with consent, bounded context, validation and a 20-request daily limit. The private hosted Gemini connection has been verified.
- Windows tray companion with a revocable reminder-only connection and Android daily study reminders. Real scheduled background popup/sound tests passed on both devices on 22 October; Android precise timing requires explicit Alarms & reminders access.

## Local development
Run `node scripts/run-framework.mjs dev`. The portable starter simulates ChatGPT sign-in only in local development. Configure database bindings in `.openai/hosting.json`; generate schema migrations with `node node_modules/drizzle-kit/bin.cjs generate`. Follow the Sites deployment workflow and apply pending migrations to the local preview database before testing.

Checks: `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/test-core.mjs`, `node scripts/test-isolation.mjs`. `node scripts/test-api.mjs` exercises a running local preview. Build with `node scripts/run-framework.mjs build` when the host's npm shim is unavailable.

## Secrets and limitations
Keep credentials out of code, browser storage and commits. Hosted AI uses the server-only provider configuration described below. Local env/vars files are ignored. Phone and Windows connections use separate, limited, revocable device credentials.

Scanned-document OCR runs locally using bundled English, Tamil and Hindi models, with up to ten selected pages per run. Review its editable output. Calendar export is an importable snapshot. Browser reminders require an open page; Windows reminders require the tray companion running and network access. Android offers either local daily reminders or a separately approved website task/deadline reminder connection; precise timing requires Android's Alarms & reminders permission. Native builds are private personal packages. See the latest DELIVERY.md checkpoints for actual device acceptance.

Internal legacy browser-storage keys remain compatible with the earlier prototype. The application is NAV throughout its user-facing UI.


## AI providers

NAV supports server-side Google Gemini and the existing OpenAI adapter. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY` as a private secret, and optional `GEMINI_MODEL`. The current tested deployment uses `gemini-3.5-flash-lite`; the model is configurable without shipping a key to clients. `AI_PROVIDER=openai` selects `OPENAI_API_KEY` / `OPENAI_MODEL` explicitly. There is no automatic cross-provider fallback.

The displayed provider is included in sharing consent; requests are rejected if the server provider changed since consent. The connection-test button sends only a fixed sample question and empty context. Normal requests send the bounded workspace context described in the form only after consent. Provider terms and API quotas apply. Never put any provider key in source, client storage, screenshots or chat. Local `.dev.vars` is ignored by Git; hosted secrets are stored separately in Sites.

## Voice and scan support
Ask NAV includes Record question → Stop recording → review audio → Transcribe recording. Explicit consent sends up to 30 seconds to the configured Gemini provider; audio is not stored by NAV, and the editable transcript is not automatically submitted. This bypasses optional browser speech recognition. Synthetic live transcription and the user's actual microphone acceptance both passed on 23 October.

Scanned-document OCR is now included using local bundled English/Tamil/Hindi models, up to ten selected pages per run. Android also supports a separately approved, revocable website task/deadline reminder connection, with encrypted offline cache for up to 72 hours. These supersede the older OCR-absent and daily-only limitations above. See the latest DELIVERY.md checkpoint for remaining actual-device acceptance. User selected private installable distribution; public app stores are outside this release.
