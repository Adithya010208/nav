package app.nav.companion;
public final class SyncPolicyTest {
 public static void main(String[] args){
  if(!SyncPolicy.retry(409,"conflict")||!SyncPolicy.retry(429,"")||!SyncPolicy.retry(503,""))throw new AssertionError("Transient failures must retry");
  for(int status:new int[]{301,302,400,401,403,404,409})if(SyncPolicy.retry(status,"group_changed"))throw new AssertionError("Permanent errors must pause");
  if(SyncPolicy.retry(409,"")||SyncPolicy.retry(409,"workspace_full"))throw new AssertionError("Unknown/non-conflict rejection must pause");
  if(!SyncPolicy.completeAcknowledgement(1,2,3)||!SyncPolicy.completeAcknowledgement(0,100,100))throw new AssertionError("Complete integer responses must acknowledge");
  for(Object[] counts:new Object[][]{{1.5,1.5},{"1",2},{-1,4},{Double.NaN,3},{Double.POSITIVE_INFINITY,0},{1,1},{4,-1},{null,3}})if(SyncPolicy.completeAcknowledgement(counts[0],counts[1],3))throw new AssertionError("Malformed or partial responses must retain notices");
  System.out.println("Sync policy checks passed: conflict/quota/server retries; changed group, unknown rejection, auth failure and redirect pause.");
 }
}
