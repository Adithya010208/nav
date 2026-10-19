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

## Phase 3: Documents and college intelligence — in progress
- File storage, text/PDF reading, message imports, source preservation, suggestion review, duplicate detection, deadline changes, daily digest.
- Never invent a deadline for vague language. Preserve uncertainty and source timestamps.
- Live WhatsApp is strictly read-only: no outgoing messaging or modification function anywhere.
- Verify imports, vague dates, revised notices, deduplication and private file access.

## Phase 4: AI services — blocked on a replacement private credential
- Orchestration, roadmap, planning, college/deadline/document interpretation, motivation, tutoring, reviews.
- Bounded structured outputs, validated suggestions, explicit apply step, data consent and cost/error controls.
- The credential exposed in chat must be revoked; it will not be used or saved.
- Verify actual authenticated provider calls and failure handling before claiming AI works.

## Phase 5: Reminders and installable clients — in progress
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
- PDF.js extracted all eight pages of the supplied roadmap; the browser Read text flow also extracted all eight pages in local verification.
- Live AI, automatic WhatsApp ingestion, closed-app push reminders, and native companions remain incomplete or unverified.
- Earlier hosted sign-in errors were resolved on recheck: the normal account-selection flow now opens the real private account. Onboarding saved 18 roadmap milestones and the first four-task / 150-minute plan; reload retained revision 2 and all four tasks. Cross-device/native sign-in verification remains outstanding.

## Windows companion build evidence
- Added the separate NAV desktop companion source under `companions/windows`; it contains no communication-app features.
- Packaged executable: task outputs `nav-windows/NAV-win32-x64/NAV.exe` (run from its complete folder).
- Reminder engine unit checks pass for time zones, deadline/study timing, and completed/archived exclusions.
- Hidden startup checks passed for both development and packaged executables: native window creation, nonempty icon, Ctrl+Space registration, notification API support, node integration disabled, context isolation, sandbox and web security enabled.
- Tray menu includes open/mini window, background reminders, optional Windows startup, test notification, sign out and quit.
- Still unverified: hosted sign-in from the desktop app, actual toast/sound delivery and reminders during a real signed-in background session. Native API support alone does not prove delivery.
- Android companion and actual device testing remain outstanding. At that earlier check the Android SDK was absent. It has since been installed with the user’s approval; Java 26 is installed.

## Android companion source evidence (19 October, follow-up)
- Added an Android source preview under `companions/android`: system-browser NAV launch, explicit exact-group selection, notification-access settings, local notice review, and disconnect/delete controls.
- Capture defaults off. The listener accepts only `com.whatsapp` group MessagingStyle notifications from the exact approved title. It cannot reply, dismiss notices, modify WhatsApp or send network requests.
- Notice retention is bounded to 100 messages / 100,000 characters; expired notices are pruned on receipt or opening the inbox. Group changes and disconnect delete local notices. Android backups are disabled.
- Pure Java checks passed for 11 permitted/denied cases: package, group/direct conversation, exact title, opt-in, empty/oversized body and stale/future timestamps. Existing web core and two-user isolation checks also passed.
- This is source, not a verified Android app release: no SDK/APK build, device delivery, automatic cloud ingestion, native reminders or signed installation has been verified. Duplicate group titles cannot establish unique group identity and require a uniquely named selected group before device acceptance.

## Voice, reminders and document lifecycle follow-up
- Added explicit opt-in browser dictation in English (India), Tamil and Hindi. Dictation fills an editable draft; it never submits automatically. Capture stops after 30 seconds, leaving the page, disabling the form or unmounting. Browser speech-provider processing is disclosed before opt-in.
- Readout selects an installed local voice only, includes Stop reading, and stops on navigation or changed text. Browser checks verified readout start/stop controls and local voice selection. Microphone recognition and language accuracy still require user/device checks.
- Deadline and study reminders now use separate daily identifiers, so one cannot suppress the other. Added a device test notification and removed the indefinite service-worker-ready wait. Checks cover both reminders coexisting, overnight suppression, expired study windows and completed/archived exclusions.
- Added authenticated, owner-scoped document deletion with origin/confirmation checks and an explicit irreversible-deletion dialog. Two-user isolation checks cover cross-account rejection, missing confirmation, bad origin, storage failure/retry and post-deletion denial. Real local API checks also delete their disposable upload.
- User explicitly accepted Google's SDK license and approved project-local SDK installation. Official Android command tools and Gradle archives were SHA-256 checked; Android platform 36, build tools 36 and platform tools installed. APK compilation and attached-phone checks are underway; do not treat installation alone as device verification.
- Android `assembleDebug` and `lintDebug` now pass after correcting notification-style recovery to the native Android API. Debug APK signature verification passed. Preview APK: task outputs `nav-android-preview.apk`, SHA-256 `e4993f7cbc7364ca02d2d75be8df7faf3bcc16c8ecd5a94fa5560752ef477409`. This remains a preview: no phone is currently visible to ADB, and real notification ingestion, permission revocation and automatic cloud delivery remain unverified or unfinished.
- TypeScript and production web build pass with the new voice, reminders and document deletion changes. Local desktop/phone layouts were checked; readout started and stopped correctly. The microphone was not enabled during automated checks.

- The Android preview also excludes notice data from Android 12+ cloud backups and device transfer, includes a launcher icon, and pads content for system bars/cutouts. The rebuilt APK and lint task pass. Remaining lint advisories concern explicit synchronous preference writes and using API 36 rather than 37; no lint error blocked the build.
