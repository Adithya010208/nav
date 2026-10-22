package app.nav.companion;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/** Wall-clock schedule, recalculated for the phone's time zone each day. */
public final class StudySchedule {
    private StudySchedule() {}
    public static long nextAt(int hour, int minute, long now, String zone) {
        LocalTime time = LocalTime.of(hour, minute);
        ZoneId id = ZoneId.of(zone);
        LocalDate date = Instant.ofEpochMilli(now).atZone(id).toLocalDate();
        long candidate = date.atTime(time).atZone(id).toInstant().toEpochMilli();
        if (candidate <= now) candidate = date.plusDays(1).atTime(time).atZone(id).toInstant().toEpochMilli();
        return candidate;
    }
    /** Reopening must not replace today's delayed, still-undelivered alarm with tomorrow's. */
    public static long resumeAt(int hour,int minute,long now,String zone,long previous,String previousZone,String lastDay) {
        LocalTime.of(hour,minute);
        ZoneId id=ZoneId.of(zone);
        LocalDate today=Instant.ofEpochMilli(now).atZone(id).toLocalDate();
        if(zone.equals(previousZone)&&previous>0&&!today.toString().equals(lastDay)&&Instant.ofEpochMilli(previous).atZone(id).toLocalDate().equals(today))return previous;
        return nextAt(hour,minute,now,zone);
    }
}
