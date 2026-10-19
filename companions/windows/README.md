# NAV for Windows

Native Electron companion for the existing NAV account and cloud workspace. No two-friend chat functionality is included.

- Tray access, Ctrl+Space invocation, mini/full window and optional start with Windows.
- Background deadline and study reminders while NAV stays running in the tray, even when its dashboard window is hidden.
- Sign in through the hosted NAV site; credentials remain in the Chromium account session. The companion does not extract cookies or send WhatsApp messages.
- Quit from the tray to stop background operation. Reminder delivery requires network access and a valid account session; Windows notification settings can suppress sound or display.

The packaged build is unsigned. Native startup and reminder-logic checks are separate from end-to-end hosted sign-in and delivery verification. See DELIVERY.md for release status.

Development: `npm install`, `npm start`. Unit checks: `npm test`. Packaging: `npm run package` produces an unpacked Windows application under the task outputs directory. Run NAV.exe from that complete folder; do not move the executable alone.
