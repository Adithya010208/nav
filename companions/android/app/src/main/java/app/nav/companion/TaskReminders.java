package app.nav.companion;

import android.app.*;
import android.app.job.*;
import android.content.*;
import java.time.*;
import java.util.*;
import org.json.*;

final class TaskReminders {
    static final String ACTION="app.nav.companion.PLAN_REMINDER";
    static SharedPreferences prefs(Context context){return context.getSharedPreferences("task-reminders",0);}
    static List<TaskReminderPlan.Task> tasks(JSONObject data) throws Exception {
        if(data.length()!=2||!data.has("profile")||!data.has("tasks"))throw new IllegalArgumentException();
        JSONObject profile=data.getJSONObject("profile");if(profile.length()!=3)throw new IllegalArgumentException();
        ZoneId.of(profile.getString("timezone"));LocalTime.parse(profile.getString("studyTime"));profile.getBoolean("onboarded");
        JSONArray values=data.getJSONArray("tasks");if(values.length()>3000)throw new IllegalArgumentException();List<TaskReminderPlan.Task> tasks=new ArrayList<>();
        for(int i=0;i<values.length();i++){JSONObject task=values.getJSONObject(i);if(task.length()!=5)throw new IllegalArgumentException();String id=task.getString("id"),title=task.getString("title"),date=task.getString("date"),due=task.getString("due"),status=task.getString("status");
            if(id.isEmpty()||id.length()>100||title.length()>160||!new HashSet<>(Arrays.asList("planned","partial","missed")).contains(status))throw new IllegalArgumentException();LocalDate.parse(date);if(!due.isEmpty())LocalDate.parse(due);
            tasks.add(new TaskReminderPlan.Task(id,title.replaceAll("[\\p{Cntrl}]"," "),date,due));
        }return tasks;
    }
    static Set<String> seen(Context context){return new HashSet<>(prefs(context).getStringSet("seen",Collections.emptySet()));}
    static boolean enabled(Context context){return prefs(context).getBoolean("enabled",false);}
    static void status(Context context,String value){prefs(context).edit().putString("status",value).apply();}
    static synchronized void importSetup(Context context,JSONObject value) throws Exception {
        ReminderCredentials.validate(value);disconnect(context);ReminderCredentials.save(context,value,ReminderCredentials.SCOPE);prefs(context).edit().remove("seen").remove("lastSyncAt").remove("revision").putString("status","Separate reminder setup stored encrypted. Reminders remain off until enabled.").apply();
    }
    static void importPrivateSetup(Context context){
        java.io.File source=new java.io.File(context.getFilesDir(),"nav-task-reminder-setup.json");if(!source.exists())return;
        try{if(source.length()>6000)throw new java.io.IOException();String text;try(java.io.FileInputStream input=new java.io.FileInputStream(source)){java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[1024];int n;while((n=input.read(chunk))!=-1){if(bytes.size()+n>6000)throw new java.io.IOException();bytes.write(chunk,0,n);}text=bytes.toString("UTF-8");}importSetup(context,new JSONObject(text));}
        catch(Exception invalid){status(context,"Private reminder setup could not be imported. Create a fresh phone reminder setup.");}
        finally{if(!source.delete())status(context,"Private setup cleanup failed. Remove the staging file before continuing.");}
    }
    static synchronized boolean enable(Context context){
        try{if(ReminderCredentials.credential(context)==null||!StudyReminders.canNotify(context))return false;
            if(!enabled(context)){prefs(context).edit().putBoolean("restoreDaily",StudyReminders.prefs(context).getBoolean("enabled",false)).putBoolean("enabled",true).apply();StudyReminders.disable(context);}
            JobScheduler jobs=context.getSystemService(JobScheduler.class);
            if(jobs.schedule(new JobInfo.Builder(7341,new ComponentName(context,TaskReminderJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60000L).setPersisted(true).setBackoffCriteria(30000,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build())!=JobScheduler.RESULT_SUCCESS){disable(context);return false;}
            enqueue(context);schedule(context);return true;
        }catch(Exception failed){disable(context);return false;}
    }
    static void enqueue(Context context){if(enabled(context))context.getSystemService(JobScheduler.class).schedule(new JobInfo.Builder(7342,new ComponentName(context,TaskReminderJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(1000).setBackoffCriteria(30000,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build());}
    static PendingIntent alarm(Context context,int flags){return PendingIntent.getBroadcast(context,7343,new Intent(context,TaskReminderReceiver.class).setAction(ACTION),flags|PendingIntent.FLAG_IMMUTABLE);}
    static void cancelAlarm(Context context){PendingIntent pending=alarm(context,PendingIntent.FLAG_NO_CREATE);if(pending!=null){context.getSystemService(AlarmManager.class).cancel(pending);pending.cancel();}prefs(context).edit().remove("nextAt").apply();}
    static synchronized void disable(Context context){
        boolean restore=enabled(context)&&prefs(context).getBoolean("restoreDaily",false);prefs(context).edit().putBoolean("enabled",false).putBoolean("restoreDaily",false).apply();
        context.getSystemService(JobScheduler.class).cancel(7341);context.getSystemService(JobScheduler.class).cancel(7342);cancelAlarm(context);context.getSystemService(NotificationManager.class).cancel(7344);context.getSystemService(NotificationManager.class).cancel(7345);
        ReminderCredentials.clear(context,ReminderCredentials.CACHE);
        if(restore){SharedPreferences daily=StudyReminders.prefs(context);StudyReminders.enable(context,daily.getInt("hour",18),daily.getInt("minute",30));}
    }
    static synchronized void disconnect(Context context){disable(context);ReminderCredentials.clear(context,ReminderCredentials.SCOPE);status(context,"Task reminder connection removed. Revoke it in website Settings as well.");}
    static JSONObject cache(Context context) throws Exception {
        JSONObject credential=ReminderCredentials.credential(context),cache=ReminderCredentials.read(context,ReminderCredentials.CACHE);long now=System.currentTimeMillis();
        if(credential==null||cache==null||!credential.getString("deviceId").equals(cache.getString("scope"))||cache.getLong("syncedAt")>now+60000||cache.getLong("syncedAt")<now-72L*3600000)return null;
        tasks(cache.getJSONObject("data"));return cache;
    }
    static List<TaskReminderPlan.Event> events(Context context,JSONObject cache,long now) throws Exception {
        JSONObject data=cache.getJSONObject("data"),profile=data.getJSONObject("profile");if(!profile.getBoolean("onboarded"))return Collections.emptyList();
        return TaskReminderPlan.events(tasks(data),profile.getString("timezone"),profile.getString("studyTime"),now,seen(context));
    }
    static synchronized void schedule(Context context){
        cancelAlarm(context);if(!enabled(context)||!StudyReminders.canNotify(context))return;
        try{JSONObject cache=cache(context);if(cache==null){status(context,"No fresh task plan available. Connect to the internet and sync.");return;}
            long now=System.currentTimeMillis(),next=now+12*3600000L;List<TaskReminderPlan.Event> events=events(context,cache,now);if(!events.isEmpty())next=Math.max(now+1000,events.get(0).at);
            next=Math.min(next,cache.getLong("syncedAt")+72L*3600000+1000);
            AlarmManager manager=context.getSystemService(AlarmManager.class);boolean precise=StudyReminders.preciseAllowed(context);
            if(precise){try{manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,alarm(context,PendingIntent.FLAG_UPDATE_CURRENT));}catch(SecurityException denied){precise=false;manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,alarm(context,PendingIntent.FLAG_UPDATE_CURRENT));}}
            else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,alarm(context,PendingIntent.FLAG_UPDATE_CURRENT));
            prefs(context).edit().putLong("nextAt",next).putBoolean("precise",precise).apply();
        }catch(Exception invalid){status(context,"Task reminder setup or cached plan is unavailable. Renew setup and sync.");}
    }
    static synchronized void deliver(Context context){
        if(!enabled(context))return;
        try{JSONObject cache=cache(context);if(cache==null)return;long now=System.currentTimeMillis();Set<String> receipts=seen(context);
            for(TaskReminderPlan.Event event:events(context,cache,now)){if(event.at>now||now>=event.until)continue;if(post(context,event)){receipts.add(event.key);prefs(context).edit().putLong("lastPostedAt",now).apply();}}
            String cutoff=LocalDate.now(ZoneOffset.UTC).minusDays(7).toString();receipts.removeIf(key->key.compareTo(cutoff)<0);prefs(context).edit().putStringSet("seen",receipts).apply();
        }catch(Exception failed){status(context,"Task reminder delivery failed. Check notification settings and sync.");}
        finally{schedule(context);}
    }
    private static boolean post(Context context,TaskReminderPlan.Event event){
        StudyReminders.channel(context);if(!StudyReminders.canNotify(context))return false;
        PendingIntent open=PendingIntent.getActivity(context,7346,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(context,StudyReminders.CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(event.title).setContentText(event.body).setStyle(new Notification.BigTextStyle().bigText(event.body)).setContentIntent(open).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();
        try{context.getSystemService(NotificationManager.class).notify(event.key.endsWith(":study")?7344:7345,notification);return true;}catch(SecurityException denied){return false;}
    }
}



