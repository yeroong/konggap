// 콩값 서비스워커
// · 앱 파일: 네트워크 우선(오프라인이면 저장본)
// · CDN 도구(지도·QR·서버 연결): 저장본 우선
// · 지도 그림·서버 요청: 건드리지 않음
// · "공유 → 콩값"(설치한 앱 · 안드로이드)으로 온 기프티콘 사진: IndexedDB inbox 에 넣고 앱을 엶
const CACHE='konggap-v48';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});

// 다 쓰면 바로 닫음(새 판이 저장소를 바꿀 때 막지 않게)
function inboxPut(rec){return new Promise((res,rej)=>{const r=indexedDB.open('konggap-gift'); // 판 번호 없이: 앱이 올린 판(2) 그대로 엶
  r.onupgradeneeded=()=>{const d=r.result;for(const s of ['gifts','inbox','parkphotos'])if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});};
  r.onsuccess=()=>{const t=r.result.transaction('inbox','readwrite');t.objectStore('inbox').put(rec);t.oncomplete=()=>{r.result.close();res();};t.onerror=()=>{r.result.close();rej(t.error);};};r.onerror=()=>rej(r.error);});}

self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method==='POST'&&u.origin===location.origin&&u.searchParams.has('share-target')){
    e.respondWith((async()=>{
      try{const fd=await e.request.formData();const files=fd.getAll('image').filter(f=>f&&f.size);
        for(const f of files)await inboxPut({id:'in'+Date.now()+Math.random().toString(36).slice(2,6),blob:f,ts:Date.now()});}catch(err){}
      return Response.redirect('./?shared=1#gift',303);
    })());
    return;
  }
  if(e.request.method!=='GET')return;
  if(u.origin===location.origin){
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
  }else if(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(u.hostname)){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return res;})));
  }
});
