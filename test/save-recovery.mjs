import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as data from '../data.js';import * as lore from '../lore.js';
const source=fs.readFileSync(new URL('../main.js',import.meta.url),'utf8');
function boot(raw,blocked=false){
 let stored=raw,writes=0;
 const c={...data,...lore,structuredClone,localStorage:{getItem(){if(blocked)throw Error('denied');return stored;},setItem(k,v){writes++;stored=v;}}};vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf("const SAVE_KEY"),source.indexOf('const newId')),c);
 return {run:s=>vm.runInContext(s,c),stored:()=>stored,writes:()=>writes};
}
for(const raw of ['{broken','null','[]','42','{"v":4,"weapons":[],"mats":{}}']){
 const b=boot(raw);assert.equal(b.stored(),raw,'invalid original must survive boot');b.run('persist()');assert.equal(b.stored(),raw);assert.equal(b.writes(),0);
}
const blocked=boot(null,true);assert.equal(blocked.writes(),0,'read failure must not overwrite unknown save');
const normal=boot(null),saved=normal.stored();assert.ok(saved);const reload=boot(saved);assert.equal(reload.run('save.v'),4);
const legacy={hr:3,hrXp:50,mats:{'drake:hide:1':4},weapons:[{id:'w1',type:'sns',elem:'none',lvl:3}],equip:{weapon:'w1'},comps:[],party:[]};
const migrated=boot(JSON.stringify(legacy));assert.equal(migrated.run('save.hr'),3);assert.equal(migrated.run('save.weapons.find(w=>w.id==="w1").lvl'),3);assert.equal(migrated.run('save.mats["drake:hide:1"]'),4);
console.log('PASS malformed originals, denied reads, new save, v4 reload and legacy gear/material migration');
