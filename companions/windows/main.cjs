const {app,BrowserWindow,Tray,Menu,Notification,globalShortcut,shell,session,nativeImage,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {reminderEvents}=require('./reminders.cjs');
const SITE='https://nav-personal-assistant.opalmug128.chatgpt.site';
const AUTH_HOSTS=new Set([new URL(SITE).hostname,'auth.openai.com','auth0.openai.com','chatgpt.com','auth.openai.com']);
let win,tray,timer,quitting=false,mini=false,prefs={reminders:true,seen:{}};
const smoke=process.argv.includes('--nav-smoke-test');
const userDataArg=process.argv.find(x=>x.startsWith('--nav-test-data='));
if(smoke&&userDataArg)app.setPath('userData',path.resolve(userDataArg.split('=').slice(1).join('=')));
if(!app.requestSingleInstanceLock())app.quit();
app.setAppUserModelId('com.nav.personalassistant');
const ownURL=url=>{try{return new URL(url).origin===SITE}catch{return false}};
const navigationAllowed=url=>{try{const u=new URL(url);return u.protocol==='https:'&&AUTH_HOSTS.has(u.hostname)}catch{return false}};
const prefsFile=()=>path.join(app.getPath('userData'),'nav-preferences.json');
function save(){try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(prefsFile(),JSON.stringify(prefs),{mode:0o600});}catch{}}
function show(){if(!win||win.isDestroyed())createWindow();win.show();win.focus();}
function icon(){return nativeImage.createFromPath(path.join(__dirname,'icon.png'));}
function createWindow(){win=new BrowserWindow({title:'NAV · Personal Assistant',width:1180,height:840,minWidth:380,minHeight:580,show:!smoke,backgroundColor:'#f6f7f9',icon:icon(),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,nodeIntegrationInWorker:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,partition:'persist:nav-account'}});
 win.on('close',e=>{if(!quitting&&!smoke){e.preventDefault();win.hide();}});
 win.webContents.on('will-navigate',(event,url)=>{if(!navigationAllowed(url))event.preventDefault();});
 win.webContents.on('will-redirect',(event,url)=>{if(!navigationAllowed(url))event.preventDefault();});
 win.webContents.setWindowOpenHandler(({url})=>{if(ownURL(url))win.loadURL(url);else if(url==='https://openai.com/policies/privacy-policy'||url==='https://openai.com/policies/terms-of-use')shell.openExternal(url);return {action:'deny'};});
 win.webContents.on('will-attach-webview',e=>e.preventDefault());
 if(!smoke)win.loadURL(SITE).catch(()=>{if(!win.isDestroyed())win.loadFile(path.join(__dirname,'offline.html'));});
 return win;
}
function notification(event){if(!Notification.isSupported())return false;const n=new Notification({title:event.title,body:event.body,icon:icon(),silent:false});n.on('click',show);n.show();return true;}
async function check(){if(!prefs.reminders||!win||win.isDestroyed())return;try{const r=await win.webContents.session.fetch(SITE+'/api/workspace',{credentials:'include',redirect:'error',headers:{Accept:'application/json'}});if(!r.ok)return;const raw=await r.text();if(raw.length>1800000)return;const j=JSON.parse(raw);if(!j.user?.email||!j.data)return;const scope=crypto.createHash('sha256').update(j.user.email).digest('hex').slice(0,16);const events=reminderEvents(j.data);for(const event of events){const key=scope+':'+event.id;if(prefs.seen[key])continue;if(notification(event)){prefs.seen[key]=new Date().toISOString();save();}}const cutoff=Date.now()-30*86400000;for(const [key,time]of Object.entries(prefs.seen))if(Date.parse(time)<cutoff)delete prefs.seen[key];save();}catch{/* Offline or signed out: do not invent a reminder or copy credentials. */}}
function buildMenu(){const menu=[{label:'Open NAV',click:show},{label:'Mini assistant window',type:'checkbox',checked:mini,click:item=>{mini=item.checked;show();win.setSize(mini?440:1180,mini?700:840);buildMenu();}},{label:'Background reminders',type:'checkbox',checked:prefs.reminders,click:item=>{prefs.reminders=item.checked;save();buildMenu();if(prefs.reminders)check();}},{label:'Start with Windows',type:'checkbox',checked:app.getLoginItemSettings().openAtLogin,click:item=>app.setLoginItemSettings({openAtLogin:item.checked})},{label:'Test notification',click:()=>notification({title:'NAV · Notifications work',body:'Your personal assistant can alert you while it stays in the tray.'})},{type:'separator'},{label:'Sign out',click:()=>{show();win.loadURL(SITE+'/signout-with-chatgpt?return_to=%2F');}},{label:'Quit NAV',click:()=>{quitting=true;app.quit();}}];tray?.setContextMenu(Menu.buildFromTemplate(menu));}
app.whenReady().then(async()=>{
 try{const input=JSON.parse(fs.readFileSync(prefsFile(),'utf8'));prefs={reminders:typeof input.reminders==='boolean'?input.reminders:true,seen:input.seen&&typeof input.seen==='object'?input.seen:{}};}catch{}
 const account=session.fromPartition('persist:nav-account');
 account.setPermissionRequestHandler((contents,permission,callback)=>callback(permission==='notifications'&&ownURL(contents.getURL())&&prefs.reminders));
 account.setPermissionCheckHandler((contents,permission,origin)=>permission==='notifications'&&ownURL(origin||contents?.getURL()||'')&&prefs.reminders);
 createWindow();const shortcut=globalShortcut.register('CommandOrControl+Space',()=>{if(win?.isVisible())win.hide();else show();});
 if(smoke){const options=win.webContents.getLastWebPreferences();const result={nativeWindow:!win.isDestroyed(),icon:!icon().isEmpty(),shortcut,notificationsSupported:Notification.isSupported(),nodeIntegration:options.nodeIntegration,contextIsolation:options.contextIsolation,sandbox:options.sandbox,webSecurity:options.webSecurity};fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(path.join(app.getPath('userData'),'startup-check.json'),JSON.stringify(result,null,2));quitting=true;app.quit();return;}
 if(icon().isEmpty()){dialog.showErrorBox('NAV','Application icon is missing. Please reinstall NAV.');quitting=true;app.quit();return;}
 tray=new Tray(icon());tray.setToolTip('NAV · Personal Assistant');tray.on('double-click',show);buildMenu();timer=setInterval(check,60000);check();
 if(!shortcut)notification({title:'NAV · Shortcut unavailable',body:'Ctrl+Space is already used by another app. You can still open NAV from its tray icon.'});
});
app.on('second-instance',show);app.on('activate',show);app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{quitting=true;clearInterval(timer);globalShortcut.unregisterAll();tray?.destroy();});
module.exports={navigationAllowed,ownURL};
