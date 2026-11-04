const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),uri=pathToFileURL(path.join(root,'index.html')).href;
const out=process.env.QA_OUTPUT||path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const errors=[],requests=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const page=await context.newPage();let total=0;
 for(let n=1;n<=9;n++){
  await page.goto(uri+'#ch'+String(n).padStart(2,'0'));await page.locator('#chapter-article').waitFor();
  const images=page.locator('.course-figure img');const count=await images.count();assert.ok(count>=6);total+=count;
  assert.deepEqual(await images.evaluateAll(async els=>Promise.all(els.map(async img=>{img.loading='eager';try{await img.decode();return img.naturalWidth>60&&img.naturalHeight>50}catch{return false}}))),Array(count).fill(true));
  assert.equal(await page.locator('.katex-error').count(),0);
 }
 assert.equal(total,76);
 for(const [n,id,file] of [[4,'F4-03','illustrated-inverting.png'],[7,'F7-01','illustrated-rlc.png'],[9,'F9-10','illustrated-sallen-key.png']]){
  await page.goto(uri+'#ch'+String(n).padStart(2,'0'));await page.locator('#fig-'+id).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,file)});
 }
 await page.goto(uri+'#ch04');await page.locator('#fig-F4-03 [data-open-figure]').click();assert.ok(await page.locator('#figure-viewer').isVisible());
 await page.waitForFunction(()=>parseFloat(document.getElementById('figure-image').style.width)>10);
 const before=await page.locator('#figure-image').evaluate(e=>e.getBoundingClientRect().width);
 await page.locator('[data-figure-zoom=".25"]').click();await page.locator('[data-figure-zoom=".25"]').click();
 const after=await page.locator('#figure-image').evaluate(e=>e.getBoundingClientRect().width);assert.ok(Math.abs(after/before-1.5)<.02);
 await page.screenshot({path:path.join(out,'figure-viewer-desktop.png')});await page.keyboard.press('Escape');assert.ok(!await page.locator('#figure-viewer').isVisible());
 await page.goto(uri+'#practice');await page.locator('#exercise-list .exercise').last().waitFor();assert.equal(await page.locator('.question-figure').count(),50);
 const q=page.locator('.question-figure img');assert.deepEqual(await q.evaluateAll(async els=>Promise.all(els.map(async img=>{img.loading='eager';try{await img.decode();return img.naturalWidth>60&&img.naturalHeight>50}catch{return false}}))),Array(50).fill(true));
 await page.locator('#ex-L4-P56>summary').click();await page.locator('#ex-L4-P56 .question-figure').scrollIntoViewIfNeeded();assert.equal(await page.locator('#ex-L4-P56 .answer-details').getAttribute('open'),null);await page.screenshot({path:path.join(out,'question-circuit-visible.png')});
 await page.setViewportSize({width:390,height:844});await page.goto(uri+'#ch04');await page.locator('#fig-F4-03').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'illustrated-mobile.png')});
 await page.locator('#fig-F4-03 [data-open-figure]').click();await page.locator('[data-figure-zoom=".25"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'figure-viewer-mobile.png')});await page.locator('[data-figure-close]').click();assert.ok(!await page.locator('#figure-viewer').isVisible());
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const result={date:'2026-11-04',theoryFiguresDecoded:76,questionFiguresDecoded:50,zoom:'PASS',keyboardAndClose:'PASS',mobile:'PASS',networkRequests:requests,consoleErrors:errors,status:'PASS'};
 fs.writeFileSync(path.join(out,'figures-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
