package app.nav.companion;

import android.app.Notification;
import android.content.SharedPreferences;
import android.content.Context;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;

/** Deliberately never invokes actions, reply intents, cancellation, or WhatsApp APIs. */
public final class CollegeNotificationListener extends NotificationListenerService {
    @Override public void onNotificationPosted(StatusBarNotification posted) {
        capture(this, getSharedPreferences("college", MODE_PRIVATE), posted);
    }
    static void capture(Context context, SharedPreferences prefs, StatusBarNotification posted) {
        if (!"com.whatsapp".equals(posted.getPackageName())) return;
        if (!prefs.getBoolean("enabled", false)) return;
        Notification.Style recovered;
        try { recovered = Notification.Builder.recoverBuilder(context, posted.getNotification()).getStyle(); }
        catch (RuntimeException invalidNotification) { return; }
        if (!(recovered instanceof Notification.MessagingStyle)) return;
        Notification.MessagingStyle style = (Notification.MessagingStyle) recovered;
        if (!style.isGroupConversation()) return;
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
                java.util.ArrayList<JSONObject> ordered = new java.util.ArrayList<>();
                for (int i = 0; i < retained.length(); i++) ordered.add(retained.getJSONObject(i));
                ordered.sort((a,b) -> Long.compare(b.optLong("receivedAt"), a.optLong("receivedAt")));
                int bytes = 0;
                for (JSONObject entry : ordered) {
                    if (bounded.length() >= 100) break;
                    bytes += entry.toString().length();
                    if (bytes > 100000) break;
                    bounded.put(entry);
                }
                prefs.edit().putString("inbox", bounded.toString()).apply();
                CloudSync.enqueue(context);
            } catch (Exception ignored) { /* malformed local state: retain nothing new */ }
        }
    }
}
