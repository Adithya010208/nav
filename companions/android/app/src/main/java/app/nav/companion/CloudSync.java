package app.nav.companion;

import android.content.Context;
import android.content.ComponentName;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import org.json.JSONObject;
import org.json.JSONArray;

final class CloudSync {
    static final String SITE="https://nav-personal-assistant.opalmug128.chatgpt.site";
    static android.content.SharedPreferences prefs(Context context){return context.getSharedPreferences("cloud-sync",0);}
    static boolean ready(Context context,JSONObject credential){
        if(!prefs(context).getBoolean("enabled",false)||credential==null)return false;
        android.content.SharedPreferences college=context.getSharedPreferences("college",0);
        return college.getBoolean("enabled",false)&&credential.optString("group").equals(college.getString("group",""))&&context.getSystemService(android.app.NotificationManager.class).isNotificationListenerAccessGranted(new ComponentName(context,CollegeNotificationListener.class));
    }
    static void disable(Context context){prefs(context).edit().putBoolean("enabled",false).apply();context.getSystemService(JobScheduler.class).cancel(7320);context.getSystemService(JobScheduler.class).cancel(7321);}
    static void disconnect(Context context){disable(context);CloudCredentials.clear(context,CloudCredentials.SCOPE);prefs(context).edit().putString("status","Cloud sync disconnected. Revoke the old device in NAV as well.").apply();}
    static void enqueue(Context context){
        try{if(!ready(context,CloudCredentials.read(context,CloudCredentials.SCOPE)))return;
            context.getSystemService(JobScheduler.class).schedule(new JobInfo.Builder(7320,new ComponentName(context,CloudSyncJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(10000).setBackoffCriteria(30000,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build());
        }catch(Exception ignored){prefs(context).edit().putString("status","Secure setup needs to be renewed.").apply();}
    }
    static boolean enable(Context context){
        try{JSONObject value=CloudCredentials.read(context,CloudCredentials.SCOPE);prefs(context).edit().putBoolean("enabled",true).apply();if(!ready(context,value)){disable(context);return false;}
            int scheduled=context.getSystemService(JobScheduler.class).schedule(new JobInfo.Builder(7321,new ComponentName(context,CloudSyncJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60000L).setPersisted(true).setBackoffCriteria(30000,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build());
            if(scheduled!=JobScheduler.RESULT_SUCCESS){disable(context);return false;}enqueue(context);return true;
        }catch(Exception ignored){disable(context);return false;}
    }
    static JSONObject bundle(Context context,String group) throws Exception {
        JSONArray kept=new JSONArray();long now=System.currentTimeMillis();
        synchronized(CollegeNotificationListener.class){JSONArray all=new JSONArray(context.getSharedPreferences("college",0).getString("inbox","[]"));for(int i=0;i<all.length();i++){JSONObject n=all.getJSONObject(i);if(group.equals(n.optString("group"))&&n.optLong("receivedAt")>=now-7L*86400000&&n.optLong("receivedAt")<=now+60000)kept.put(n);}}
        return new JSONObject().put("format","nav-college-notices").put("version",1).put("group",group).put("notices",kept);
    }
    static void importPrivateSetup(Context context){
        java.io.File file=new java.io.File(context.getFilesDir(),"nav-device-provision.json");if(!file.exists())return;
        disable(context);
        try{
            if(file.length()>16384)throw new IllegalArgumentException();
            byte[] bytes=new byte[(int)file.length()];try(java.io.DataInputStream input=new java.io.DataInputStream(new java.io.FileInputStream(file))){input.readFully(bytes);}
            JSONObject value=new JSONObject(new String(bytes,java.nio.charset.StandardCharsets.UTF_8));CloudCredentials.validate(value);
            if(!value.getString("group").equals(context.getSharedPreferences("college",0).getString("group","")))throw new IllegalArgumentException();
            disable(context);CloudCredentials.save(context,value,CloudCredentials.SCOPE);prefs(context).edit().putString("status","Secure setup stored. Cloud sync is off until you enable it.").apply();
        }catch(Exception ignored){prefs(context).edit().putString("status","Secure setup could not be imported. Keep the exact approved group saved and retry setup.").apply();}
        finally{if(!file.delete()){disable(context);prefs(context).edit().putString("status","Setup file cleanup failed. Cloud sync is disabled until setup is repaired.").apply();}}
    }
}
