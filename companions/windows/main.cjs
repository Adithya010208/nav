const {app,BrowserWindow,Tray,Menu,Notification,globalShortcut,shell,nativeImage,dialog,powerMonitor,safeStorage,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {reminderEvents}=require('./reminders.cjs');
const {createPoller}=require('./poller.cjs');
const {notificationPolicy}=require('./notification-policy.cjs');
let notificationPermission=null;
const {APP_ID,CLSID,registerShortcut}=require('./registration.cjs');
const {parseSetup,readReminders}=require('./connection.cjs');
const {fileURLToPath}=require('node:url');
let connection=null;
const SITE='https://nav-personal-assistant.opalmug128.chatgpt.site';
const liveNotifications=new Set();let reminderStatus={state:'starting'};
let win,tray,timer,quitting=false,mini=false,prefs={reminders:true,seen:{}};
const smoke=process.argv.includes('--nav-smoke-test');
const userDataArg=process.argv.find(x=>x.startsWith('--nav-test-data='));
if(smoke&&userDataArg)app.setPath('userData',path.resolve(userDataArg.split('=').slice(1).join('=')));
if(!app.requestSingleInstanceLock())app.quit();
app.setAppUserModelId(APP_ID);
app.setToastActivatorCLSID(CLSID);
const localURL=url=>{try{return new URL(url).protocol==='file:'&&fileURLToPath(url)===path.join(__dirname,'desktop.html')}catch{return false}};
const ownURL=url=>{try{return new URL(url).origin===SITE}catch{return false}};
const navigationAllowed=url=>{try{const u=new URL(url);return localURL(url)}catch{return false}};
const prefsFile=()=>path.join(app.getPath('userData'),'nav-preferences.json');
function save(){try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(prefsFile(),JSON.stringify(prefs),{mode:0o600});}catch{}}
function show(){if(!win||win.isDestroyed())createWindow();win.show();win.focus();}
function icon(){return nativeImage.createFromPath(path.join(__dirname,'icon.png'));}
function createWindow(){win=new BrowserWindow({title:'NAV · Personal Assistant',width:800,height:840,minWidth:380,minHeight:580,show:!smoke,backgroundColor:'#f6f7f9',icon:icon(),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,nodeIntegrationInWorker:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,preload:path.join(__dirname,'preload.cjs')}});
 win.webContents.on('page-title-updated',(event,title)=>{event.preventDefault();win.setTitle('NAV Desktop · '+title);});
 win.on('close',e=>{if(!quitting&&!smoke){e.preventDefault();win.hide();}});
 win.webContents.on('will-navigate',(event,url)=>{poller.cancel();if(!navigationAllowed(url))event.preventDefault();});
 win.webContents.on('will-redirect',(event,url)=>{poller.cancel();if(!navigationAllowed(url))event.preventDefault();});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-attach-webview',e=>e.preventDefault());
 if(!smoke)win.loadFile(path.join(__dirname,'desktop.html'));
 return win;
}
function recordStatus(state,details={}){reminderStatus={state,...details,notificationPolicy:notificationPermission?.reason||null,at:new Date().toISOString()};try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(path.join(app.getPath('userData'),'nav-reminder-status.json'),JSON.stringify(reminderStatus));}catch{}buildMenu();}
async function notification(event,signal){
 notificationPermission=await notificationPolicy();
 if(!notificationPermission.enabled){recordStatus('notifications-disabled');return false;}
 if(signal?.aborted)return false;
 if(!Notification.isSupported()){recordStatus('notifications-unavailable');return Promise.resolve(false);}
 return new Promise(resolve=>{let settled=false;const n=new Notification({title:event.title,body:event.body,icon:icon(),silent:false});liveNotifications.add(n);
 const finish=ok=>{if(settled)return;settled=true;clearTimeout(deadline);if(!ok)liveNotifications.delete(n);recordStatus(ok?'notification-accepted':'notification-not-accepted');resolve(ok);};
 const deadline=setTimeout(()=>finish(false),10000);if(signal){if(signal.aborted){finish(false);return;}signal.addEventListener('abort',()=>{n.close();finish(false);},{once:true});}n.once('show',()=>finish(true));n.once('failed',()=>finish(false));n.once('close',()=>liveNotifications.delete(n));n.on('click',show);try{n.show();}catch{finish(false);}
 });
}
const poller=createPoller({
 enabled:()=>prefs.reminders&&!quitting&&win&&!win.isDestroyed(),
 load:async signal=>{if(!connection){recordStatus('connection-required');throw Error('Connection required');}try{const j=await readReminders(connection,signal);recordStatus('account-connected');return j;}catch(e){recordStatus(e.status===401?'connection-expired':'connection-delayed');throw e;}},
 deliver:async (j,signal)=>{const scope=j.scope;for(const event of reminderEvents(j.data)){if(signal.aborted||!prefs.reminders||quitting)return;const key=scope+':'+event.id;if(prefs.seen[key])continue;if(await notification(event,signal)&&!signal.aborted&&prefs.reminders&&!quitting){prefs.seen[key]=new Date().toISOString();save();}}const cutoff=Date.now()-30*86400000;for(const [key,time]of Object.entries(prefs.seen))if(Date.parse(time)<cutoff)delete prefs.seen[key];save();}
});
async function check(){const start=reminderStatus.at;const ok=await poller.run();if(!ok&&prefs.reminders&&!quitting&&reminderStatus.at===start)recordStatus('connection-delayed');return ok;}
function buildMenu(){const menu=[{label:'Open NAV',click:show},{label:'Reminder status: '+reminderStatus.state,enabled:false},{label:'Check reminders now',click:check},{label:'Mini assistant window',type:'checkbox',checked:mini,click:item=>{mini=item.checked;show();win.setSize(mini?440:800,mini?700:840);buildMenu();}},{label:'Background reminders',type:'checkbox',checked:prefs.reminders,click:item=>{prefs.reminders=item.checked;if(!prefs.reminders)poller.cancel();save();buildMenu();if(prefs.reminders)check();}},{label:'Start with Windows',type:'checkbox',checked:app.getLoginItemSettings().openAtLogin,click:item=>app.setLoginItemSettings({openAtLogin:item.checked})},{label:'Test notification',click:()=>notification({title:'NAV · Notifications work',body:'Your personal assistant can alert you while it stays in the tray.'})},{type:'separator'},{label:'Open dashboard in browser',click:()=>shell.openExternal(SITE)},{label:'Connect Windows',click:()=>{show();connect();}},{label:'Disconnect this computer',click:()=>{poller.cancel();connection=null;try{fs.unlinkSync(connectionFile());}catch{}recordStatus('connection-required');}},{label:'Quit NAV',click:()=>{quitting=true;app.quit();}}];tray?.setContextMenu(Menu.buildFromTemplate(menu));}
const connectionFile=()=>path.join(app.getPath('userData'),'nav-windows-connection.enc');
async function connect(){
 if(!safeStorage.isEncryptionAvailable())return {message:'Windows secure storage is unavailable. Connection was not saved.'};
 const selected=await dialog.showOpenDialog(win,{title:'Select private NAV Windows setup',properties:['openFile'],filters:[{name:'NAV setup JSON',extensions:['json']}]});if(selected.canceled||selected.filePaths.length!==1)return {message:'Connection unchanged.'};
 try{const file=selected.filePaths[0];if(fs.statSync(file).size>4096)throw Error();const value=parseSetup(fs.readFileSync(file,'utf8'));await readReminders(value,AbortSignal.timeout(12000));const encrypted=safeStorage.encryptString(JSON.stringify(value));fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(connectionFile()+'.tmp',encrypted,{mode:0o600});fs.renameSync(connectionFile()+'.tmp',connectionFile());poller.cancel();connection=value;await check();return {message:'Windows connected. Delete the downloaded setup file after closing this dialog. Your dashboard opens in your normal browser.'};}catch{return {message:'Could not connect. Select a fresh NAV Windows setup file from browser Settings.'};}
}
for(const [channel,action] of Object.entries({open:()=>shell.openExternal(SITE),connect,check:async()=>{await check();},test:async()=>{await notification({title:'NAV · Notifications work',body:'Your Windows companion can show native reminders.'});},status:()=>reminderStatus}))ipcMain.handle('nav:'+channel,(event)=>{if(event.sender!==win?.webContents||!localURL(event.senderFrame?.url||''))throw Error('Local companion only.');return action();});
app.whenReady().then(async()=>{
 if(!smoke&&app.isPackaged)registerShortcut(shell,fs,app.getPath('appData'),app.getPath('exe'));
 try{const input=JSON.parse(fs.readFileSync(prefsFile(),'utf8'));prefs={reminders:typeof input.reminders==='boolean'?input.reminders:true,seen:input.seen&&typeof input.seen==='object'?input.seen:{}};}catch{}
 try{if(safeStorage.isEncryptionAvailable())connection=parseSetup(safeStorage.decryptString(fs.readFileSync(connectionFile())));}catch{}
 createWindow();win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));win.webContents.session.setPermissionCheckHandler(()=>false);win.webContents.on('did-finish-load',check);const shortcut=globalShortcut.register('CommandOrControl+Space',()=>{if(win?.isVisible())win.hide();else show();});
 if(smoke){const options=win.webContents.getLastWebPreferences();const result={nativeWindow:!win.isDestroyed(),icon:!icon().isEmpty(),shortcut,notificationsSupported:Notification.isSupported(),nodeIntegration:options.nodeIntegration,contextIsolation:options.contextIsolation,sandbox:options.sandbox,webSecurity:options.webSecurity};fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(path.join(app.getPath('userData'),'startup-check.json'),JSON.stringify(result,null,2));quitting=true;app.quit();return;}
 if(icon().isEmpty()){dialog.showErrorBox('NAV','Application icon is missing. Please reinstall NAV.');quitting=true;app.quit();return;}
 powerMonitor.on('resume',check);powerMonitor.on('unlock-screen',check);
 tray=new Tray(icon());tray.setToolTip('NAV · Personal Assistant');tray.on('double-click',show);buildMenu();timer=setInterval(check,60000);check();
 if(!shortcut)notification({title:'NAV · Shortcut unavailable',body:'Ctrl+Space is already used by another app. You can still open NAV from its tray icon.'});
});
app.on('second-instance',show);app.on('activate',show);app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{quitting=true;poller.cancel();clearInterval(timer);globalShortcut.unregisterAll();tray?.destroy();});
module.exports={navigationAllowed,ownURL};
