package app.nav.companion;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public final class StudyAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent) {
        String action=intent.getAction();
        if(StudyReminders.ACTION.equals(action)) {
            SharedPreferences settings=StudyReminders.prefs(context);
            String today=java.time.LocalDate.now().toString();
            settings.edit().putLong("lastReceivedAt",System.currentTimeMillis()).apply();
            if(settings.getBoolean("enabled",false)&&!today.equals(settings.getString("lastDay",""))&&StudyReminders.show(context,false))settings.edit().putString("lastDay",today).putLong("lastPostedAt",System.currentTimeMillis()).apply();
            StudyReminders.schedule(context);
        }else if(android.app.AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(action)){
            if(StudyReminders.preciseAllowed(context))StudyReminders.ensureScheduled(context);
        }else if(Intent.ACTION_BOOT_COMPLETED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_TIME_CHANGED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))StudyReminders.schedule(context);
    }
}
