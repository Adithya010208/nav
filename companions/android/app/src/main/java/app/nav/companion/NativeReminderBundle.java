package app.nav.companion;
import java.util.*;
import java.time.LocalDate;
import org.json.*;

/** Bounded versioned transport; never accepts commands, URLs or account credentials. */
final class NativeReminderBundle {
    static long integer(JSONObject value,String key) throws Exception {
        Object raw=value.get(key);long n=value.getLong(key);
        if(!(raw instanceof Number)||value.getDouble(key)!=n||Math.abs(n)>9007199254740991L)throw new IllegalArgumentException();return n;
    }
    static List<TaskReminderPlan.Event> validate(JSONObject value) throws Exception {
        if(value.length()!=5||integer(value,"version")!=2||!(value.get("truncated") instanceof Boolean))throw new IllegalArgumentException();
        long generated=integer(value,"generatedAt"),expires=integer(value,"expiresAt");
        if(generated<=0||expires<=generated||expires>generated+72L*3600000)throw new IllegalArgumentException();
        JSONArray values=value.getJSONArray("events");if(values.length()>500)throw new IllegalArgumentException();Set<String> ids=new HashSet<>();List<TaskReminderPlan.Event> result=new ArrayList<>();
        for(int i=0;i<values.length();i++){
            JSONObject event=values.getJSONObject(i);String id=event.getString("id"),title=event.getString("title"),body=event.getString("body");long at=integer(event,"at"),until=integer(event,"until");
            if(event.length()!=5||!id.matches("\\d{4}-\\d{2}-\\d{2}:.*")||id.length()>240||!ids.add(id)||title.isEmpty()||title.length()>100||body.length()>500||at<generated-24L*3600000||until<=at||until>expires||until-at>72L*3600000)throw new IllegalArgumentException();
            LocalDate.parse(id.substring(0,10));result.add(new TaskReminderPlan.Event(id,title,body,at,until));
        }return result;
    }
    static List<TaskReminderPlan.Event> events(JSONObject value,long now,Set<String> seen) throws Exception {
        List<TaskReminderPlan.Event> result=validate(value);
        if(integer(value,"generatedAt")>now+60000||integer(value,"expiresAt")<=now)return Collections.emptyList();
        result.removeIf(e->now>=e.until||seen.contains(e.key));result.sort(Comparator.comparingLong(e->Math.max(now,e.at)));return result;
    }
}
