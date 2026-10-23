package app.nav.companion;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;
import org.json.JSONObject;

/** Separate Android reminder capability and encrypted task cache; never accepts upload/Windows/service tokens. */
final class ReminderCredentials {
    static final String SCOPE="nav-phone-reminder-credential",CACHE="nav-phone-reminder-cache";
    static final String RELAY="https://hcmavpdgauulxjdiaiqg.supabase.co/functions/v1/nav-phone-reminders";
    static void validate(JSONObject value) throws Exception {
        java.util.Set<String> allowed=new java.util.HashSet<>(java.util.Arrays.asList("format","version","deviceId","deviceToken","expiresAt","relayUrl"));
        for(java.util.Iterator<String> it=value.keys();it.hasNext();)if(!allowed.contains(it.next()))throw new IllegalArgumentException();
        long expiry=java.time.Instant.parse(value.getString("expiresAt")).toEpochMilli(),now=System.currentTimeMillis();
        if(!"nav-phone-reminder-setup".equals(value.getString("format"))||value.getInt("version")!=1||!value.getString("deviceId").matches("[a-f0-9-]{36}")||!value.getString("deviceToken").matches("navp_[a-f0-9]{64}")||!RELAY.equals(value.getString("relayUrl"))||expiry<=now||expiry>now+31L*86400000)throw new IllegalArgumentException();
    }
    private static SecretKey key(String scope) throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(scope)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(scope,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());generator.generateKey();}
        return (SecretKey)store.getKey(scope,null);
    }
    static void save(Context context,JSONObject value,String scope) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(scope));cipher.updateAAD(scope.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        byte[] encrypted=cipher.doFinal(value.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        if(!context.getSharedPreferences(scope,0).edit().putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).putString("ciphertext",Base64.encodeToString(encrypted,Base64.NO_WRAP)).commit())throw new java.io.IOException();
    }
    static JSONObject read(Context context,String scope) throws Exception {
        android.content.SharedPreferences prefs=context.getSharedPreferences(scope,0);String encrypted=prefs.getString("ciphertext","");if(encrypted.isEmpty())return null;
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(scope),new GCMParameterSpec(128,Base64.decode(prefs.getString("iv",""),Base64.NO_WRAP)));cipher.updateAAD(scope.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(encrypted,Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));
    }
    static JSONObject credential(Context context) throws Exception {JSONObject value=read(context,SCOPE);if(value!=null)validate(value);return value;}
    static void clear(Context context,String scope){context.getSharedPreferences(scope,0).edit().clear().commit();try{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);store.deleteEntry(scope);}catch(Exception ignored){}}
}

