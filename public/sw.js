// Financial data and pages are never cached by this worker.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window'}).then(tabs=>{if(tabs[0]){tabs[0].navigate('/#agenda');return tabs[0].focus()}return self.clients.openWindow('/#agenda')}))});
