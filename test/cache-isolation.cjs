const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const file=process.argv[2]||'sw.js',source=fs.readFileSync(file,'utf8');
 const current=source.match(/const (?:V|C|CACHE)\s*=\s*'([^']+)'/)[1];
 const prefix=current.startsWith('hub-')?'hub-v':current.startsWith('hunt-now-')?'hunt-now-v':'beautydeck-v';
 const foreign=['hub-v0','hunt-now-v0','beautydeck-v0','fogbound-v0','unrelated-cache'].filter(k=>!k.startsWith(prefix));
 const old=prefix+'old',keys=[current,old,...foreign];const entries=new Map(keys.map(k=>[k,`payload:${k}`]));
 const events={},calls=[],storage={save:'unchanged'};let pending,claimed=false;
 const context={self:{addEventListener:(type,fn)=>events[type]=fn,clients:{claim(){claimed=true;return Promise.resolve()}},skipWaiting(){}},caches:{keys:async()=>[...entries.keys()],delete:async key=>{calls.push(key);return entries.delete(key)}},localStorage:{getItem:k=>storage[k],setItem(){throw Error('save must not be touched')}},URL};
 vm.runInNewContext(source,context);events.activate({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(calls,[old],'delete only own stale version');assert(entries.has(current));
 for(const k of foreign)assert.equal(entries.get(k),`payload:${k}`,'preserve foreign data: '+k);
 assert(claimed);assert.equal(storage.save,'unchanged');
 // Repeated activation must be idempotent.
 calls.length=0;events.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(calls,[]);
 console.log('PASS cache isolation, foreign payload retention, current cache, cleanup, claim, idempotence; storage untouched');
})().catch(e=>{console.error(e.message);process.exitCode=1});
