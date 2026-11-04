const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),uri=pathToFileURL(path.join(root,'index.html')).href;
const out=process.env.QA_OUTPUT||path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}});
 const errors=[],requests=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const page=await context.newPage();await page.goto(uri+'#formulas');await page.locator('.formula-card').last().waitFor();
 assert.equal(await page.locator('.formula-card').count(),39);assert.match(await page.locator('#formula-count').innerText(),/39/);
 await page.locator('.formula-card').evaluateAll(ds=>ds.forEach(d=>d.open=true));
 assert.equal(await page.locator('.katex-error,.math-error').count(),0,'All main and explanatory math must render');
 assert.ok(await page.locator('.formula-notes .katex').count()>20,'Inline formulas in notes must be typeset');
 const leaks=await page.locator('.formula-notes').evaluateAll(els=>els.flatMap(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;const bad=[];while(n=walker.nextNode()){if(!n.parentElement.closest('.katex')&&/data:image|base64|loading=|decoding=|\\(?:frac|sqrt|mathrm|alpha|omega|mathbf)|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(n.textContent))bad.push(n.textContent)}return bad}));
 assert.deepEqual(leaks,[],'Notes must not expose HTML fragments, control characters, or raw TeX');
 await page.screenshot({path:path.join(out,'formulas-desktop.png')});
 const counts=[4,4,3,5,4,3,4,4,8];for(let n=1;n<=9;n++){await page.locator('#formula-filter').selectOption(String(n));assert.equal(await page.locator('.formula-card').count(),counts[n-1]);assert.match(await page.locator('#formula-count').innerText(),new RegExp('本讲 '+counts[n-1]+' 组'));}
 await page.locator('#formula-filter').selectOption('4');await page.locator('#formula-KF13>summary').click();await page.locator('#formula-KF13 .formula-return>a').first().click();await page.locator('#chapter-article').waitFor();assert.ok((await page.locator('#content').innerText()).includes('反相放大器'));
 await page.goto(uri+'#formulas');await page.locator('#formula-filter').selectOption('9');await page.locator('.formula-card').evaluateAll(ds=>ds.forEach(d=>d.open=true));await page.screenshot({path:path.join(out,'formulas-frequency.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto(uri+'#home');await page.goto(uri+'#formulas');await page.locator('.formula-card').first().locator('summary').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'formulas-mobile.png')});
 await page.locator('#formula-filter').selectOption('9');await page.locator('.formula-card').evaluateAll(ds=>ds.forEach(d=>d.open=true));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('.katex-error,.math-error').count(),0);
 await page.setViewportSize({width:680,height:1000});await page.locator('#formula-filter').selectOption('all');await page.evaluate(()=>window.print=()=>{});await page.locator('[data-action="print"]').click();assert.equal(await page.locator('.formula-card:not([open])').count(),0);await page.emulateMedia({media:'print'});const overflow=await page.locator('#formula-list .math-display').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.dataset.tex));assert.deepEqual(overflow,[],'Printed key formulas must fit the page');await page.pdf({path:path.join(out,'key-formulas-print.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const result={date:'2026-11-04',keyFormulaGroups:39,lectures:9,typesetting:'PASS',structuredNotes:'PASS',sourceLinks:'PASS',filters:'PASS',mobile:'PASS',printExpansion:'PASS',printFormulaOverflow:0,networkRequests:requests,consoleErrors:errors,status:'PASS'};fs.writeFileSync(path.join(out,'formula-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
