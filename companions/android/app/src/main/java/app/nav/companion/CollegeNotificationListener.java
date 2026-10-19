package app.nav.companion;

import android.app.Notification;
import android.content.SharedPreferences;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;

/** Deliberately never invokes actions, reply intents, cancellation, or WhatsApp APIs. */
public final class CollegeNotificationListener extends NotificationListenerService {
    @Override public void onNotificationPosted(StatusBarNotification posted) {
        if (!"com.whatsapp".equals(posted.getPackageName())) return;
        SharedPreferences prefs = getSharedPreferences("college", MODE_PRIVATE);
        if (!prefs.getBoolean("enabled", false)) return;
        Notification.MessagingStyle style = Notification.MessagingStyle.extractMessagingStyleFromNotification(posted.getNotification());
        if (style == null || !style.isGroupConversation()) return;
        CharSequence rawTitle = style.getConversationTitle();
        String title = rawTitle == null ? "" : rawTitle.toString();
        if (!title.equals(prefs.getString("group", ""))) return;
        // Store only bounded, recent message text from the approved conversation.
        synchronized (CollegeNotificationListener.class) {
            if (!prefs.getBoolean("enabled", false) || !title.equals(prefs.getString("group", ""))) return;
            try {
                long now = System.currentTimeMillis();
                JSONArray existing = new JSONArray(prefs.getString("inbox", "[]"));
                JSONArray retained = new JSONArray();
                for (int i = 0; i < existing.length(); i++) {
                    JSONObject entry = existing.getJSONObject(i);
                    if (entry.optLong("receivedAt") >= now - 7L * 86400000 && title.equals(entry.optString("group"))) retained.put(entry);
                }
                for (Notification.MessagingStyle.Message message : style.getMessages()) {
                    String text = message.getText() == null ? "" : message.getText().toString();
                    if (!SourceFilter.accepts(true, title, posted.getPackageName(), true, title, text, message.getTimestamp(), now)) continue;
                    boolean duplicate = false;
                    for (int i = 0; i < retained.length(); i++) {
                        JSONObject entry = retained.getJSONObject(i);
                        if (entry.optLong("receivedAt") == message.getTimestamp() && text.equals(entry.optString("text"))) { duplicate = true; break; }
                    }
                    if (!duplicate) retained.put(new JSONObject().put("group", title).put("text", text).put("receivedAt", message.getTimestamp()));
                }
                JSONArray bounded = new JSONArray();
                int bytes = 0;
                for (int i = retained.length() - 1; i >= 0 && bounded.length() < 100; i--) {
                    JSONObject entry = retained.getJSONObject(i);
                    bytes += entry.toString().length();
                    if (bytes > 100000) break;
                    bounded.put(entry);
                }
                prefs.edit().putString("inbox", bounded.toString()).apply();
            } catch (Exception ignored) { /* malformed local state: retain nothing new */ }
        }
    }
}
