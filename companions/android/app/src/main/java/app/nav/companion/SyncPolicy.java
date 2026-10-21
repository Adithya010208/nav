package app.nav.companion;
final class SyncPolicy {
    static boolean completeAcknowledgement(Object added,Object duplicates,int expected){
        if(!(added instanceof Number)||!(duplicates instanceof Number)||expected<1||expected>100)return false;
        double a=((Number)added).doubleValue(),d=((Number)duplicates).doubleValue();
        return Double.isFinite(a)&&Double.isFinite(d)&&a>=0&&d>=0&&a<=expected&&d<=expected&&a==Math.floor(a)&&d==Math.floor(d)&&a+d==expected;
    }
    static boolean retry(int status,String code){return status==429||status>=500||(status==409&&"conflict".equals(code));}
}
