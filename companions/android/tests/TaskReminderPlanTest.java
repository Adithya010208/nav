package app.nav.companion;
import java.time.Instant;
import java.util.*;
public final class TaskReminderPlanTest {
    static long at(String instant){return Instant.parse(instant).toEpochMilli();}
    static void check(boolean value){if(!value)throw new AssertionError();}
    public static void main(String[] args){
        List<TaskReminderPlan.Task> tasks=Arrays.asList(new TaskReminderPlan.Task("a","Maths exam","2026-10-23","2026-10-24"));
        var events=TaskReminderPlan.events(tasks,"Asia/Kolkata","18:30",at("2026-10-23T02:00:00Z"),Set.of());
        check(events.size()==6);check(events.get(0).key.equals("2026-10-23:deadlines"));check(events.get(0).at==at("2026-10-23T02:30:00Z"));
        check(events.get(1).key.equals("2026-10-23:study"));check(events.get(1).at==at("2026-10-23T12:50:00Z"));
        check(TaskReminderPlan.events(tasks,"Asia/Kolkata","18:30",at("2026-10-23T14:01:00Z"),Set.of()).stream().noneMatch(e->e.key.equals("2026-10-23:study")));
        check(TaskReminderPlan.events(tasks,"Asia/Kolkata","18:30",at("2026-10-23T12:51:00Z"),Set.of("2026-10-23:study","2026-10-23:deadlines")).stream().noneMatch(e->e.key.startsWith("2026-10-23:")));
        var empty=TaskReminderPlan.events(List.of(),"UTC","18:30",at("2026-10-23T00:00:00Z"),Set.of());check(empty.size()==3);check(empty.get(0).at==at("2026-10-23T18:30:00Z")&&empty.get(0).title.contains("Plan your study"));
        var midnight=TaskReminderPlan.events(List.of(new TaskReminderPlan.Task("b","Early study","2026-10-23","")),"UTC","00:05",at("2026-10-23T00:00:00Z"),Set.of());check(midnight.get(0).at==at("2026-10-23T00:00:00Z"));
        var dst=TaskReminderPlan.events(List.of(new TaskReminderPlan.Task("c","DST","2026-03-08","")),"America/New_York","02:30",at("2026-03-08T00:00:00Z"),Set.of());check(dst.get(0).at==at("2026-03-08T07:20:00Z"));
        var overdue=TaskReminderPlan.events(List.of(new TaskReminderPlan.Task("d","Overdue","2026-10-20","2026-10-20")),"UTC","18:30",at("2026-10-23T09:00:00Z"),Set.of());check(overdue.get(0).body.contains("overdue"));check(overdue.get(0).at<at("2026-10-23T09:00:00Z"));
        boolean invalid=false;try{TaskReminderPlan.events(tasks,"Invalid/Zone","18:30",System.currentTimeMillis(),Set.of());}catch(java.time.DateTimeException e){invalid=true;}check(invalid);
        System.out.println("TaskReminderPlan: 13 deadline/study windows, empty-plan nudge, deduplication, midnight, DST, overdue and invalid-zone checks passed");
    }
}
