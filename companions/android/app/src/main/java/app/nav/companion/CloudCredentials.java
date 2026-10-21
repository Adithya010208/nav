package app.nav.companion;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Credentials stay in private storage encrypted with a non-exportable Android key. */
final class CloudCredentials {
    static final String SCOPE="nav-cloud-device";
    static void validate(JSONObject value) throws Exception {
        if(!value.getString("deviceToken").matches("navd_[a-f0-9]{64}")||(value.has("serviceToken")||!CloudSync.RELAY.equals(value.getString("relayUrl")))||value.getString("group").trim().isEmpty()||value.getString("group").length()>150)throw new IllegalArgumentException();
    }
    private static SecretKey key(String scope) throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(scope)){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(scope,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());generator.generateKey();
        }
        return (SecretKey)store.getKey(scope,null);
    }
    static void save(Context context,JSONObject value,String scope) throws Exception {
        validate(value);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(scope));cipher.updateAAD(scope.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        byte[] encrypted=cipher.doFinal(value.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        if(!context.getSharedPreferences(scope,0).edit().putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).putString("ciphertext",Base64.encodeToString(encrypted,Base64.NO_WRAP)).commit())throw new java.io.IOException();
    }
    static JSONObject read(Context context,String scope) throws Exception {
        android.content.SharedPreferences prefs=context.getSharedPreferences(scope,0);String encrypted=prefs.getString("ciphertext","");if(encrypted.isEmpty())return null;
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(scope),new GCMParameterSpec(128,Base64.decode(prefs.getString("iv",""),Base64.NO_WRAP)));cipher.updateAAD(scope.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        JSONObject value=new JSONObject(new String(cipher.doFinal(Base64.decode(encrypted,Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));validate(value);return value;
    }
    static void clear(Context context,String scope){
        context.getSharedPreferences(scope,0).edit().clear().commit();
        try{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);store.deleteEntry(scope);}catch(Exception ignored){}
    }
}
