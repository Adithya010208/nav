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
            result.putString("result","PASS: "+checks+" Android notification isolation/retention checks");finish(0,result);
        } catch(Throwable failure) { result.putString("result","FAIL: "+failure.getClass().getSimpleName()+": "+failure.getMessage());finish(1,result); }
        finally { prefs.edit().clear().commit(); }
    }
}
