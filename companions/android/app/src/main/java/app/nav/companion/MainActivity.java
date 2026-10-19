package app.nav.companion;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import android.widget.*;
import android.view.ViewGroup;
import org.json.JSONArray;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String SITE = "https://nav-personal-assistant.opalmug128.chatgpt.site";
    private LinearLayout layout;
    private TextView inbox;
    private SharedPreferences prefs;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("college", MODE_PRIVATE);
        ScrollView scroll = new ScrollView(this);
        layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(24, 32, 24, 32);
        scroll.addView(layout); setContentView(scroll);
        text("NAV · personal study assistant", 26);
        button("Open NAV securely in your browser", () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE))));
        text("Optional college notice inbox", 22);
        text("Only new Android notifications from one exact WhatsApp group are retained locally. Notification access is broad at the OS level; NAV filters before storage. Muted, hidden, missing and old messages cannot be recovered. No replies or changes to WhatsApp are supported. Automatic cloud ingestion is not connected in this build.", 16);
        EditText group = new EditText(this); group.setHint("Exact approved WhatsApp group title"); group.setSingleLine(true); group.setText(prefs.getString("group", "")); layout.addView(group);
        button("Save approved group and enable capture", () -> {
            String value = group.getText().toString();
            if (value.trim().isEmpty() || value.length() > 160) { Toast.makeText(this,"Enter the exact group title (1–160 characters).",Toast.LENGTH_LONG).show(); return; }
            synchronized (CollegeNotificationListener.class) {
                SharedPreferences.Editor edit = prefs.edit().putString("group", value).putBoolean("enabled", true);
                if (!value.equals(prefs.getString("group", ""))) edit.remove("inbox");
                edit.commit();
            }
            Toast.makeText(this,"Group saved. Grant notification access in Android Settings to receive new notices.",Toast.LENGTH_LONG).show(); refresh();
        });
        button("Notification access settings / revoke access", () -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        button("Disconnect and delete local notices", () -> {
            synchronized (CollegeNotificationListener.class) { prefs.edit().putBoolean("enabled",false).remove("inbox").remove("group").commit(); }
            group.setText(""); refresh();
        });
        button("Refresh local notices", this::refresh);
        inbox = text("", 16); inbox.setTextIsSelectable(true);
        refresh();
    }
    @Override public void onResume() { super.onResume(); if(inbox != null) refresh(); }
    private TextView text(String value,int size) { TextView view=new TextView(this);view.setText(value);view.setTextSize(size);view.setPadding(0,12,0,12);layout.addView(view);return view; }
    private void button(String label,Runnable action) { Button b=new Button(this);b.setText(label);b.setOnClickListener(v->action.run());layout.addView(b,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)); }
    private void refresh() {
        StringBuilder result = new StringBuilder(prefs.getBoolean("enabled",false)?"Capture enabled for: "+prefs.getString("group",""):"Capture disconnected");
        try {
            synchronized (CollegeNotificationListener.class) {
                JSONArray entries=new JSONArray(prefs.getString("inbox","[]")); JSONArray kept=new JSONArray(); long cutoff=System.currentTimeMillis()-7L*86400000;
                for(int i=0;i<entries.length();i++) { JSONObject entry=entries.getJSONObject(i);if(entry.optLong("receivedAt")<cutoff)continue;kept.put(entry);result.append("\n\n").append(new java.util.Date(entry.getLong("receivedAt"))).append("\n").append(entry.getString("text")); }
                prefs.edit().putString("inbox",kept.toString()).apply();
            }
        } catch(Exception ignored) { result.append("\nLocal notices could not be read. Disconnect to clear them."); }
        inbox.setText(result.toString());
    }
}
