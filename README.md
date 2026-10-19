# NAV — Personal Assistant

NAV combines your learning roadmap, daily plan, college notices, deadlines, focus sessions and progress. The separate Nanba AI communication app is outside this project.

## Implemented
- ChatGPT identity and private per-user cloud workspace with revision conflict protection.
- Editable tasks, evidence notes, completion/partial status, archive/restore and capacity-aware rescheduling.
- Milestones and daily plans derived from the supplied 18-month developer roadmap.
- Manual college imports, source preservation, review queue and deadline uncertainty.
- Private file storage; browser PDF/text extraction (text PDFs, up to 80 pages / 8 MB).
- Practice records, 3/14-day revision dates and measured focus sessions.
- JSON backups, calendar snapshots, open-app device notifications and installable web-app metadata.
- Server-side AI endpoint with consent, bounded context, validation and a 20-request daily limit. Live AI requires a replacement private API credential and has not been verified.

## Local development
Run `node scripts/run-framework.mjs dev`. The portable starter simulates ChatGPT sign-in only in local development. Configure database bindings in `.openai/hosting.json`; generate schema migrations with `node node_modules/drizzle-kit/bin.cjs generate`. Follow the Sites deployment workflow and apply pending migrations to the local preview database before testing.

Checks: `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/test-core.mjs`, `node scripts/test-isolation.mjs`. `node scripts/test-api.mjs` exercises a running local preview. Build with `node scripts/run-framework.mjs build` when the host's npm shim is unavailable.

## Secrets and limitations
Keep credentials out of code, browser storage and commits. Hosted AI uses server-only `OPENAI_API_KEY` and optional `OPENAI_MODEL` (default `gpt-4.1-mini`). The key exposed in chat must be revoked and will not be used. Local env/vars files are ignored.

Live WhatsApp ingestion, scanned-document OCR, closed-app push delivery, and native Windows/Android companions remain unfinished. Calendar export is an importable snapshot, not automatic synchronization. Device notifications require user permission and an open app. See DELIVERY.md for phase status and verification limits.

Internal legacy browser-storage keys remain compatible with the earlier prototype. The application is NAV throughout its user-facing UI.


## AI providers

NAV supports server-side Google Gemini and the existing OpenAI adapter. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY` as a private secret, and optional `GEMINI_MODEL`. The current tested deployment uses `gemini-3.5-flash-lite`; the model is configurable without shipping a key to clients. `AI_PROVIDER=openai` selects `OPENAI_API_KEY` / `OPENAI_MODEL` explicitly. There is no automatic cross-provider fallback.

The displayed provider is included in sharing consent; requests are rejected if the server provider changed since consent. The connection-test button sends only a fixed sample question and empty context. Normal requests send the bounded workspace context described in the form only after consent. Provider terms and API quotas apply. Never put any provider key in source, client storage, screenshots or chat. Local `.dev.vars` is ignored by Git; hosted secrets are stored separately in Sites.
