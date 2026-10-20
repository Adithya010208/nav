package app.nav.companion;
public final class SyncPolicyTest {
 public static void main(String[] args){
  if(!SyncPolicy.retry(409,"conflict")||!SyncPolicy.retry(429,"")||!SyncPolicy.retry(503,""))throw new AssertionError("Transient failures must retry");
  for(int status:new int[]{301,302,400,401,403,404,409})if(SyncPolicy.retry(status,"group_changed"))throw new AssertionError("Permanent errors must pause");
  if(SyncPolicy.retry(409,"")||SyncPolicy.retry(409,"workspace_full"))throw new AssertionError("Unknown/non-conflict rejection must pause");
  System.out.println("Sync policy checks passed: conflict/quota/server retries; changed group, unknown rejection, auth failure and redirect pause.");
 }
}
