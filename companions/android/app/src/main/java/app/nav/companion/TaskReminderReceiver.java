package app.nav.companion;
import android.content.*;
public final class TaskReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        if(TaskReminders.ACTION.equals(intent.getAction())){TaskReminders.prefs(context).edit().putLong("lastReceivedAt",System.currentTimeMillis()).apply();TaskReminders.deliver(context);}
        else if(TaskReminders.enabled(context)){TaskReminders.schedule(context);TaskReminders.enqueue(context);}
    }
}
