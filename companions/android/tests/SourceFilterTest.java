package app.nav.companion;
public final class SourceFilterTest {
    static final long NOW=1800000000000L;
    static void check(boolean actual,boolean expected) { if(actual!=expected) throw new AssertionError("Unexpected filter result"); }
    static boolean accepts(boolean enabled,String approved,String pkg,boolean group,String title,String body,long time) { return SourceFilter.accepts(enabled,approved,pkg,group,title,body,time,NOW); }
    public static void main(String[] args) {
        check(accepts(true,"College","com.whatsapp",true,"College","Exam tomorrow",NOW),true);
        check(accepts(false,"College","com.whatsapp",true,"College","Exam",NOW),false);
        check(accepts(true,"College","com.whatsapp.w4b",true,"College","Exam",NOW),false);
        check(accepts(true,"College","com.whatsapp",false,"College","Exam",NOW),false);
        check(accepts(true,"College","com.whatsapp",true,"College friends","Exam",NOW),false);
        check(accepts(true,"College","com.whatsapp",true,"college","Exam",NOW),false);
        check(accepts(true,"College","com.whatsapp",true,"College","Exam",NOW-86400001),false);
        check(accepts(true,"College","com.whatsapp",true,"College","Exam",NOW+60001),false);
        check(accepts(true,"College","com.whatsapp",true,"College"," ",NOW),false);
        check(accepts(true,"College","com.whatsapp",true,"College","x".repeat(12001),NOW),false);
        check(accepts(true,null,"com.whatsapp",true,null,"Exam",NOW),false);
        System.out.println("SourceFilter: 11 isolation and retention checks passed");
    }
}
