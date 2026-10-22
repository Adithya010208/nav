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
