const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('navDesktop',Object.freeze({open:()=>ipcRenderer.invoke('nav:open'),connect:()=>ipcRenderer.invoke('nav:connect'),check:()=>ipcRenderer.invoke('nav:check'),test:()=>ipcRenderer.invoke('nav:test'),status:()=>ipcRenderer.invoke('nav:status')}));
