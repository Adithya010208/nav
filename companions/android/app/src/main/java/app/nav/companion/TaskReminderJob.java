package app.nav.companion;
import android.app.job.*;
import java.util.concurrent.ConcurrentHashMap;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

public final class TaskReminderJob extends JobService {
    private static final class Work{volatile boolean stopped;volatile HttpsURLConnection connection;}
    private final ConcurrentHashMap<Integer,Work> running=new ConcurrentHashMap<>();
    @Override public boolean onStartJob(JobParameters parameters){Work work=new Work();running.put(parameters.getJobId(),work);new Thread(()->{boolean retry=false;try{retry=sync(work);}finally{if(running.remove(parameters.getJobId(),work)&&!work.stopped)jobFinished(parameters,retry);}},"NAV task reminders").start();return true;}
    @Override public boolean onStopJob(JobParameters parameters){Work work=running.remove(parameters.getJobId());if(work!=null){work.stopped=true;if(work.connection!=null)work.connection.disconnect();}return TaskReminders.enabled(this);}
    private boolean sync(Work work){
        try{
            if(!TaskReminders.enabled(this)||work.stopped)return false;
            JSONObject credential;
            try{credential=ReminderCredentials.credential(this);if(credential==null)throw new IllegalArgumentException();}
            catch(Exception invalid){synchronized(TaskReminders.class){if(!work.stopped){TaskReminders.disable(this);TaskReminders.status(this,"Task reminder setup expired or is unavailable. Renew setup before enabling it again; your previous daily reminder is restored when possible.");}}return false;}
            HttpsURLConnection connection=(HttpsURLConnection)new java.net.URL(ReminderCredentials.RELAY+"?op=read").openConnection();work.connection=connection;
            connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(15000);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setFixedLengthStreamingMode(2);connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Authorization","Bearer "+credential.getString("deviceToken"));
            try(java.io.OutputStream output=connection.getOutputStream()){output.write(new byte[]{123,125});}
            int code=connection.getResponseCode();
            if(code==401||code==403){synchronized(TaskReminders.class){if(current(credential,work)){TaskReminders.disconnect(this);TaskReminders.status(this,"Task reminder access expired or was revoked. Create a new setup in website Settings.");}}return false;}
            if(code!=200)throw new java.io.IOException();
            java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();try(java.io.InputStream input=connection.getInputStream()){byte[] chunk=new byte[8192];int n;while((n=input.read(chunk))!=-1){if(work.stopped)return false;if(bytes.size()+n>1250000)throw new java.io.IOException();bytes.write(chunk,0,n);}}
            JSONObject reply=new JSONObject(bytes.toString("UTF-8"));long now=System.currentTimeMillis();
            if(!credential.getString("deviceId").equals(reply.getString("scope"))||!(reply.get("revision") instanceof Number)||reply.getDouble("revision")!=reply.getLong("revision")||reply.getLong("revision")<0||reply.getLong("revision")>9007199254740991L||java.time.Instant.parse(reply.getString("updatedAt")).toEpochMilli()>now+60000||java.time.Instant.parse(reply.getString("expiresAt")).toEpochMilli()<=now)throw new IllegalArgumentException();
            TaskReminders.tasks(reply.getJSONObject("data"));
            synchronized(TaskReminders.class){
                if(!current(credential,work))return false;
                JSONObject previous=ReminderCredentials.read(this,ReminderCredentials.CACHE);if(previous!=null&&previous.getString("scope").equals(reply.getString("scope"))&&previous.getLong("revision")>reply.getLong("revision"))throw new IllegalArgumentException();
                JSONObject cache=new JSONObject().put("scope",reply.getString("scope")).put("revision",reply.getLong("revision")).put("data",reply.getJSONObject("data")).put("syncedAt",now);
                ReminderCredentials.save(this,cache,ReminderCredentials.CACHE);TaskReminders.prefs(this).edit().putLong("lastSyncAt",now).putLong("revision",reply.getLong("revision")).apply();
                TaskReminders.status(this,"Website task plan synchronized. Android controls background refresh; cached reminders work offline for up to 72 hours.");TaskReminders.schedule(this);
            }return false;
        }catch(Exception unavailable){if(!work.stopped&&TaskReminders.enabled(this))TaskReminders.status(this,"Task sync delayed. Any fresh cached plan is retained; connect to the internet and retry.");return !work.stopped&&TaskReminders.enabled(this);}
        finally{if(work.connection!=null)work.connection.disconnect();}
    }
    private boolean current(JSONObject expected,Work work) throws Exception {JSONObject actual=ReminderCredentials.credential(this);return !work.stopped&&TaskReminders.enabled(this)&&actual!=null&&expected.getString("deviceId").equals(actual.getString("deviceId"));}
}
