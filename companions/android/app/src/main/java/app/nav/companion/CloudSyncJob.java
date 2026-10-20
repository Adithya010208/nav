package app.nav.companion;

import android.app.job.JobService;
import android.app.job.JobParameters;
import java.util.concurrent.ConcurrentHashMap;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

public final class CloudSyncJob extends JobService {
    private static final class Work {volatile boolean stopped;volatile HttpsURLConnection connection;}
    private final ConcurrentHashMap<Integer,Work> running=new ConcurrentHashMap<>();
    @Override public boolean onStartJob(JobParameters parameters){
        Work work=new Work();running.put(parameters.getJobId(),work);
        new Thread(()->{boolean retry=false;try{retry=upload(work);}finally{if(running.remove(parameters.getJobId(),work)&&!work.stopped)jobFinished(parameters,retry);}},"NAV notice sync").start();return true;
    }
    @Override public boolean onStopJob(JobParameters parameters){Work work=running.remove(parameters.getJobId());if(work!=null){work.stopped=true;if(work.connection!=null)work.connection.disconnect();}return CloudSync.prefs(this).getBoolean("enabled",false);}
    private boolean upload(Work work){
        try{
            JSONObject credential=CloudCredentials.read(this,CloudCredentials.SCOPE);if(!CloudSync.ready(this,credential)||work.stopped)return false;
            JSONObject bundle=CloudSync.bundle(this,credential.getString("group"));if(bundle.getJSONArray("notices").length()==0){status("No captured notices waiting for sync.");return false;}
            byte[] body=bundle.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);if(body.length>500000){pause("Notice batch is too large. Review the local inbox.");return false;}
            HttpsURLConnection connection=(HttpsURLConnection)new java.net.URL(CloudSync.SITE+"/api/device-inbox").openConnection();work.connection=connection;
            connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(15000);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setFixedLengthStreamingMode(body.length);
            connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Authorization","Bearer "+credential.getString("deviceToken"));connection.setRequestProperty("OAI-Sites-Authorization","Bearer "+credential.getString("serviceToken"));
            if(!CloudSync.ready(this,credential)||work.stopped)return false;
            try(java.io.OutputStream output=connection.getOutputStream()){output.write(body);}
            int code=connection.getResponseCode();
            if(code==200){
                java.io.ByteArrayOutputStream buffer=new java.io.ByteArrayOutputStream();try(java.io.InputStream input=connection.getInputStream()){byte[] chunk=new byte[1024];int count;while((count=input.read(chunk))!=-1){if(buffer.size()+count>4096)throw new java.io.IOException();buffer.write(chunk,0,count);}}
                JSONObject result=new JSONObject(buffer.toString("UTF-8"));if(!result.has("added")||!result.has("duplicates"))throw new java.io.IOException();
                status("Cloud notices synced. Review suggestions in NAV; no tasks were applied.");CloudSync.prefs(this).edit().putLong("lastSuccessAt",System.currentTimeMillis()).apply();return false;
            }
            if(code==409||code==429||code>=500){status("Sync delayed. Local notices retained for retry.");return true;}
            pause("Cloud sync paused. Renew secure setup and check the approved group in NAV.");return false;
        }catch(Exception unavailable){if(!work.stopped)status("Offline or sync unavailable. Local notices retained for retry.");return !work.stopped;}
        finally{if(work.connection!=null)work.connection.disconnect();}
    }
    private void status(String message){CloudSync.prefs(this).edit().putString("status",message).apply();}
    private void pause(String message){CloudSync.disable(this);status(message);}
}
