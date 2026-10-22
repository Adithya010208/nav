# NAV for Windows

## Version 0.5.4: browser sign-in and scoped reminders

The local companion opens the NAV dashboard in the system browser. It no longer asks users to sign in inside Electron. The existing embedded OpenAI login stalled before its controls became enabled; version 0.5 removes that dependency rather than altering provider verification.

In the signed-in website, open Settings → Windows companion, enter a computer label, approve reminder-only access and create a setup. In the companion, select Connect Windows and choose the downloaded `nav-windows-setup.json`. It is verified against the reminder service before being encrypted with Electron safeStorage (Windows DPAPI). Delete the download afterward. The file is a private 30-day credential; never paste it in chat or include it in an APK/source archive.

The `navw_` credential can read only the connected owner's minimized reminder snapshot: task IDs/titles/dates/status, study time and time zone. It cannot read documents, notice text, AI conversations or profile identity, edit tasks, upload WhatsApp notices, or enter the private Site. The hosted browser session remains in the browser. Revoking a Windows connection in website Settings immediately rejects later reads; removing it locally stops this computer's access. Existing account storage is preserved.

The app fetches the latest reminder snapshot every minute while running. Website saves update it, and opening the website retries a failed update. A failed refresh must not mark a reminder delivered. Local IPC is limited to the fixed bundled page and exposes no credential. Remote navigation, webviews and renderer network access are disabled. Local builds are unsigned; real timed notification acceptance is still required separately.

Windows notification checks now distinguish disabled notifications and a busy/quiet system from an accepted toast. The app reads only NAV/global notification switches and the documented Windows notification-availability enum. It never changes OS preferences or plays a separate sound to bypass suppression. A deferred reminder retries on normal account polls while its time window is current; quitting NAV stops polling.

For verification without changing your cloud plan, select **Schedule test in 1 minute**, then close the dashboard to the tray. The next eligible account poll sends the local test (normally within one to two minutes); Windows suppression delays it for up to ten minutes. The test is local, lasts only for this running session and does not change ordinary task-reminder receipts. Successful scheduling logic alone does not prove display or sound. On 22 October, the user confirmed this updated background test appeared with sound; the diagnostic also recorded accepted with Windows availability allowed.

The notes below describe earlier embedded-browser previews.

Native Electron companion for the existing NAV account and cloud workspace. No two-friend chat functionality is included.

- Tray access, Ctrl+Space invocation, mini/full window and optional start with Windows.
- Background deadline and study reminders while NAV stays running in the tray, even when its dashboard window is hidden.
- Sign in through the hosted NAV site; credentials remain in the Chromium account session. The companion does not extract cookies or send WhatsApp messages.
- Quit from the tray to stop background operation. Reminder delivery requires network access and a valid account session; Windows notification settings can suppress sound or display.

The packaged build is unsigned. Native startup and reminder-logic checks are separate from end-to-end hosted sign-in and delivery verification. See DELIVERY.md for release status.

Development: `npm install`, `npm start`. Unit checks: `npm test`. Packaging: `npm run package` produces an unpacked Windows application under the task outputs directory. Run NAV.exe from that complete folder; do not move the executable alone.

Preview 0.3 hardens background polls: one in flight, a 15-second deadline, late-response rejection on navigation/sign-out/disable, and immediate checks after resume/unlock. Failed fetches do not fabricate or mark delivered reminders. Poll fixtures cover overlap, cancellation, disabled state, timeout recovery and errors. Test notification acceptance does not prove a scheduled background deadline was delivered.

Version 0.4 adds a tray reminder status, a manual Check reminders now action and a private diagnostic file containing generic state/timestamps only. Failed notifications are retained for retry; the app marks a reminder sent only after Electron reports it shown. Delivery confirmation does not override Windows sound/Do Not Disturb settings. Scheduled acceptance on the actual account remains required.
