const path=require('node:path');
const APP_ID='com.nav.personalassistant',CLSID='{B54F2CE2-A5B5-4B1F-B162-D5AF0CF08898}';
function registerShortcut(shell,fs,appData,exe){
 const folder=path.join(appData,'Microsoft','Windows','Start Menu','Programs'),file=path.join(folder,'NAV.lnk');
 try{
  const exists=fs.existsSync(file);
  if(exists&&shell.readShortcutLink(file).appUserModelId!==APP_ID)return false;
  fs.mkdirSync(folder,{recursive:true});
  return shell.writeShortcutLink(file,exists?'update':'create',{target:exe,cwd:path.dirname(exe),args:'',description:'NAV personal study assistant',icon:exe,iconIndex:0,appUserModelId:APP_ID,toastActivatorClsid:CLSID});
 }catch{return false;}
}
module.exports={APP_ID,CLSID,registerShortcut};
