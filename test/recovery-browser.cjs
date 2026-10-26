const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [width,height] of [[360,800],[390,844],[412,915]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.URL||'http://127.0.0.1:18923/');await p.waitForFunction(()=>window.HN);
  const valid=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('huntnow.save'));s.hr=4;s.mats['wolf:hide:1']=9;return JSON.stringify(s)});
  const raw='{broken-user-save';await p.addInitScript(raw=>{if(!sessionStorage.getItem('qa-corrupted')){localStorage.setItem('huntnow.save',raw);sessionStorage.setItem('qa-corrupted','1');}},raw);await p.reload();
  await p.getByRole('heading',{name:'저장 기록 보호'}).waitFor();
  assert.equal(await p.evaluate(()=>localStorage.getItem('huntnow.save')),raw);
  await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await p.evaluate(()=>localStorage.getItem('huntnow.save')),raw);
  const download=p.waitForEvent('download');await p.locator('[data-act=export]').tap();const d=await download;const stream=await d.createReadStream();let content='';for await(const chunk of stream)content+=chunk;assert.equal(content,raw);
  p.once('dialog',d=>d.accept());await p.locator('#impFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('null')});
  assert.equal(await p.evaluate(()=>localStorage.getItem('huntnow.save')),raw);
  const boxes=await p.locator('#ui button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
  assert.ok(boxes.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=width+1&&r.y+r.h<=height&&r.h>=44));
  p.on('dialog',d=>d.accept());await p.locator('#impFile').setInputFiles({name:'good.json',mimeType:'application/json',buffer:Buffer.from(valid)});
  await p.waitForFunction(()=>!document.querySelector('.recovery-screen'));
  assert.equal(await p.evaluate(()=>HN.save.hr),4);assert.equal(await p.evaluate(()=>HN.save.mats['wolf:hide:1']),9);
  await p.reload();await p.waitForFunction(()=>window.HN);assert.equal(await p.evaluate(()=>HN.save.hr),4);assert.deepEqual(errors,[]);
  console.log('PASS',width,height,'original/export/invalid import/valid recovery/reload/buttons/page errors');await ctx.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
