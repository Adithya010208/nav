# NAV personal assistant — delivery and release evidence

Scope: NAV only. Nanba AI, the separate private communication product for two friends, is outside this project.

The requested product is a personal companion for learning, college obligations, accountability and reminders across Windows and Android. A phase is complete only when its acceptance checks pass. Deployed prototype: https://nav-personal-assistant.opalmug128.chatgpt.site.

## Phase 1: Cloud foundation — in progress
- ChatGPT sign-in; authenticated API; per-user database records; revision conflict protection.
- Cross-device refresh; migration from prototype local data; export and validated restore.
- Verify anonymous denial, ownership, conflict handling, persistence after reload, production deployment.

## Phase 2: Planning and accountability — in progress
- Task creation, editing, completion/partial/missed status, priority, deadline, evidence, archive and restore.
- Capacity-aware planning and rescheduling; exam mode; roadmap milestones from the supplied PDF.
- Accurate focus session records, problem practice, review dates, daily/weekly summaries and search.
- Verify task lifecycle, capacity limits, timer pause/reload, and metrics derived from real records.

## Phase 3: Documents and college intelligence — pending
- File storage, text/PDF reading, message imports, source preservation, suggestion review, duplicate detection, deadline changes, daily digest.
- Never invent a deadline for vague language. Preserve uncertainty and source timestamps.
- Live WhatsApp is strictly read-only: no outgoing messaging or modification function anywhere.
- Verify imports, vague dates, revised notices, deduplication and private file access.

## Phase 4: AI services — blocked on a replacement private credential
- Orchestration, roadmap, planning, college/deadline/document interpretation, motivation, tutoring, reviews.
- Bounded structured outputs, validated suggestions, explicit apply step, data consent and cost/error controls.
- The credential exposed in chat must be revoked; it will not be used or saved.
- Verify actual authenticated provider calls and failure handling before claiming AI works.

## Phase 5: Reminders and installable clients — pending
- Responsive installable application, user-triggered browser notifications and reminders, voice readout and invocation.
- Background delivery needs a verified push service; in-app reminders are not equivalent.
- Windows companion: tray/shortcut/notification; Android companion: approved-group notification ingestion and assistant invocation. Device permissions and device testing required.

## Phase 6: Integrations and release — pending
- Connect only the selected approved college source; no WhatsApp write capability.
- Verify supported integration path, permission revocation, disconnection, minimal retained data.
- Test Windows and Android installations, cross-device scenarios, background reminders, accessibility, recovery and data removal.
- Full product remains incomplete until every required integration and device scenario is verified.

## Source
Software_Developer_Complete_Roadmap_2026_2028.pdf supplied by the user, 8 pages. Six-phase plan: Oct 2026–Mar 2028; 150/180-minute daily schedule; weekly assessment and Sunday review; first 13 weeks and first seven days; evidence-led milestones and spaced practice at 3/14 days.


## Verified implementation evidence (19 October 2026)
- TypeScript checks, production builds, core planner/calendar/schema tests, and two-user data-isolation tests pass.
- Local API tests verified sign-in, persistence, revision conflicts and private file access.
- Desktop and phone layouts were visually checked.
- PDF.js extracted all eight pages of the supplied roadmap. Browser PDF controls still require final interaction testing.
- Live AI, automatic WhatsApp ingestion, closed-app push reminders, and native companions remain incomplete or unverified.
- Hosted sign-in encountered an OpenAI authentication-page error; signed-in production flow requires rechecking.
