const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');const fs=require('node:fs');const assert=require('node:assert/strict');const path=require('node:path');
const root=path.resolve(__dirname,'..'),uri=pathToFileURL(path.join(root,'index.html')).href;
const out=process.env.QA_OUTPUT||path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 await page.goto(uri,{waitUntil:'load'});await page.locator('.chapter-row').first().waitFor();assert.match(await page.title(),/学习导览/);
 assert.equal(await page.locator('.chapter-row').count(),9);await page.screenshot({path:out+'/desktop-guide.png'});
 for(let n=1;n<=9;n++){
  await page.goto(uri+'#ch'+String(n).padStart(2,'0'));await page.locator('#chapter-article').waitFor();
  assert.equal(await page.locator('.katex-error').count(),0,'Math error in chapter '+n);
  assert.ok(await page.locator('.article h2').count()>=7);
 }
 await page.goto(uri+'#ch06');await page.locator('#lab-first').waitFor();await page.locator('#lab-first').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/desktop-transient.png'});
 const before=await page.locator('#lab-first .lab-result').innerText();await page.locator('#lab-first [data-param="r"]').fill('20');await page.locator('#lab-first [data-param="r"]').dispatchEvent('input');assert.notEqual(await page.locator('#lab-first .lab-result').innerText(),before);
 await page.locator('[data-mastered="ch06"]').first().click();assert.match(await page.locator('#progress-label').innerText(),/1 \/ 9/);
 await page.locator('.bookmark-button').first().click();await page.goto(uri+'#bookmarks');assert.ok(await page.locator('[data-bookmark]').count()>=1);
 await page.locator('#search-input').fill('超节点');await page.locator('.search-result').first().waitFor();await page.locator('.search-result').first().click();assert.ok((await page.locator('#content').innerText()).includes('超节点'));
 await page.goto(uri+'#labs');await page.locator('#all-labs .lab').last().waitFor();const labCount=await page.locator('#all-labs .lab').count();assert.equal(labCount,18);
 for(const lab of await page.locator('#all-labs .lab').all()){
  for(const control of await lab.locator('input[type="range"]').all()){await control.fill(await control.getAttribute('max'));await control.dispatchEvent('input');}
  for(const select of await lab.locator('select').all()){const vals=await select.locator('option').evaluateAll(els=>els.map(e=>e.value));for(const v of vals)await select.selectOption(v);}
  assert.ok(!/NaN|undefined/.test(await lab.innerText()));assert.ok(await lab.locator('svg').count()>0);
 }
 assert.equal(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length-new Set(ids).size}),0,'Duplicate HTML IDs');
 await page.locator('#lab-chapter-filter').selectOption('9');assert.equal(await page.locator('#all-labs .lab').count(),3);await page.screenshot({path:out+'/desktop-frequency.png'});
 await page.goto(uri+'#practice');await page.locator('#exercise-list .exercise').last().waitFor();assert.equal(await page.locator('#exercise-list>.exercise').count(),67);
 assert.equal(await page.locator('.katex-error').count(),0,'Math error in exercises');
 await page.locator('#exercise-source').selectOption('web');assert.equal(await page.locator('#exercise-list>.exercise').count(),12);
 const e=page.locator('#exercise-list>.exercise').first();await e.locator(':scope>summary').click();await e.locator('details summary').first().click();await e.locator('.answer-details>summary').click();assert.ok((await e.locator('.solution').innerText()).includes('126'));await e.locator('[data-wrong]').click();assert.equal(await page.evaluate(()=>CircuitReview.state().wrong.length),1);
 await e.screenshot({path:out+'/challenge-open.png'});
 await page.locator('[data-quiz-answer="0"][data-choice="0"]').click();assert.match(await page.locator('[data-quiz="0"] .quiz-feedback').innerText(),/正确/);
 const dl=page.waitForEvent('download');await page.goto(uri+'#bookmarks');await page.locator('[data-action="export"]').click();const download=await dl;await download.saveAs(out+'/learning-record-test.json');
 await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});assert.match(await page.locator('#toast').innerText(),/无法导入/);
 await page.locator('#import-file').setInputFiles({name:'good.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({mastered:['ch01','bad'],bookmarks:[],wrong:['L1-P73','BAD'],font:999}))});assert.equal(await page.evaluate(()=>CircuitReview.state().mastered.length),1);assert.equal(await page.evaluate(()=>CircuitReview.state().font),19);
 await page.goto(uri+'#formulas');await page.locator('#formula-list details').first().waitFor();assert.equal(await page.locator('#formula-list details').count(),39);await page.locator('#formula-filter').selectOption('6');assert.equal(await page.locator('#formula-list details').count(),3);
 await page.evaluate(()=>window.print=()=>{});await page.locator('[data-action="print"]').click();assert.equal(await page.locator('#formula-list details:not([open])').count(),0,'Formula print must expand formulas');
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 await page.goto(uri+'#home');await page.evaluate(()=>window.print=()=>{});await page.locator('[data-action="print-all"]').click();assert.equal(await page.locator('#print-all .chapter-print').count(),9);assert.equal(await page.locator('#print-all .katex-error').count(),0);
 await page.evaluate(()=>scrollTo(0,0));await page.emulateMedia({media:'print'});await page.screenshot({path:out+'/print-layout.png'});await page.emulateMedia({media:'screen'});
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert.equal(await page.locator('#print-all .chapter-print').count(),0,'Print-all cleanup');
 await page.goto(uri+'#ch01');await page.locator('[data-action="print"]').click();assert.equal(await page.locator('#content details:not([open])').count(),0,'Exercise print must expand outer details');
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('#print-all').evaluate(e=>getComputedStyle(e).display),'none','Current-page print must not append entire book');await page.emulateMedia({media:'screen'});
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 await page.goto(uri+'#labs');await page.locator('#lab-first [data-param="type"]').selectOption('RL');assert.match(await page.locator('#lab-first .lab-result').innerText(),/VTh = 50 V/);assert.match(await page.locator('#lab-first .lab-figure').innerText(),/VTh/);
 await page.locator('#lab-first').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/desktop-rl.png'});
 const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});await mobile.goto(uri+'#ch06');await mobile.locator('#chapter-article').waitFor();
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');await mobile.screenshot({path:out+'/mobile-reading.png'});
 await mobile.locator('#menu-button').click();assert.ok(await mobile.locator('#sidebar').evaluate(e=>e.classList.contains('open')));await mobile.locator('#search-input').fill('谐振');await mobile.locator('.search-result').first().waitFor();await mobile.locator('.search-result').first().click();
 await mobile.goto(uri+'#labs');await mobile.locator('#lab-first').scrollIntoViewIfNeeded();await mobile.screenshot({path:out+'/mobile-lab.png'});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile lab overflow');
 assert.deepEqual(errors,[],'Browser errors');assert.deepEqual(requests,[],'Unexpected network dependency');
 const result={url:uri,desktop:'1440×1000',mobile:'390×844',chapters:9,exercises:67,websiteChallenges:12,labs:18,networkRequests:requests,consoleErrors:errors,printRegression:'PASS',rlSourceConsistency:'PASS',status:'PASS'};
 fs.writeFileSync(out+'/qa-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
