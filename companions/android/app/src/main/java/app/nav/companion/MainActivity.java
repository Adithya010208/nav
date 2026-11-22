package app.nav.companion;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.*;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String DEFAULT_SITE = "http://192.168.1.10:5173";

    private String getSiteUrl() {
        return prefs != null ? prefs.getString("site_url", DEFAULT_SITE) : DEFAULT_SITE;
    }

    private FrameLayout contentFrame;
    private WebView webView;
    private ScrollView scroll;
    private Button tabWebBtn;
    private Button tabSettingsBtn;
    private int currentTab = 0;
    private ValueCallback<Uri[]> filePathCallback;

    private LinearLayout layout;
    private TextView inbox;
    private SharedPreferences prefs;
    private TextView reminderStatus;
    private TextView reminderTime;
    private TextView cloudStatus;
    private TextView taskStatus;
    private int reminderHour = 18, reminderMinute = 30;
    private String pendingReminderAction = "";

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("college", MODE_PRIVATE);

        // Root container
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#ffffff"));

        // Top Navigation Switcher Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setPadding(dp(10), dp(10), dp(10), dp(10));
        topBar.setBackgroundColor(Color.parseColor("#f1f5f9"));

        tabWebBtn = new Button(this);
        tabWebBtn.setText("📚 Study Workspace");
        tabWebBtn.setTextSize(14);
        tabWebBtn.setOnClickListener(v -> switchTab(0));

        tabSettingsBtn = new Button(this);
        tabSettingsBtn.setText("⚙ Phone Reminders");
        tabSettingsBtn.setTextSize(14);
        tabSettingsBtn.setOnClickListener(v -> switchTab(1));

        LinearLayout.LayoutParams p1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        p1.setMargins(0, 0, dp(4), 0);
        LinearLayout.LayoutParams p2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        p2.setMargins(dp(4), 0, 0, 0);

        topBar.addView(tabWebBtn, p1);
        topBar.addView(tabSettingsBtn, p2);
        root.addView(topBar);

        // Content Area FrameLayout
        contentFrame = new FrameLayout(this);
        LinearLayout.LayoutParams frameParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        );
        contentFrame.setLayoutParams(frameParams);

        // View 1: Embedded Full Web Study Platform
        setupWebView();
        contentFrame.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // View 2: Native Companion Settings ScrollView
        scroll = new ScrollView(this);
        layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int padding = dp(20);
        layout.setPadding(padding, padding, padding, padding);

        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(
                    android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout()
                );
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                               insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });

        buildCompanionSettingsUi(state);
        scroll.addView(layout);
        scroll.setVisibility(View.GONE);
        contentFrame.addView(scroll, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));

        root.addView(contentFrame);
        setContentView(root);

        // Default: Open the full Study Workspace directly!
        switchTab(0);
    }

    private void switchTab(int tabIndex) {
        currentTab = tabIndex;
        if (tabIndex == 0) {
            webView.setVisibility(View.VISIBLE);
            scroll.setVisibility(View.GONE);
            tabWebBtn.setBackgroundColor(Color.parseColor("#0f172a"));
            tabWebBtn.setTextColor(Color.WHITE);
            tabSettingsBtn.setBackgroundColor(Color.parseColor("#e2e8f0"));
            tabSettingsBtn.setTextColor(Color.parseColor("#1e293b"));
        } else {
            webView.setVisibility(View.GONE);
            scroll.setVisibility(View.VISIBLE);
            tabWebBtn.setBackgroundColor(Color.parseColor("#e2e8f0"));
            tabWebBtn.setTextColor(Color.parseColor("#1e293b"));
            tabSettingsBtn.setBackgroundColor(Color.parseColor("#0f172a"));
            tabSettingsBtn.setTextColor(Color.WHITE);
            refresh();
            refreshReminder();
            refreshTasks();
            refreshCloud();
        }
    }

    private void setupWebView() {
        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://192.168.1.10:5173") ||
                    url.startsWith("http://localhost:5173") ||
                    url.startsWith("http://127.0.0.1:5173") ||
                    url.startsWith("http://10.0.2.2:5173") ||
                    url.startsWith("https://nav-personal-assistant.opalmug128.chatgpt.site") ||
                    url.startsWith("https://app.local") ||
                    url.startsWith("webcal://")) {
                    return false; // let webview handle internal app navigation
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><style>"
                    + "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:32px 20px;background:#f8fafc;color:#0f172a;text-align:center;}"
                    + ".card{background:#ffffff;border-radius:16px;padding:28px 20px;box-shadow:0 4px 12px rgba(0,0,0,0.06);max-width:380px;margin:20px auto;border:1px solid #e2e8f0;}"
                    + "h2{font-size:20px;font-weight:700;margin:12px 0 6px;color:#0f172a;}"
                    + "p{font-size:14px;color:#64748b;line-height:1.5;margin:0 0 16px;}"
                    + ".btn{display:inline-block;background:#0f172a;color:#ffffff;border:none;border-radius:10px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;width:100%;box-sizing:border-box;margin-top:8px;}"
                    + ".badge{display:inline-block;background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;margin-bottom:8px;}"
                    + "</style></head><body><div class='card'>"
                    + "<div class='badge'>CONNECTIVITY CHECK</div>"
                    + "<h2>Connecting to NAV</h2>"
                    + "<p>Make sure your phone is connected to the same Wi-Fi network as your PC (<code>192.168.1.10</code>) or plugged in via USB.</p>"
                    + "<button class='btn' onclick='location.reload()'>🔄 Retry Connection</button>"
                    + "</div></body></html>";
                view.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Grant microphone and audio capture for Hey NAV and voice dictation
                request.grant(request.getResources());
            }

            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), 9001);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.loadUrl(getSiteUrl());
    }

    private void buildCompanionSettingsUi(Bundle state) {
        text("NAV Companion Settings", 24);
        text("Configure your workspace connection, daily alarms and background notices.", 15);

        text("Study Workspace Connection", 20);
        text("Connect to your local or hosted NAV study workspace. Current address:", 14);
        EditText siteInput = new EditText(this);
        siteInput.setText(getSiteUrl());
        siteInput.setSingleLine(true);
        layout.addView(siteInput);
        button("Connect & Open Study Workspace", () -> {
            String newUrl = siteInput.getText().toString().trim();
            if (!newUrl.isEmpty()) {
                prefs.edit().putString("site_url", newUrl).apply();
                webView.loadUrl(newUrl);
                switchTab(0);
            }
        });

        text("Daily study reminder", 20);
        text("Choose a time in your phone’s time zone. For precise timing, allow NAV in Android’s Alarms & reminders settings below. Without that permission Android may delay reminders substantially.", 14);

        SharedPreferences reminderPrefs = StudyReminders.prefs(this);
        reminderHour = reminderPrefs.getInt("hour", 18);
        reminderMinute = reminderPrefs.getInt("minute", 30);
        if (state != null) {
            pendingReminderAction = state.getString("pendingReminderAction", "");
            reminderHour = state.getInt("reminderHour", reminderHour);
            reminderMinute = state.getInt("reminderMinute", reminderMinute);
        }

        reminderTime = text("", 16);
        button("Choose study reminder time", () -> new android.app.TimePickerDialog(
            this, (picker, hour, minute) -> {
                reminderHour = hour; reminderMinute = minute; refreshReminder();
            }, reminderHour, reminderMinute, false
        ).show());
        button("Enable daily study reminder", () -> requestReminder("enable"));
        button("Test NAV notification", () -> requestReminder("test"));
        button("Disable daily study reminder", () -> { StudyReminders.disable(this); refreshReminder(); });
        button("NAV notification settings", () -> startActivity(
            new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())
        ));
        button("Allow precise reminder timing", () -> {
            if (android.os.Build.VERSION.SDK_INT < 31 || StudyReminders.preciseAllowed(this)) {
                Toast.makeText(this, "Precise reminder timing is already allowed.", Toast.LENGTH_LONG).show();
                return;
            }
            new android.app.AlertDialog.Builder(this)
                .setTitle("Allow precise study reminders?")
                .setMessage("Android’s Alarms & reminders permission lets NAV schedule your chosen study time precisely, including while idle.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Open settings", (dialog, which) -> {
                    try {
                        startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName())));
                    } catch (android.content.ActivityNotFoundException unavailable) {
                        Toast.makeText(this, "Open Android Settings → Apps → Special app access → Alarms & reminders → NAV.", Toast.LENGTH_LONG).show();
                    }
                }).show();
        });
        reminderStatus = text("", 14);
        refreshReminder();

        text("Website task and deadline reminders", 20);
        text("Connect a separate read-only phone setup from NAV website Settings. This reads task titles, dates, deadlines, study time and time zone only.", 14);
        taskStatus = text("", 14);
        button("Connect website task reminders", () -> startActivityForResult(
            new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json"), 7340
        ));
        button("Enable website task reminders", () -> new android.app.AlertDialog.Builder(this)
            .setTitle("Enable read-only plan reminders?")
            .setMessage("Download your task titles, dates, deadlines and study time using the separate phone reminder connection?")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Enable", (dialog, which) -> {
                if (!TaskReminders.enable(this)) {
                    Toast.makeText(this, "Import a valid phone reminder setup and allow notifications first.", Toast.LENGTH_LONG).show();
                }
                refreshTasks();
                refreshReminder();
            }).show());
        button("Sync website task reminders now", () -> { TaskReminders.enqueue(this); refreshTasks(); });
        button("Refresh task reminder status", this::refreshTasks);
        button("Disable website task reminders", () -> { TaskReminders.disable(this); refreshTasks(); refreshReminder(); });
        button("Remove task reminder connection", () -> { TaskReminders.disconnect(this); refreshTasks(); refreshReminder(); });
        TaskReminders.importPrivateSetup(this);
        refreshTasks();

        text("Optional college notice inbox", 20);
        text("Only new Android notifications from one exact WhatsApp group are retained locally.", 14);
        EditText group = new EditText(this);
        group.setHint("Exact approved WhatsApp group title");
        group.setSingleLine(true);
        group.setText(prefs.getString("group", ""));
        layout.addView(group);

        button("Save approved group and enable capture", () -> {
            String value = group.getText().toString();
            if (value.trim().isEmpty() || value.length() > 150) {
                Toast.makeText(this, "Enter the exact group title (1–150 characters).", Toast.LENGTH_LONG).show();
                return;
            }
            synchronized (CollegeNotificationListener.class) {
                SharedPreferences.Editor edit = prefs.edit().putString("group", value).putBoolean("enabled", true);
                if (!value.equals(prefs.getString("group", ""))) {
                    edit.remove("inbox");
                    CloudSync.disconnect(this);
                }
                edit.commit();
            }
            Toast.makeText(this, "Group saved. Grant notification access in Android Settings to receive new notices.", Toast.LENGTH_LONG).show();
            refresh();
        });
        button("Notification access settings / revoke access", () -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        button("Disconnect and delete local notices", () -> {
            CloudSync.disconnect(this);
            synchronized (CollegeNotificationListener.class) {
                prefs.edit().putBoolean("enabled", false).remove("inbox").remove("group").commit();
            }
            group.setText("");
            refresh();
        });
        button("Refresh local notices", this::refresh);

        text("Optional private cloud sync", 20);
        text("Secure device setup is required. Enable sends captured notice text, group name and received times to your private NAV account.", 14);
        cloudStatus = text("", 14);
        button("Enable captured-notice cloud sync", () -> new android.app.AlertDialog.Builder(this)
            .setTitle("Enable notice uploads?")
            .setMessage("Send recent captured notices from the saved group to your private NAV account in the background?")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Enable", (dialog, which) -> {
                if (!CloudSync.enable(this)) {
                    Toast.makeText(this, "Secure setup, matching group and notification access are required.", Toast.LENGTH_LONG).show();
                }
                refreshCloud();
            }).show());
        button("Sync captured notices now", () -> { CloudSync.enqueue(this); refreshCloud(); });
        button("Disable cloud sync", () -> { CloudSync.disable(this); refreshCloud(); });
        button("Remove cloud credentials from this phone", () -> { CloudSync.disconnect(this); refreshCloud(); });
        CloudSync.importPrivateSetup(this);
        refreshCloud();

        button("Export captured notices", () -> {
            refresh();
            try {
                JSONArray entries = new JSONArray(prefs.getString("inbox", "[]"));
                if (!prefs.getBoolean("enabled", false) || entries.length() == 0) {
                    Toast.makeText(this, "No captured notices to export.", Toast.LENGTH_LONG).show();
                    return;
                }
                new android.app.AlertDialog.Builder(this)
                    .setTitle("Export college notices?")
                    .setMessage("This saves the captured notice text and group name to a file you choose.")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Choose file", (dialog, which) -> startActivityForResult(
                        new Intent(Intent.ACTION_CREATE_DOCUMENT)
                            .addCategory(Intent.CATEGORY_OPENABLE)
                            .setType("application/json")
                            .putExtra(Intent.EXTRA_TITLE, "nav-college-notices.json"), 7313
                    )).show();
            } catch (Exception invalid) {
                Toast.makeText(this, "Could not read local notices.", Toast.LENGTH_LONG).show();
            }
        });

        inbox = text("", 14);
        inbox.setTextIsSelectable(true);
        refresh();
    }

    @Override
    public void onBackPressed() {
        if (currentTab == 0 && webView != null && webView.canGoBack()) {
            webView.goBack();
        } else if (currentTab == 1) {
            switchTab(0);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (inbox != null) refresh();
        if (reminderStatus != null) { StudyReminders.ensureScheduled(this); refreshReminder(); }
        if (cloudStatus != null) { CloudSync.importPrivateSetup(this); refreshCloud(); }
        if (taskStatus != null) { TaskReminders.importPrivateSetup(this); TaskReminders.schedule(this); refreshTasks(); }
    }

    private void refreshTasks() {
        if (taskStatus == null) return;
        android.content.SharedPreferences state = TaskReminders.prefs(this);
        String value = (TaskReminders.enabled(this) ? "Website reminders enabled. " : "Website reminders off. ") +
            state.getString("status", "No separate phone reminder setup connected.");
        long sync = state.getLong("lastSyncAt", 0);
        if (sync > 0) {
            value += " Last sync: " + java.time.Instant.ofEpochMilli(sync).atZone(java.time.ZoneId.systemDefault())
                .format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a", java.util.Locale.ENGLISH)) +
                " · plan revision " + state.getLong("revision", 0) + ".";
        }
        taskStatus.setText(value);
    }

    private void refreshCloud() {
        if (cloudStatus != null) {
            cloudStatus.setText((CloudSync.prefs(this).getBoolean("enabled", false) ? "Cloud sync enabled. " : "Cloud sync off. ") +
                CloudSync.prefs(this).getString("status", "Secure device setup has not been completed."));
        }
    }

    @Override
    public void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 9001) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(result, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }
        if (request == 7340 && result == RESULT_OK && data != null && data.getData() != null) {
            try (java.io.InputStream input = getContentResolver().openInputStream(data.getData())) {
                if (input == null) throw new java.io.IOException();
                java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
                byte[] chunk = new byte[1024];
                int n;
                while ((n = input.read(chunk)) != -1) {
                    if (buffer.size() + n > 6000) throw new java.io.IOException();
                    buffer.write(chunk, 0, n);
                }
                TaskReminders.importSetup(this, new JSONObject(buffer.toString("UTF-8")));
                Toast.makeText(this, "Separate reminder setup stored encrypted. Enable website task reminders when ready.", Toast.LENGTH_LONG).show();
            } catch (Exception invalid) {
                Toast.makeText(this, "Invalid or expired phone reminder setup. Create a new one in website Settings.", Toast.LENGTH_LONG).show();
            }
            refreshTasks();
            refreshReminder();
            return;
        }
        if (request != 7313 || result != RESULT_OK || data == null || data.getData() == null) return;
        try {
            JSONObject bundle;
            synchronized (CollegeNotificationListener.class) {
                if (!prefs.getBoolean("enabled", false)) throw new IllegalStateException();
                String group = prefs.getString("group", "");
                JSONArray all = new JSONArray(prefs.getString("inbox", "[]")), kept = new JSONArray();
                long cutoff = System.currentTimeMillis() - 7L * 86400000;
                for (int i = 0; i < all.length(); i++) {
                    JSONObject notice = all.getJSONObject(i);
                    if (group.equals(notice.optString("group")) && notice.optLong("receivedAt") >= cutoff) kept.put(notice);
                }
                if (kept.length() == 0) throw new IllegalStateException();
                bundle = new JSONObject().put("format", "nav-college-notices").put("version", 1).put("group", group).put("notices", kept);
            }
            try (java.io.OutputStream output = getContentResolver().openOutputStream(data.getData(), "wt")) {
                if (output == null) throw new java.io.IOException();
                output.write(bundle.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            Toast.makeText(this, "Export saved. Open NAV → College inbox to review and import the file.", Toast.LENGTH_LONG).show();
        } catch (Exception unavailable) {
            Toast.makeText(this, "Export failed. Check your selected folder and try again.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putString("pendingReminderAction", pendingReminderAction);
        state.putInt("reminderHour", reminderHour);
        state.putInt("reminderMinute", reminderMinute);
    }

    private void requestReminder(String action) {
        if ("enable".equals(action) && TaskReminders.enabled(this)) {
            reminderStatus.setText("Website task reminders are enabled. Disable them first to restore the phone-local daily reminder.");
            return;
        }
        StudyReminders.channel(this);
        pendingReminderAction = action;
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 7310);
            return;
        }
        applyReminderAction();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == 7310) {
            if (results.length > 0 && results[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                applyReminderAction();
            } else {
                pendingReminderAction = "";
                reminderStatus.setText("Notifications were not enabled. You can change this later in NAV notification settings.");
            }
        }
    }

    private void applyReminderAction() {
        String action = pendingReminderAction;
        pendingReminderAction = "";
        if (!StudyReminders.canNotify(this)) {
            reminderStatus.setText("Notifications are blocked. Open NAV notification settings to enable this channel.");
            return;
        }
        if ("test".equals(action)) {
            reminderStatus.setText(StudyReminders.show(this, true) ? "Test accepted by Android. Check that your phone displays it and allows sound." : "The notification could not be sent.");
            return;
        }
        if ("enable".equals(action)) {
            if (!StudyReminders.enable(this, reminderHour, reminderMinute)) {
                reminderStatus.setText("Reminder could not be scheduled. Check notification settings and retry.");
                return;
            }
            refreshReminder();
        }
    }

    private void refreshReminder() {
        String chosen = java.time.LocalTime.of(reminderHour, reminderMinute)
            .format(java.time.format.DateTimeFormatter.ofPattern("h:mm a (HH:mm)", java.util.Locale.ENGLISH));
        reminderTime.setText("Chosen time: " + chosen + " · " + java.util.TimeZone.getDefault().getID() + ". Tap Enable daily study reminder to save this time.");
        if (reminderStatus == null) return;
        SharedPreferences settings = StudyReminders.prefs(this);
        if (!settings.getBoolean("enabled", false)) {
            reminderStatus.setText("Daily reminder is off.");
            return;
        }
        if (!StudyReminders.canNotify(this)) {
            reminderStatus.setText("Daily reminder is paused because notifications are blocked.");
            return;
        }
        long next = settings.getLong("nextAt", 0);
        String nextLabel = next > 0 ? java.time.Instant.ofEpochMilli(next).atZone(java.time.ZoneId.systemDefault())
            .format(java.time.format.DateTimeFormatter.ofPattern("EEE, d MMM yyyy, h:mm a (HH:mm) z", java.util.Locale.ENGLISH)) : "";
        String mode = settings.getBoolean("precise", false) && StudyReminders.preciseAllowed(this) ?
            "Precise timing is allowed. Android notification and battery settings can still affect display." :
            "Timing is approximate; Android can delay it substantially. Tap Allow precise reminder timing for delivery at your chosen time.";
        long received = settings.getLong("lastReceivedAt", 0), posted = settings.getLong("lastPostedAt", 0);
        String diagnostic = received > 0 ? " Last alarm received: " + java.time.Instant.ofEpochMilli(received)
            .atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a", java.util.Locale.ENGLISH)) +
            (posted >= received ? "; notification submitted to Android (display/sound need confirmation)." : "; no new notification submitted.") : " No scheduled alarm received yet.";
        reminderStatus.setText(next > 0 ? "Enabled. Next reminder requested for " + nextLabel + ". " + mode + diagnostic : "Enabled, but no reminder is scheduled. Disable and enable it to retry.");
    }

    private TextView text(String value, int size) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setPadding(0, dp(8), 0, dp(8));
        layout.addView(view);
        return view;
    }

    private void button(String label, Runnable action) {
        Button b = new Button(this);
        b.setText(label);
        b.setOnClickListener(v -> action.run());
        layout.addView(b, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
    }

    private void refresh() {
        boolean allowed = getSystemService(android.app.NotificationManager.class)
            .isNotificationListenerAccessGranted(new android.content.ComponentName(this, CollegeNotificationListener.class));
        StringBuilder result = new StringBuilder(prefs.getBoolean("enabled", false) ?
            (allowed ? "Capture enabled for: " : "Capture paused: notification access is off. Selected group: ") + prefs.getString("group", "") : "Capture disconnected");
        try {
            synchronized (CollegeNotificationListener.class) {
                JSONArray entries = new JSONArray(prefs.getString("inbox", "[]"));
                JSONArray kept = new JSONArray();
                long cutoff = System.currentTimeMillis() - 7L * 86400000;
                for (int i = 0; i < entries.length(); i++) {
                    JSONObject entry = entries.getJSONObject(i);
                    if (entry.optLong("receivedAt") < cutoff) continue;
                    kept.put(entry);
                    result.append("\n\n").append(new java.util.Date(entry.getLong("receivedAt"))).append("\n").append(entry.getString("text"));
                }
                prefs.edit().putString("inbox", kept.toString()).apply();
            }
        } catch (Exception ignored) {
            result.append("\nLocal notices could not be read. Disconnect to clear them.");
        }
        inbox.setText(result.toString());
    }

    @Override
    public void onBackPressed() {
        if (currentTab == 0 && webView != null && webView.canGoBack()) {
            webView.goBack();
        } else if (currentTab != 0) {
            switchTab(0);
        } else {
            super.onBackPressed();
        }
    }
}
