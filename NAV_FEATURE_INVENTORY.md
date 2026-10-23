# NAV initial 73-feature inventory — 23 October 2026

This inventory was established before audit repairs. The earlier private-client release acceptance is not evidence that all 73 newly specified features exist. Final statuses, counts and executed tests belong in NAV_COMPLETE_AUDIT_REPORT.md.

## Architecture inspected

- React 19.2.6, Next-compatible App Router via Vinext/Vite, TypeScript, Cloudflare Worker deployment through existing private Sites project.
- ChatGPT identity from Sites-authenticated headers; local development identity is deliberately simulated and is not production sign-in evidence.
- D1: owner-keyed JSON workspaces with revision compare-and-swap, files metadata, daily AI usage, scoped device metadata and receipt deduplication. Four existing SQL migrations. Private files stored in R2 by opaque owner/id.
- Server-only Gemini tutoring/transcription; explicit OpenAI adapter, no automatic provider switch. Existing private provider configuration must not be printed or copied into clients.
- Separate Supabase inbox and reminder relays. Notice-upload, Windows reminder and Android reminder tokens have distinct prefixes/scopes. Android encrypted credentials/cache and exact alarms; Electron Windows tray reads minimized plan data. No WhatsApp write interface exists.
- Six primary UI sections: Overview, My roadmap, College inbox, Progress, Ask NAV, Settings. Today is within Overview, focus is a task dialog. No standalone Today/Focus routes yet.
- API paths: workspace GET/PUT; files GET/POST and files/:id GET/DELETE; assistant GET/POST; transcribe GET/POST; devices GET/POST/DELETE; device-inbox POST; desktop GET/POST/DELETE; phone-reminders GET/POST/DELETE. Authentication handled by hosted Sites sign-in/out routes.
- Existing tests: core logic, API integration, two-user isolation, AI context, notice transfer/relay, scoped desktop/mobile APIs, OCR, PCM transcription; Windows poller/connection/policy/verification; Android pure policies and 43 device fixtures. Their new audit-run results are not yet claimed here.

## Initial gaps and existing implementation by feature

| ID | Feature | Initial implementation / gap |
|---|---|---|
|1|AI Chat Assistant|Gemini single-turn tutor with workspace context; no persistent conversation history.|
|2|Long-Term Memory|Profile/tasks persist; no explicit goal/fact memory or conversation retrieval.|
|3|Multi-Agent AI System|Four prompt modes; no coordinating multi-agent execution.|
|4|Context Awareness|Bounded owner-specific task/milestone/practice/focus context.|
|5|Personalization|Study capacity/time/zone/exam preferences; no goal memory.|
|6|Daily Task Planner|Roadmap generation bounded by daily minutes, duplicate plan prevention.|
|7|AI Task Prioritization|AI planning advice plus deterministic deadline/priority sort; no ranked task apply workflow.|
|8|Automatic Scheduling|Dates/capacity; no actual time-slot persistence.|
|9|Deadline Tracking|Date-only deadlines and native summary alerts; no deadline clock time.|
|10|Smart Rescheduling|Capacity-aware unfinished tasks, stale-write protection.|
|11|Conflict Detection|Capacity limit only; no event-overlap model.|
|12|Task Categorization|Five categories with search/filter.|
|13|Task Completion Tracking|Planned/partial/done/missed and archive; no recurring tasks.|
|14|WhatsApp Group Reader|Opt-in exact-group Android notification capture/import; not direct group/history API.|
|15|Message Analysis|Local rules plus consented selected-source Gemini analysis.|
|16|Automatic Task Extraction|Reviewed suggestions; no silent task writes.|
|17|Deadline Extraction|ISO dates/today/tomorrow; other date forms and clock times incomplete.|
|18|Exam Timetable Detection|Exam keyword detection; no structured multi-row exam schedule.|
|19|Announcement Summarizer|Selected-source AI analysis; digest is titles/counts.|
|20|Change Detection|Possible existing-task fuzzy match; edited WhatsApp history unavailable.|
|21|Source Verification|Original imported text/time/id retained; source is imported notification, not authenticated original truth.|
|22|Read-Only WhatsApp Access|Strict notification filter, no outgoing operations.|
|23|Roadmap Integration|Supplied roadmap manually encoded; PDF extraction does not create arbitrary roadmap topics.|
|24|Learning Progress Tracker|Cloud milestone checkboxes/evidence.|
|25|AI Study Tutor|Live Gemini verified earlier; arbitrary factual correctness cannot be guaranteed.|
|26|Coding Coach|Generic tutor can accept code; no dedicated review mode.|
|27|Exam Preparation Mode|Global exam mode alters generation; no per-exam timetable preparation.|
|28|Smart Revision Planner|3/14-day dates; scheduling action only uses first interval.|
|29|Skill Graph|Missing dependencies and graph.|
|30|Personalized Learning Suggestions|First unfinished/current-week roadmap topic and AI recommendations.|
|31|Voice Conversations|User-verified push-to-talk transcription and browser speech synthesis; not background listening.|
|32|Custom Wake Phrase|Missing; no continuous/background listener.|
|33|Voice Task Creation|Speech fills question only; no command-to-reviewed-task flow.|
|34|Voice Schedule Briefing|Workspace briefing Read aloud control.|
|35|Voice Progress Updates|Missing reviewed completion intent.|
|36|Intelligent Reminders|Native daily study/deadline policy; real device scheduled sound accepted.|
|37|Deadline Alerts|Next-day/overdue summaries, separate scoped connections.|
|38|Daily Morning Briefing|Only deadline notification after 08:00, no full morning briefing.|
|39|Evening Check-In|Missing scheduled check-in and response workflow.|
|40|Missed Task Alerts|Overdue deadlines only; unfinished non-deadline tasks lack check-in.|
|41|Calendar Integration|ICS export snapshot only; no retrieval or two-way synchronization.|
|42|AI Motivation Coach|Grounded AI review/support prompt; no dedicated mode/history.|
|43|Focus Timer|Measured pause/resume/save dialog; no break timer.|
|44|Distraction Management|Modal focus experience only; no OS blocking permissions.|
|45|Daily Productivity Score|Missing explainable daily score.|
|46|Habit Tracking|Missing routines/check-ins/streaks.|
|47|Progress Visualization|Weekly completion bars and totals; future-dated records can inflate metrics.|
|48|Weekly Performance Review|Bounded AI review and local totals; future-bound filtering incomplete in UI.|
|49|Monthly Progress Report|Missing month-specific report.|
|50|Project Management|Project task category only; no project entity/milestones.|
|51|Career Roadmap Tracker|Career phases and milestone tracking.|
|52|Coding Practice Tracker|Problem/pattern/result/notes and revision dates.|
|53|Internship and Opportunity Tracker|Missing opportunity/application entity.|
|54|PDF Analyzer|Private text extraction and local OCR verified on synthetic scan.|
|55|Document-Based Task Extraction|Excerpt → college import → reviewed suggestions; not automatic.|
|56|Searchable Memory|Task title/notes/category only; no conversation/memory/source retrieval search.|
|57|Daily Information Digest|Current plan/deadlines and last imported notice titles.|
|58|Android Companion App|Installed 0.8, actual scoped sync and scheduled sound verified.|
|59|Windows Desktop Companion|Portable 0.5.4 actual scheduled sound verified; optional unsigned installer not execution-tested.|
|60|Real-Time Synchronization|20-second/focus web refresh; Android native background refresh system-controlled. Not instant push.|
|61|Personal Dashboard|Actual owner workspace, empty states and measured records.|
|62|ChatGPT Sign-In|Hosted Sites identity; native opens system browser rather than unsupported embedded sign-in.|
|63|Private User Workspace|Owner-keyed D1/R2 queries, revision CAS, private Site.|
|64|Permission Controls|UI revocation and OS permission flows; no full workspace deletion workflow.|
|65|Read-Only External Integrations|Minimized scoped reminder/read and append-only notice upload permissions.|
|66|Verified AI Outputs|Schema checks/review/source references; no independent truth verifier.|
|67|Home|Overview implemented.|
|68|Today|Overview date selection/task plan; no named standalone destination.|
|69|College|Inbox, imports, review/source modal, documents.|
|70|Roadmap|Encoded topics/progress; fixed phase dates instead of user-relative labels.|
|71|Focus|Task dialog only; no standalone focus/break experience.|
|72|Progress|Practice/focus/weekly bars; no monthly analytics/habits.|
|73|Ask NAV|Local rule-based briefing plus separately labelled AI; draft is transient.|

## Repair priorities established before changes

1. Preserve existing auth/device scopes and data. Re-run existing suites and production build; record actual results.
2. Correct future-record analytics, time-zone/date handling, incomplete 14-day revision scheduling, stale/unsafe UI actions and unbounded provider response handling.
3. Add backward-compatible owner-workspace models and functional UI for missing memory, conversations, habits, projects, opportunities, slot planning and review workflows where feasible without external permissions.
4. Explicitly distinguish imported calendar snapshots from connected calendar synchronization, notification capture from direct WhatsApp history, and push-to-talk/foreground wake matching from OS background listening.
5. Test browser workflows in an isolated local account before private publication. Never use production user tasks as disposable fixtures.
