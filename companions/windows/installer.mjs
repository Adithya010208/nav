import {build,Platform,Arch} from 'electron-builder';
import path from 'node:path';
import {existsSync} from 'node:fs';
const packaged=path.resolve(process.argv[2]||'../../../nav-windows-0.5.4/NAV-win32-x64');
const output=path.resolve(process.argv[3]||'../../../nav-installers/windows-0.5.4');
if(!existsSync(path.join(packaged,'NAV.exe'))||!existsSync(path.join(packaged,'resources','app.asar')))throw Error('Pass a verified packaged NAV folder.');
if(output===packaged||packaged.startsWith(output+path.sep))throw Error('Installer output must not contain the active application folder.');
await build({targets:Platform.WINDOWS.createTarget(['nsis'],Arch.x64),prepackaged:packaged,config:{appId:'com.nav.personalassistant',productName:'NAV',directories:{output},artifactName:'NAV-Setup-${version}-${arch}.${ext}',publish:null,win:{icon:'icon.ico',signAndEditExecutable:false},nsis:{oneClick:false,perMachine:false,allowElevation:false,allowToChangeInstallationDirectory:true,deleteAppDataOnUninstall:false,runAfterFinish:false,createDesktopShortcut:false,createStartMenuShortcut:true,shortcutName:'NAV'}}});
console.log('Private per-user NAV installer built. Existing account data is preserved; installer has not been run.');
