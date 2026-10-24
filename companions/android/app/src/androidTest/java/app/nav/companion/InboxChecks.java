package app.nav.companion;

import android.app.Instrumentation;
import android.app.Notification;
import android.app.Person;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Process;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;

/** Device-side fixtures only: never posts a notification or opens WhatsApp. */
public final class InboxChecks extends Instrumentation {
    private Context context;
    private SharedPreferences prefs;
    private int checks;
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
    private void check(boolean condition, String message) { checks++; if(!condition)throw new AssertionError(message); }
    private JSONArray inbox() throws Exception { return new JSONArray(prefs.getString("inbox","[]")); }
    private StatusBarNotification notice(String pkg,String title,boolean group,String body,long timestamp) {
        Person student = new Person.Builder().setName("Fixture student").build();
        Notification.MessagingStyle style = new Notification.MessagingStyle(student).setConversationTitle(title).setGroupConversation(group);
        style.addMessage(body,timestamp,new Person.Builder().setName("Fixture teacher").build());
        Notification n = new Notification.Builder(context,"nav-test-no-post").setSmallIcon(android.R.drawable.ic_dialog_info).setStyle(style).build();
        return new StatusBarNotification(pkg,pkg,1,null,Process.myUid(),Process.myPid(),0,n,Process.myUserHandle(),timestamp);
    }
    private void capture(String pkg,String title,boolean group,String text,long timestamp) { CollegeNotificationListener.capture(context,prefs,notice(pkg,title,group,text,timestamp)); }
    @Override public void onStart() {
        Bundle result = new Bundle();
        context=getTargetContext();prefs=context.getSharedPreferences("nav-device-test-inbox",Context.MODE_PRIVATE);
        try {
            prefs.edit().clear().putString("group","NAV Fixture College").putBoolean("enabled",false).commit();
            long now=System.currentTimeMillis();
            capture("com.whatsapp","NAV Fixture College",true,"Fixture assignment",now);check(inbox().length()==0,"capture must default off");
            prefs.edit().putBoolean("enabled",true).commit();
            capture("com.whatsapp","NAV Fixture College",true,"Fixture assignment",now);check(inbox().length()==1,"approved group must be accepted");
            capture("com.whatsapp","NAV Fixture College",true,"Fixture assignment",now);check(inbox().length()==1,"notification updates must deduplicate");
            capture("com.whatsapp","Other college",true,"Private other notice",now);check(inbox().length()==1,"other group must be excluded");
            capture("com.whatsapp","NAV Fixture College",false,"Direct chat",now);check(inbox().length()==1,"direct messages must be excluded");
            capture("com.whatsapp.w4b","NAV Fixture College",true,"Other package",now);check(inbox().length()==1,"other package must be excluded");
            capture("com.whatsapp","NAV Fixture College",true,"Old message",now-86400001L);check(inbox().length()==1,"stale message must be excluded");
            capture("com.whatsapp","NAV Fixture College",true,"Future message",now+120000);check(inbox().length()==1,"future message must be excluded");
            capture("com.whatsapp","NAV Fixture College",true," ",now);check(inbox().length()==1,"empty message must be excluded");
            for(int i=1;i<=110;i++)capture("com.whatsapp","NAV Fixture College",true,"Fixture "+i,now+i);
            check(inbox().length()==100,"retention must be capped");check(inbox().getJSONObject(0).getString("text").equals("Fixture 110"),"newest message must remain first");
            prefs.edit().putBoolean("enabled",false).remove("inbox").commit();
            capture("com.whatsapp","NAV Fixture College",true,"After disconnect",now);check(inbox().length()==0,"disconnect must stop capture");
            check(StudySchedule.nextAt(18,30,java.time.Instant.parse("2026-10-19T12:00:00Z").toEpochMilli(),"Asia/Kolkata")==java.time.Instant.parse("2026-10-19T13:00:00Z").toEpochMilli(),"phone schedule must honor wall time");
            check(StudySchedule.nextAt(18,30,java.time.Instant.parse("2026-10-19T13:00:00Z").toEpochMilli(),"Asia/Kolkata")==java.time.Instant.parse("2026-10-20T13:00:00Z").toEpochMilli(),"fired time must roll to tomorrow");
            check(StudySchedule.nextAt(2,30,java.time.Instant.parse("2026-03-08T06:00:00Z").toEpochMilli(),"America/New_York")==java.time.Instant.parse("2026-03-08T07:30:00Z").toEpochMilli(),"DST gap must resolve safely");
            boolean invalidTime=false;try{StudySchedule.nextAt(24,0,now,"UTC");}catch(java.time.DateTimeException expected){invalidTime=true;}check(invalidTime,"invalid time must fail");
            long delayed=java.time.Instant.parse("2026-10-19T13:00:00Z").toEpochMilli();
            check(StudySchedule.resumeAt(18,30,delayed+300000,"Asia/Kolkata",delayed,"Asia/Kolkata","")==delayed,"resume must preserve today's delayed alarm");
            check(StudySchedule.resumeAt(18,30,delayed+300000,"Asia/Kolkata",delayed,"Asia/Kolkata","2026-10-19")==delayed+86400000L,"delivered alarm must advance to tomorrow");
            android.content.Intent testIntent=new android.content.Intent(context,StudyAlarmReceiver.class).setAction("app.nav.companion.TEST_NOOP");
            android.app.PendingIntent testAlarm=android.app.PendingIntent.getBroadcast(context,7399,testIntent,android.app.PendingIntent.FLAG_UPDATE_CURRENT|android.app.PendingIntent.FLAG_IMMUTABLE);
            android.app.AlarmManager manager=context.getSystemService(android.app.AlarmManager.class);
            try{manager.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP,now+86400000L,testAlarm);check(android.app.PendingIntent.getBroadcast(context,7399,testIntent,android.app.PendingIntent.FLAG_NO_CREATE|android.app.PendingIntent.FLAG_IMMUTABLE)!=null,"inexact alarm must register on device");}finally{manager.cancel(testAlarm);testAlarm.cancel();}
            check(android.app.PendingIntent.getBroadcast(context,7399,testIntent,android.app.PendingIntent.FLAG_NO_CREATE|android.app.PendingIntent.FLAG_IMMUTABLE)==null,"test alarm must be removed");
            String fixtureScope="nav-sync-fixture";
            try{
                JSONObject secret=new JSONObject().put("deviceToken","navd_"+"a".repeat(64)).put("relayUrl",CloudSync.RELAY).put("group","NAV Fixture College");
                CloudCredentials.save(context,secret,fixtureScope);
                check(CloudCredentials.read(context,fixtureScope).getString("deviceToken").equals(secret.getString("deviceToken")),"Keystore credential roundtrip must work");
                check(!context.getSharedPreferences(fixtureScope,0).getAll().toString().contains(secret.getString("deviceToken")),"stored credential must not be plaintext");
                boolean invalidCredential=false;try{CloudCredentials.validate(new JSONObject(secret.toString()).put("deviceToken","bad"));}catch(Exception rejected){invalidCredential=true;}check(invalidCredential,"invalid capability must fail");
                boolean badRelay=false;try{CloudCredentials.validate(new JSONObject(secret.toString()).put("relayUrl","https://other.invalid"));}catch(Exception rejected){badRelay=true;}check(badRelay,"unapproved upload destination must fail");
                boolean broadCredential=false;try{CloudCredentials.validate(new JSONObject(secret.toString()).put("serviceToken","forbidden-fixture"));}catch(Exception rejected){broadCredential=true;}check(broadCredential,"Site service credentials must be rejected");
                context.getSharedPreferences(fixtureScope,0).edit().putString("ciphertext","AAAA").commit();
                boolean tampered=false;try{CloudCredentials.read(context,fixtureScope);}catch(Exception rejected){tampered=true;}check(tampered,"tampered encrypted data must fail closed");
            }finally{CloudCredentials.clear(context,fixtureScope);}
            check(CloudCredentials.read(context,fixtureScope)==null,"test credentials must be removed");
            JSONObject phoneSetup=new JSONObject().put("format","nav-phone-reminder-setup").put("version",1).put("deviceId","11111111-1111-4111-8111-111111111111").put("deviceToken","navp_"+"a".repeat(64)).put("expiresAt",java.time.Instant.ofEpochMilli(now+86400000).toString()).put("relayUrl",ReminderCredentials.RELAY);
            ReminderCredentials.validate(phoneSetup);check(true,"valid separate phone reminder setup must pass");
            boolean windowsRejected=false;try{ReminderCredentials.validate(new JSONObject(phoneSetup.toString()).put("deviceToken","navw_"+"a".repeat(64)));}catch(Exception rejected){windowsRejected=true;}check(windowsRejected,"Windows reminder token must not become a phone credential");
            boolean broadPhone=false;try{ReminderCredentials.validate(new JSONObject(phoneSetup.toString()).put("serviceToken","forbidden"));}catch(Exception rejected){broadPhone=true;}check(broadPhone,"broad service key must be rejected by phone reminder setup");
            boolean destinationRejected=false;try{ReminderCredentials.validate(new JSONObject(phoneSetup.toString()).put("relayUrl","https://other.invalid"));}catch(Exception rejected){destinationRejected=true;}check(destinationRejected,"phone reminder destination must be fixed");
            boolean expiredPhone=false;try{ReminderCredentials.validate(new JSONObject(phoneSetup.toString()).put("expiresAt","2000-01-01T00:00:00Z"));}catch(Exception rejected){expiredPhone=true;}check(expiredPhone,"expired phone reminder setup must fail");
            String reminderScope="nav-task-reminder-fixture";
            try{
                ReminderCredentials.save(context,phoneSetup,reminderScope);check(ReminderCredentials.read(context,reminderScope).getString("deviceToken").equals(phoneSetup.getString("deviceToken")),"separate reminder encryption must roundtrip");
                check(!context.getSharedPreferences(reminderScope,0).getAll().toString().contains(phoneSetup.getString("deviceToken")),"phone reminder token must not be plaintext at rest");
                context.getSharedPreferences(reminderScope,0).edit().putString("ciphertext","AAAA").commit();boolean corrupt=false;try{ReminderCredentials.read(context,reminderScope);}catch(Exception rejected){corrupt=true;}check(corrupt,"tampered reminder ciphertext must fail closed");
            }finally{ReminderCredentials.clear(context,reminderScope);}
            check(ReminderCredentials.read(context,reminderScope)==null,"reminder fixture credentials must be removed");
            JSONObject minimized=new JSONObject().put("profile",new JSONObject().put("onboarded",true).put("timezone","Asia/Kolkata").put("studyTime","18:30")).put("tasks",new JSONArray().put(new JSONObject().put("id","fixture-task").put("title","Fixture maths exam").put("date","2026-10-23").put("due","2026-10-24").put("status","planned")));
            check(TaskReminders.tasks(minimized).size()==1,"minimized website task snapshot must parse");
            JSONObject completed=new JSONObject(minimized.toString());completed.getJSONArray("tasks").getJSONObject(0).put("status","done");boolean completedRejected=false;try{TaskReminders.tasks(completed);}catch(Exception rejected){completedRejected=true;}check(completedRejected,"completed tasks must not enter a reminder snapshot");
            JSONObject privateField=new JSONObject(minimized.toString());privateField.getJSONArray("tasks").getJSONObject(0).put("notes","private fixture");boolean fieldsRejected=false;try{TaskReminders.tasks(privateField);}catch(Exception rejected){fieldsRejected=true;}check(fieldsRejected,"private task notes must be rejected by minimized snapshot parser");
            JSONObject invalidDate=new JSONObject(minimized.toString());invalidDate.getJSONArray("tasks").getJSONObject(0).put("due","2026-99-99");boolean invalidDateRejected=false;try{TaskReminders.tasks(invalidDate);}catch(Exception rejected){invalidDateRejected=true;}check(invalidDateRejected,"invalid deadline date must fail closed");
            JSONObject event=new JSONObject().put("id","2026-10-24:exact:fixture").put("title","NAV · Deadline now").put("body","Synthetic task").put("at",now).put("until",now+600000);
            JSONObject advanced=new JSONObject().put("version",2).put("generatedAt",now-60000).put("expiresAt",now+3600000).put("events",new JSONArray().put(event)).put("truncated",false);
            JSONObject modern=new JSONObject(minimized.toString()).put("advanced",advanced);
            check(TaskReminders.tasks(modern).size()==1,"v2 transport must preserve minimized tasks");
            check(NativeReminderBundle.events(advanced,now,java.util.Collections.emptySet()).size()==1,"v2 exact event must become eligible");
            check(NativeReminderBundle.events(advanced,now+600000,java.util.Collections.emptySet()).isEmpty(),"v2 deadline window must expire at its end");
            check(NativeReminderBundle.events(advanced,now,java.util.Collections.singleton("2026-10-24:exact:fixture")).isEmpty(),"v2 receipt must deduplicate delivery");
            check(NativeReminderBundle.events(new JSONObject(advanced.toString()).put("generatedAt",now+60001),now,java.util.Collections.emptySet()).isEmpty(),"future generated bundle must fail closed");
            boolean badVersion=false;try{NativeReminderBundle.validate(new JSONObject(advanced.toString()).put("version",3));}catch(Exception rejected){badVersion=true;}check(badVersion,"unknown bundle version must fail closed");
            boolean duplicateEvent=false;try{NativeReminderBundle.validate(new JSONObject(advanced.toString()).put("events",new JSONArray().put(event).put(event)));}catch(Exception rejected){duplicateEvent=true;}check(duplicateEvent,"duplicate event IDs must fail closed");
            boolean badWindow=false;try{NativeReminderBundle.validate(new JSONObject(advanced.toString()).put("events",new JSONArray().put(new JSONObject(event.toString()).put("until",now))));}catch(Exception rejected){badWindow=true;}check(badWindow,"invalid event window must fail closed");
            boolean extraField=false;try{NativeReminderBundle.validate(new JSONObject(advanced.toString()).put("notes","private"));}catch(Exception rejected){extraField=true;}check(extraField,"unexpected bundle fields must fail closed");
            boolean tooLong=false;try{NativeReminderBundle.validate(new JSONObject(advanced.toString()).put("expiresAt",now+73L*3600000));}catch(Exception rejected){tooLong=true;}check(tooLong,"offline horizon beyond 72 hours must fail closed");
            prefs.edit().putString("inbox",new JSONArray().put(new JSONObject().put("group","NAV Fixture College").put("text","Synthetic selected notice").put("receivedAt",now)).put(new JSONObject().put("group","Other").put("text","Do not transfer").put("receivedAt",now)).put(new JSONObject().put("group","NAV Fixture College").put("text","Expired").put("receivedAt",now-8L*86400000)).toString()).commit();
            Context isolated=new android.content.ContextWrapper(context){@Override public SharedPreferences getSharedPreferences(String name,int mode){return "college".equals(name)?prefs:"cloud-sync".equals(name)?super.getSharedPreferences("nav-device-test-sync",mode):super.getSharedPreferences(name,mode);}};
            check(CloudSync.bundle(isolated,"NAV Fixture College").getJSONArray("notices").length()==1,"upload bundle must exclude other groups and expired notices");
            try{
                CloudSync.acknowledge(isolated,CloudSync.bundle(isolated,"NAV Fixture College"));
                check(CloudSync.bundle(isolated,"NAV Fixture College").getJSONArray("notices").length()==0,"acknowledged notices must not be resent");
                prefs.edit().putString("inbox",new JSONArray().put(new JSONObject().put("group","NAV Fixture College").put("text","Synthetic selected notice").put("receivedAt",now+1)).toString()).commit();
                check(CloudSync.bundle(isolated,"NAV Fixture College").getJSONArray("notices").length()==1,"same wording at a new timestamp must remain queued");
            }finally{isolated.getSharedPreferences("cloud-sync",0).edit().clear().commit();}
            result.putString("result","PASS: "+checks+" Android notification isolation/retention checks");finish(0,result);
        } catch(Throwable failure) { result.putString("result","FAIL: "+failure.getClass().getSimpleName()+": "+failure.getMessage());finish(1,result); }
        finally { prefs.edit().clear().commit(); }
    }
}
