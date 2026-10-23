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
    private TextView reminderStatus;
    private TextView reminderTime;
    private TextView cloudStatus;
    private TextView taskStatus;
    private int reminderHour=18,reminderMinute=30;
    private String pendingReminderAction="";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("college", MODE_PRIVATE);
        ScrollView scroll = new ScrollView(this);
        layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(20 * getResources().getDisplayMetrics().density);
        layout.setPadding(padding, padding, padding, padding);
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        scroll.addView(layout); setContentView(scroll);
        text("NAV · personal study assistant", 26);
        button("Open NAV securely in your browser", () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE))));
        text("Daily study reminder",22);
        text("Choose a time in your phone’s time zone. For precise timing, allow NAV in Android’s Alarms & reminders settings below. Without that permission Android may delay reminders substantially. Force-stopping NAV stops reminders until you reopen it. This phone schedule does not sync task deadlines from the website.",16);
        SharedPreferences reminderPrefs=StudyReminders.prefs(this);
        reminderHour=reminderPrefs.getInt("hour",18);reminderMinute=reminderPrefs.getInt("minute",30);
        if(state!=null){pendingReminderAction=state.getString("pendingReminderAction","");reminderHour=state.getInt("reminderHour",reminderHour);reminderMinute=state.getInt("reminderMinute",reminderMinute);}
        reminderTime=text("",18);
        button("Choose study reminder time",()->new android.app.TimePickerDialog(this,(picker,hour,minute)->{reminderHour=hour;reminderMinute=minute;refreshReminder();},reminderHour,reminderMinute,false).show());
        button("Enable daily study reminder",()->requestReminder("enable"));
        button("Test NAV notification",()->requestReminder("test"));
        button("Disable daily study reminder",()->{StudyReminders.disable(this);refreshReminder();});
        button("NAV notification settings",()->startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName())));
        button("Allow precise reminder timing",()->{
            if(android.os.Build.VERSION.SDK_INT<31||StudyReminders.preciseAllowed(this)){Toast.makeText(this,"Precise reminder timing is already allowed.",Toast.LENGTH_LONG).show();return;}
            new android.app.AlertDialog.Builder(this).setTitle("Allow precise study reminders?").setMessage("Android’s Alarms & reminders permission lets NAV schedule your chosen study time precisely, including while idle. You control the permission on the next screen. It does not grant access to messages or account data.").setNegativeButton("Cancel",null).setPositiveButton("Open settings",(dialog,which)->{
                try{startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));}
                catch(android.content.ActivityNotFoundException unavailable){Toast.makeText(this,"Open Android Settings → Apps → Special app access → Alarms & reminders → NAV.",Toast.LENGTH_LONG).show();}
            }).show();
        });
        reminderStatus=text("",16);refreshReminder();
        text("Website task and deadline reminders",22);
        text("Connect a separate read-only phone setup from NAV website Settings. This reads task titles, dates, deadlines, study time and time zone only. It cannot change tasks or read documents/messages. Enabling uses the website plan instead of this phone’s daily reminder; disabling restores the previous phone reminder. Android background refresh may be delayed. Fresh encrypted cached plans work offline for up to 72 hours, so recent task edits or revocation may take until the next successful sync to reach this phone.",16);
        taskStatus=text("",16);
        button("Connect website task reminders",()->startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json"),7340));
        button("Enable website task reminders",()->new android.app.AlertDialog.Builder(this).setTitle("Enable read-only plan reminders?").setMessage("Download your task titles, dates, deadlines and study time using the separate phone reminder connection? NAV will cache the minimized plan encrypted on this phone and schedule local alerts. This replaces the phone-local daily reminder while enabled. No tasks, documents or messages can be edited or uploaded through this connection.").setNegativeButton("Cancel",null).setPositiveButton("Enable",(dialog,which)->{if(!TaskReminders.enable(this))Toast.makeText(this,"Import a valid phone reminder setup and allow notifications first.",Toast.LENGTH_LONG).show();refreshTasks();refreshReminder();}).show());
        button("Sync website task reminders now",()->{TaskReminders.enqueue(this);refreshTasks();});
        button("Refresh task reminder status",this::refreshTasks);
        button("Disable website task reminders",()->{TaskReminders.disable(this);refreshTasks();refreshReminder();});
        button("Remove task reminder connection",()->{TaskReminders.disconnect(this);refreshTasks();refreshReminder();});
        TaskReminders.importPrivateSetup(this);refreshTasks();
        text("Optional college notice inbox", 22);
        text("Only new Android notifications from one exact WhatsApp group are retained locally. Notification access is broad at the OS level; NAV filters before storage. Muted, hidden, missing and old messages cannot be recovered. No replies or changes to WhatsApp are supported. Optional cloud sync below sends captured notices only to your private NAV account after secure setup and explicit opt-in.", 16);
        EditText group = new EditText(this); group.setHint("Exact approved WhatsApp group title"); group.setSingleLine(true); group.setText(prefs.getString("group", "")); layout.addView(group);
        button("Save approved group and enable capture", () -> {
            String value = group.getText().toString();
            if (value.trim().isEmpty() || value.length() > 150) { Toast.makeText(this,"Enter the exact group title (1–150 characters).",Toast.LENGTH_LONG).show(); return; }
            synchronized (CollegeNotificationListener.class) {
                SharedPreferences.Editor edit = prefs.edit().putString("group", value).putBoolean("enabled", true);
                if (!value.equals(prefs.getString("group", ""))) {edit.remove("inbox");CloudSync.disconnect(this);}
                edit.commit();
            }
            Toast.makeText(this,"Group saved. Grant notification access in Android Settings to receive new notices.",Toast.LENGTH_LONG).show(); refresh();
        });
        button("Notification access settings / revoke access", () -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        button("Disconnect and delete local notices", () -> {
            CloudSync.disconnect(this);
            synchronized (CollegeNotificationListener.class) { prefs.edit().putBoolean("enabled",false).remove("inbox").remove("group").commit(); }
            group.setText(""); refresh();
        });
        button("Refresh local notices", this::refresh);
        text("Optional private cloud sync",22);
        text("Secure device setup is required. Enable sends captured notice text, group name and received times to your private NAV account. Android controls background timing. Suggestions still need review; no tasks or WhatsApp messages are changed. Disabling stops future uploads; already synced notices remain in NAV until you delete them.",16);
        cloudStatus=text("",16);
        button("Enable captured-notice cloud sync",()->new android.app.AlertDialog.Builder(this).setTitle("Enable notice uploads?").setMessage("Send recent captured notices from the saved group to your private NAV account in the background? This includes notice text, group name and received times. Your local inbox remains available.").setNegativeButton("Cancel",null).setPositiveButton("Enable",(dialog,which)->{if(!CloudSync.enable(this))Toast.makeText(this,"Secure setup, matching group and notification access are required.",Toast.LENGTH_LONG).show();refreshCloud();}).show());
        button("Sync captured notices now",()->{CloudSync.enqueue(this);refreshCloud();});
        button("Disable cloud sync",()->{CloudSync.disable(this);refreshCloud();});
        button("Remove cloud credentials from this phone",()->{CloudSync.disconnect(this);refreshCloud();});
        CloudSync.importPrivateSetup(this);refreshCloud();
        button("Export captured notices", () -> {
            refresh();
            try {
                JSONArray entries=new JSONArray(prefs.getString("inbox","[]"));
                if(!prefs.getBoolean("enabled",false)||entries.length()==0){Toast.makeText(this,"No captured notices to export.",Toast.LENGTH_LONG).show();return;}
                new android.app.AlertDialog.Builder(this).setTitle("Export college notices?").setMessage("This saves the captured notice text and group name to a file you choose. Import it in NAV’s College inbox, then delete the file when you no longer need it. It may be saved in a cloud folder if you choose one.").setNegativeButton("Cancel",null).setPositiveButton("Choose file",(dialog,which)->startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"nav-college-notices.json"),7313)).show();
            }catch(Exception invalid){Toast.makeText(this,"Could not read local notices.",Toast.LENGTH_LONG).show();}
        });
        inbox = text("", 16); inbox.setTextIsSelectable(true);
        refresh();
    }
    @Override public void onResume() { super.onResume(); if(inbox != null) refresh(); if(reminderStatus!=null){StudyReminders.ensureScheduled(this);refreshReminder();}if(cloudStatus!=null){CloudSync.importPrivateSetup(this);refreshCloud();}if(taskStatus!=null){TaskReminders.importPrivateSetup(this);TaskReminders.schedule(this);refreshTasks();} }
    private void refreshTasks(){if(taskStatus==null)return;android.content.SharedPreferences state=TaskReminders.prefs(this);String value=(TaskReminders.enabled(this)?"Website reminders enabled. ":"Website reminders off. ")+state.getString("status","No separate phone reminder setup connected.");long sync=state.getLong("lastSyncAt",0);if(sync>0)value+=" Last sync: "+java.time.Instant.ofEpochMilli(sync).atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a",java.util.Locale.ENGLISH))+" · plan revision "+state.getLong("revision",0)+".";taskStatus.setText(value);}
    private void refreshCloud(){if(cloudStatus!=null)cloudStatus.setText((CloudSync.prefs(this).getBoolean("enabled",false)?"Cloud sync enabled. ":"Cloud sync off. ")+CloudSync.prefs(this).getString("status","Secure device setup has not been completed."));}
    @Override public void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==7340&&result==RESULT_OK&&data!=null&&data.getData()!=null){
            try(java.io.InputStream input=getContentResolver().openInputStream(data.getData())){
                if(input==null)throw new java.io.IOException();java.io.ByteArrayOutputStream buffer=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[1024];int n;while((n=input.read(chunk))!=-1){if(buffer.size()+n>6000)throw new java.io.IOException();buffer.write(chunk,0,n);}TaskReminders.importSetup(this,new JSONObject(buffer.toString("UTF-8")));Toast.makeText(this,"Separate reminder setup stored encrypted. Enable website task reminders when ready.",Toast.LENGTH_LONG).show();
            }catch(Exception invalid){Toast.makeText(this,"Invalid or expired phone reminder setup. Create a new one in website Settings.",Toast.LENGTH_LONG).show();}refreshTasks();refreshReminder();return;
        }
        if(request!=7313||result!=RESULT_OK||data==null||data.getData()==null)return;
        try {
            JSONObject bundle;
            synchronized(CollegeNotificationListener.class){
                if(!prefs.getBoolean("enabled",false))throw new IllegalStateException();
                String group=prefs.getString("group","");
                JSONArray all=new JSONArray(prefs.getString("inbox","[]")),kept=new JSONArray();
                long cutoff=System.currentTimeMillis()-7L*86400000;
                for(int i=0;i<all.length();i++){JSONObject notice=all.getJSONObject(i);if(group.equals(notice.optString("group"))&&notice.optLong("receivedAt")>=cutoff)kept.put(notice);}
                if(kept.length()==0)throw new IllegalStateException();
                bundle=new JSONObject().put("format","nav-college-notices").put("version",1).put("group",group).put("notices",kept);
            }
            try(java.io.OutputStream output=getContentResolver().openOutputStream(data.getData(),"wt")){
                if(output==null)throw new java.io.IOException();
                output.write(bundle.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            Toast.makeText(this,"Export saved. Open NAV → College inbox to review and import the file.",Toast.LENGTH_LONG).show();
        }catch(Exception unavailable){Toast.makeText(this,"Export failed. Check your selected folder and try again.",Toast.LENGTH_LONG).show();}
    }
    @Override public void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putString("pendingReminderAction",pendingReminderAction);state.putInt("reminderHour",reminderHour);state.putInt("reminderMinute",reminderMinute);}
    private void requestReminder(String action){
        if("enable".equals(action)&&TaskReminders.enabled(this)){reminderStatus.setText("Website task reminders are enabled. Disable them first to restore the phone-local daily reminder.");return;}
        StudyReminders.channel(this);pendingReminderAction=action;
        if(android.os.Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},7310);return;}
        applyReminderAction();
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){super.onRequestPermissionsResult(requestCode,permissions,results);if(requestCode==7310){if(results.length>0&&results[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)applyReminderAction();else{pendingReminderAction="";reminderStatus.setText("Notifications were not enabled. You can change this later in NAV notification settings.");}}}
    private void applyReminderAction(){
        String action=pendingReminderAction;pendingReminderAction="";
        if(!StudyReminders.canNotify(this)){reminderStatus.setText("Notifications are blocked. Open NAV notification settings to enable this channel.");return;}
        if("test".equals(action)){reminderStatus.setText(StudyReminders.show(this,true)?"Test accepted by Android. Check that your phone displays it and allows sound.":"The notification could not be sent.");return;}
        if("enable".equals(action)){if(!StudyReminders.enable(this,reminderHour,reminderMinute)){reminderStatus.setText("Reminder could not be scheduled. Check notification settings and retry.");return;}refreshReminder();}
    }
    private void refreshReminder(){
        String chosen=java.time.LocalTime.of(reminderHour,reminderMinute).format(java.time.format.DateTimeFormatter.ofPattern("h:mm a (HH:mm)",java.util.Locale.ENGLISH));
        reminderTime.setText("Chosen time: "+chosen+" · "+java.util.TimeZone.getDefault().getID()+". Tap Enable daily study reminder to save this time.");
        if(reminderStatus==null)return;
        SharedPreferences settings=StudyReminders.prefs(this);
        if(!settings.getBoolean("enabled",false)){reminderStatus.setText("Daily reminder is off.");return;}
        if(!StudyReminders.canNotify(this)){reminderStatus.setText("Daily reminder is paused because notifications are blocked.");return;}
        long next=settings.getLong("nextAt",0);
        String nextLabel=next>0?java.time.Instant.ofEpochMilli(next).atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("EEE, d MMM yyyy, h:mm a (HH:mm) z",java.util.Locale.ENGLISH)):"";
        String mode=settings.getBoolean("precise",false)&&StudyReminders.preciseAllowed(this)?"Precise timing is allowed. Android notification and battery settings can still affect display.":"Timing is approximate; Android can delay it substantially. Tap Allow precise reminder timing for delivery at your chosen time.";
        long received=settings.getLong("lastReceivedAt",0),posted=settings.getLong("lastPostedAt",0);
        String diagnostic=received>0?" Last alarm received: "+java.time.Instant.ofEpochMilli(received).atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a",java.util.Locale.ENGLISH))+(posted>=received?"; notification submitted to Android (display/sound need confirmation).":"; no new notification submitted."):" No scheduled alarm received yet.";
        reminderStatus.setText(next>0?"Enabled. Next reminder requested for "+nextLabel+". "+mode+diagnostic:"Enabled, but no reminder is scheduled. Disable and enable it to retry.");
    }
    private TextView text(String value,int size) { TextView view=new TextView(this);view.setText(value);view.setTextSize(size);view.setPadding(0,12,0,12);layout.addView(view);return view; }
    private void button(String label,Runnable action) { Button b=new Button(this);b.setText(label);b.setOnClickListener(v->action.run());layout.addView(b,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)); }
    private void refresh() {
        boolean allowed=getSystemService(android.app.NotificationManager.class).isNotificationListenerAccessGranted(new android.content.ComponentName(this,CollegeNotificationListener.class));
        StringBuilder result = new StringBuilder(prefs.getBoolean("enabled",false)?(allowed?"Capture enabled for: ":"Capture paused: notification access is off. Selected group: ")+prefs.getString("group",""):"Capture disconnected");
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
