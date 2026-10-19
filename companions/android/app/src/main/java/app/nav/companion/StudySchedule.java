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
}
