package app.nav.companion;
final class SyncPolicy {
    static boolean retry(int status,String code){return status==429||status>=500||(status==409&&"conflict".equals(code));}
}
