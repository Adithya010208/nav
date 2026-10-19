const CACHE='nanba-offline-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/favicon.svg']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('nanba-offline-')&&k!==CACHE).map(k=>caches.delete(k))))));
// Never cache authenticated pages, workspace APIs or uploaded files.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window'}).then(windows=>windows[0]?windows[0].focus():clients.openWindow('/')));});
