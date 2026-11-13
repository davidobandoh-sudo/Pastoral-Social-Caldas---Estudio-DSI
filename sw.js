/* Cáritas Caldas · service worker
   La página se pide a la red al abrir; si la red falla o tarda, se usa la copia guardada.
   Así la app se actualiza sola y sigue funcionando sin internet. */
const C="caritas-caldas";
const A=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png",
"fonts/dm.woff2","fonts/sans400.woff2","fonts/sans600.woff2","fonts/sans700.woff2",
"fonts/serif400-i.woff2","fonts/serif400.woff2","fonts/serif500-i.woff2","fonts/serif500.woff2","fonts/serif600.woff2"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys()
    .then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));
});

function guardada(){return caches.open(C).then(c=>c.match("index.html").then(r=>r||c.match("./")))}

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  let u;try{u=new URL(req.url)}catch(err){return}
  if(u.origin!==location.origin)return;

  // La página principal: red primero, copia guardada como respaldo.
  if(req.mode==="navigate"||u.pathname.endsWith("/")||u.pathname.endsWith("/index.html")){
    e.respondWith(
      fetch(req).then(r=>{
        if(r&&r.ok){const copia=r.clone();caches.open(C).then(c=>c.put("index.html",copia)).catch(()=>{})}
        return r;
      }).catch(()=>guardada().then(r=>r||Response.error()))
    );
    return;
  }
  // Fuentes e iconos: copia guardada, refrescada por detrás.
  e.respondWith(caches.open(C).then(c=>c.match(req,{ignoreSearch:true}).then(hit=>{
    if(hit){fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone())}).catch(()=>{});return hit}
    return fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r}).catch(()=>guardada());
  })));
});
