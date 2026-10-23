package app.nav.companion;

import java.time.*;
import java.util.*;

/** Pure daily-summary policy shared by scheduling and receiver delivery. */
public final class TaskReminderPlan {
    public static final class Task {
        public final String id,title,date,due;
        public Task(String id,String title,String date,String due){this.id=id;this.title=title;this.date=date;this.due=due;}
    }
    public static final class Event {
        public final String key,title,body;public final long at,until;
        Event(String key,String title,String body,long at,long until){this.key=key;this.title=title;this.body=body;this.at=at;this.until=until;}
    }
    private TaskReminderPlan(){}
    public static List<Event> events(List<Task> tasks,String zone,String studyTime,long now,Set<String> seen){
        ZoneId id=ZoneId.of(zone);LocalTime time=LocalTime.parse(studyTime);LocalDate today=Instant.ofEpochMilli(now).atZone(id).toLocalDate();List<Event> result=new ArrayList<>();
        for(int offset=0;offset<3;offset++){
            LocalDate date=today.plusDays(offset);String day=date.toString();List<Task> due=new ArrayList<>(),planned=new ArrayList<>();
            for(Task task:tasks){if(day.equals(task.date))planned.add(task);if(!task.due.isEmpty()&&!LocalDate.parse(task.due).isAfter(date.plusDays(1)))due.add(task);}
            due.sort(Comparator.comparing(t->t.due));
            long end=date.plusDays(1).atStartOfDay(id).toInstant().toEpochMilli();
            if(!due.isEmpty()){
                String key=day+":deadlines";long at=date.atTime(8,0).atZone(id).toInstant().toEpochMilli();
                if(!seen.contains(key)&&now<end)result.add(new Event(key,"NAV · Deadlines need attention",due.size()==1?due.get(0).title+" · "+(due.get(0).due.compareTo(day)<0?"overdue":"due "+due.get(0).due):due.size()+" unfinished tasks are due soon or overdue. Open NAV to review.",at,end));
            }
            String key=day+":study";ZonedDateTime study=date.atTime(time).atZone(id);long start=Math.max(date.atStartOfDay(id).toInstant().toEpochMilli(),(planned.isEmpty()?study:study.minusMinutes(10)).toInstant().toEpochMilli()),until=Math.min(end,study.plusHours(1).toInstant().toEpochMilli());
            if(!seen.contains(key)&&now<until)result.add(new Event(key,planned.isEmpty()?"NAV · Plan your study session":"NAV · Your study plan is ready",planned.isEmpty()?"No tasks are planned for today. Open NAV to choose your next step.":planned.size()+" tasks today. Start with "+planned.get(0).title+".",start,until));
        }
        result.sort(Comparator.comparingLong(e->Math.max(now,e.at)));return result;
    }
}
