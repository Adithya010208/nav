package app.nav.companion;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

final class StudyReminders {
    static final String ACTION = "app.nav.companion.DAILY_STUDY";
    static final String CHANNEL = "nav-study-reminders";
    static final int REQUEST = 7311;
    private StudyReminders() {}
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("study-reminders",Context.MODE_PRIVATE); }
    static void channel(Context context) {
        context.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(CHANNEL,"NAV study reminders",NotificationManager.IMPORTANCE_DEFAULT));
    }
    static boolean canNotify(Context context) {
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return false;
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        NotificationChannel channel=manager.getNotificationChannel(CHANNEL);
        return manager.areNotificationsEnabled() && (channel==null || channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);
    }
    static PendingIntent pending(Context context,int flags) {
        return PendingIntent.getBroadcast(context,REQUEST,new Intent(context,StudyAlarmReceiver.class).setAction(ACTION),flags|PendingIntent.FLAG_IMMUTABLE);
    }
    static void cancel(Context context) {
        PendingIntent existing=pending(context,PendingIntent.FLAG_NO_CREATE);
        if(existing!=null){context.getSystemService(AlarmManager.class).cancel(existing);existing.cancel();}
        prefs(context).edit().putLong("nextAt",0).apply();
    }
    static boolean schedule(Context context) {
        SharedPreferences settings=prefs(context);
        if(!settings.getBoolean("enabled",false)||!canNotify(context)){cancel(context);return false;}
        try{
            long next=StudySchedule.nextAt(settings.getInt("hour",18),settings.getInt("minute",30),System.currentTimeMillis(),java.util.TimeZone.getDefault().getID());
            context.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,pending(context,PendingIntent.FLAG_UPDATE_CURRENT));
            settings.edit().putLong("nextAt",next).apply();return true;
        }catch(RuntimeException unavailable){cancel(context);return false;}
    }
    static boolean enable(Context context,int hour,int minute) {
        channel(context);if(!canNotify(context))return false;
        StudySchedule.nextAt(hour,minute,System.currentTimeMillis(),java.util.TimeZone.getDefault().getID());
        prefs(context).edit().putInt("hour",hour).putInt("minute",minute).putBoolean("enabled",true).apply();
        return schedule(context);
    }
    static void disable(Context context){prefs(context).edit().putBoolean("enabled",false).apply();cancel(context);context.getSystemService(NotificationManager.class).cancel(7311);}
    static boolean show(Context context,boolean test) {
        channel(context);if(!canNotify(context))return false;
        PendingIntent open=PendingIntent.getActivity(context,7312,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notice=new Notification.Builder(context,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(test?"NAV · Reminder check":"NAV · Time for your study session")
            .setContentText(test?"Check that your phone displays this notification and allows sound.":"Open NAV to review your plan and take the next small step.")
            .setContentIntent(open).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();
        try{context.getSystemService(NotificationManager.class).notify(test?7312:7311,notice);return true;}catch(SecurityException denied){return false;}
    }
}
