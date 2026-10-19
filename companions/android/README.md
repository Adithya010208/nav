# NAV Android companion — source preview

This is not a released APK. Build and device acceptance checks are outstanding. It opens the private NAV site in the system browser and offers an optional local notice inbox. It contains no WhatsApp outgoing action, reply, cancellation, accessibility service, network ingestion, or account credential handling.

Capture is off by default. Save one exact group title, then explicitly grant NAV notification access in Android Settings. Only `com.whatsapp` group MessagingStyle notifications with that exact title pass. Direct chats, other packages, title variations, empty/oversized text and messages older than 24 hours fail closed. The local inbox deduplicates text/timestamp pairs, retains at most 100 messages / 100,000 characters, and excludes notices older than seven days. Changing group or disconnecting clears the inbox. Android backups are disabled.

Android notification access can expose notifications broadly to a service: the filter runs before retention. No old history, attachments, muted notifications or guaranteed complete group stream is available. Duplicate group titles cannot uniquely identify a WhatsApp group; select a uniquely named group. Review notices before manually importing them into NAV. Automatic cloud ingestion and native reminders are pending.

Build requirements: Android SDK platform 36, AGP 9.4.0, Gradle 9.6.0 and JDK 17 or newer. From this directory with a configured SDK, run `gradle :app:assembleDebug`. No signing credentials are included. Release requires a signed package and actual device checks for consent, cross-group rejection, revocation, privacy, app restart, and browser sign-in.

The pure Java filter can be tested without Android SDK by compiling `SourceFilter.java` with `tests/SourceFilterTest.java`, then running `app.nav.companion.SourceFilterTest`. That test does not validate Android notification delivery or the APK.
