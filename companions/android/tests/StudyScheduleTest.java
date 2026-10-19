package app.nav.companion;
import java.time.Instant;
public final class StudyScheduleTest {
    private static void check(String now,int hour,int minute,String zone,String expected){long actual=StudySchedule.nextAt(hour,minute,Instant.parse(now).toEpochMilli(),zone);if(actual!=Instant.parse(expected).toEpochMilli())throw new AssertionError("Unexpected next study time: "+Instant.ofEpochMilli(actual));}
    public static void main(String[] args){
        check("2026-10-19T12:00:00Z",18,30,"Asia/Kolkata","2026-10-19T13:00:00Z");
        check("2026-10-19T13:00:00Z",18,30,"Asia/Kolkata","2026-10-20T13:00:00Z");
        check("2026-12-31T23:59:00Z",0,0,"UTC","2027-01-01T00:00:00Z");
        check("2026-03-08T06:00:00Z",2,30,"America/New_York","2026-03-08T07:30:00Z");
        check("2026-03-08T07:45:00Z",2,30,"America/New_York","2026-03-09T06:30:00Z");
        check("2026-11-01T04:00:00Z",1,30,"America/New_York","2026-11-01T05:30:00Z");
        check("2026-11-01T06:00:00Z",1,30,"America/New_York","2026-11-02T06:30:00Z");
        boolean invalid=false;try{StudySchedule.nextAt(24,0,System.currentTimeMillis(),"UTC");}catch(java.time.DateTimeException expected){invalid=true;}if(!invalid)throw new AssertionError("Invalid time must fail");
        System.out.println("StudySchedule: 8 wall-clock, rollover, DST and invalid-time checks passed");
    }
}
