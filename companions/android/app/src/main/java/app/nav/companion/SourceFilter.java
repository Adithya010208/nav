package app.nav.companion;

/** Fail closed before retaining notification text. No Android dependency, so it is testable without an SDK. */
public final class SourceFilter {
    private SourceFilter() {}
    public static boolean accepts(boolean enabled, String approved, String packageName,
                                  boolean groupConversation, String title, String text,
                                  long timestamp, long now) {
        return enabled && "com.whatsapp".equals(packageName) && groupConversation
            && approved != null && !approved.trim().isEmpty() && approved.length() <= 160
            && approved.equals(title) && text != null && !text.trim().isEmpty() && text.length() <= 12000
            && timestamp > 0 && timestamp <= now + 60000 && timestamp >= now - 86400000;
    }
}
