// Functional browser checks on the built single HTML (file://).
// PLAYWRIGHT_MODULE=<playwright-core path> node tests/functional.browser.cjs
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const FILE = 'file://' + (process.env.SITE_HTML ? path.resolve(process.env.SITE_HTML) : path.resolve(__dirname, '..', '..', 'dist', '模拟电路-下半学期复习.html'));
const OUT = process.env.QA_OUTPUT || path.resolve(__dirname, '..', '..', 'tmp', 'qa');
const results = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.goto(FILE + '#/home');
  await page.waitForTimeout(500);

  // 1. every lab responds to every control without errors and changes output
  await page.evaluate(() => { location.hash = '#/labs'; });
  await page.waitForTimeout(800);
  const labReport = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.lab').forEach(lab => {
      const id = lab.id;
      const before = lab.querySelector('.lab-out').innerHTML + lab.querySelector('.lab-svg').innerHTML;
      let changed = 0, nan = 0;
      lab.querySelectorAll('input[type=range]').forEach(r => {
        for (const v of [r.min, r.max, r.defaultValue]) {
          r.value = v; r.dispatchEvent(new Event('input', { bubbles: true }));
          const t = lab.querySelector('.lab-out').textContent + lab.querySelector('.lab-svg').innerHTML;
          if (/NaN|undefined/.test(t)) nan++;
        }
      });
      lab.querySelectorAll('select').forEach(s => {
        for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('input', { bubbles: true })); const t = lab.querySelector('.lab-out').textContent + lab.querySelector('.lab-svg').innerHTML; if (/NaN|undefined/.test(t)) nan++; }
        s.value = s.options[0].value; s.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const r0 = lab.querySelector('input[type=range]');
      if (r0) { r0.value = r0.max; r0.dispatchEvent(new Event('input', { bubbles: true })); }
      const after = lab.querySelector('.lab-out').innerHTML + lab.querySelector('.lab-svg').innerHTML;
      if (after !== before) changed = 1;
      if (r0) { r0.value = r0.defaultValue; r0.dispatchEvent(new Event('input', { bubbles: true })); }
      out.push({ id, changed, nan, warn: !!lab.querySelector('.warnline') && /超出模型范围/.test(lab.textContent) });
    });
    return out;
  });
  ok('18 labs mounted', labReport.length === 18, labReport.length);
  ok('labs react to controls', labReport.every(l => l.changed), JSON.stringify(labReport.filter(l => !l.changed)));
  ok('labs never print NaN/undefined', labReport.every(l => l.nan === 0), JSON.stringify(labReport.filter(l => l.nan)));
  ok('labs never throw (model-range message)', labReport.every(l => !l.warn), JSON.stringify(labReport.filter(l => l.warn)));
  await page.screenshot({ path: path.join(OUT, 'f-labs.png') });

  // 2. exercises: every exercise has reviewed content; corrected ones show final
  await page.evaluate(() => { location.hash = '#/ex/CH07-KP3-10'; });
  await page.waitForTimeout(800);
  const ex = await page.evaluate(() => {
    const sec = document.getElementById('ex-CH07-KP3-10');
    sec.querySelectorAll('details').forEach(d => (d.open = true));
    return { inView: sec.getBoundingClientRect().top < 300, text: sec.textContent, chips: [...sec.querySelectorAll('.chip')].map(c => c.textContent) };
  });
  ok('exercise deep link scrolls to item', ex.inView);
  ok('corrected exercise shows 已勘误 + 最终答案', ex.chips.includes('已勘误') && ex.text.includes('最终答案'), ex.chips.join('|'));
  await page.screenshot({ path: path.join(OUT, 'f-ex-corrected.png') });
  const exStats = await page.evaluate(() => {
    const D = window.__APP__.D;
    return { total: D.exercises.length, noReview: D.exercises.filter(e => !e.verdict).map(e => e.id), noSol: D.exercises.filter(e => e.kind === 'calc' && !e.solutionHtml).map(e => e.id) };
  });
  ok('all 191 exercises reviewed', exStats.total === 191 && exStats.noReview.length === 0, exStats.noReview.join(','));
  ok('all calc exercises have solutions', exStats.noSol.length === 0, exStats.noSol.join(','));

  // 3. marking + filter + wrong book
  await page.evaluate(() => { location.hash = '#/ex/set/diode'; });
  await page.waitForTimeout(600);
  await page.click('#ex-CH06-KP1-01 [data-mark="wrong"]');
  await page.evaluate(() => { location.hash = '#/ex/set/_wrong'; });
  await page.waitForTimeout(500);
  ok('wrong-book lists marked exercise', await page.$('#ex-CH06-KP1-01') !== null);
  await page.evaluate(() => { location.hash = '#/ex/set/feedbak'; });
  await page.waitForTimeout(500);
  await page.selectOption('#f-kind', 'calc');
  const calcOnly = await page.evaluate(() => [...document.querySelectorAll('#ex-list .ex')].every(s => s.textContent.includes('计算/分析')));
  ok('kind filter works', calcOnly);

  // 4. search
  await page.fill('#search', '密勒');
  await page.waitForTimeout(300);
  const hits = await page.$$eval('#search-results a', as => as.map(a => a.getAttribute('href')));
  ok('search finds Miller topics', hits.length > 0 && hits.some(h => h.startsWith('#/ch/ch10')), hits.slice(0, 3).join(' '));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  ok('search Enter navigates', (await page.evaluate(() => location.hash)).startsWith('#/'));
  await page.fill('#search', 'CH11-KP2-08');
  await page.waitForTimeout(300);
  const idHit = await page.$eval('#search-results a', a => a.getAttribute('href'));
  ok('search by exercise id', idHit === '#/ex/CH11-KP2-08', idHit);
  await page.keyboard.press('Escape');

  // 5. chapter anchor jump keeps slider state
  await page.evaluate(() => { location.hash = '#/ch/ch06'; });
  await page.waitForTimeout(800);
  const sec = await page.evaluate(() => window.__APP__.D.chapters[0].sections.filter(s => s.level === 2)[5].id);
  await page.evaluate(() => { const r = document.querySelector('.lab input[type=range]'); r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.evaluate(id => { location.hash = '#/ch/ch06/' + id; }, sec);
  await page.waitForTimeout(500);
  const kept = await page.evaluate(() => { const r = document.querySelector('.lab input[type=range]'); return r.value === r.max; });
  ok('same-page anchor keeps slider state', kept);

  // 6. formulas page: small text has math rendered, no raw TeX / html leakage
  await page.evaluate(() => { location.hash = '#/formulas'; });
  await page.waitForTimeout(800);
  const fx = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.formula')];
    const txt = cards.map(c => { const cl = c.cloneNode(true); cl.querySelectorAll('.katex').forEach(k => k.remove()); return cl.textContent; }).join('\n');
    return { n: cards.length, leak: (txt.match(/\\[a-zA-Z]+|\$|<\/?[a-z]+|data:image|base64/g) || []).slice(0, 5), math: cards.filter(c => c.querySelector('dd .katex')).length,
      overflow: cards.filter(c => c.scrollWidth > c.clientWidth + 2).length };
  });
  ok('52 formula cards', fx.n === 52, fx.n);
  ok('formula small text has no raw TeX/HTML', fx.leak.length === 0, fx.leak.join(' '));
  ok('formula small text math rendered', fx.math > 30, fx.math);
  ok('formula cards do not overflow', fx.overflow === 0, fx.overflow);

  // 7. whole-site raw TeX leakage in chapters (text outside .katex containing $ or \cmd)
  const leaks = await page.evaluate(() => {
    const D = window.__APP__.D, out = [];
    for (const c of D.chapters) {
      const div = document.createElement('div'); div.innerHTML = c.html;
      div.querySelectorAll('.katex, code, pre').forEach(k => k.remove());
      const m = div.textContent.match(/.{0,20}(\$|\\(frac|mathrm|left|right|Omega|alpha|beta)).{0,20}/g);
      if (m) out.push(c.id + ': ' + m.slice(0, 3).join(' | '));
    }
    for (const e of D.exercises) {
      const div = document.createElement('div'); div.innerHTML = e.qHtml + e.aHtml + e.solutionHtml + e.finalHtml + e.noteHtml + e.checkHtml;
      div.querySelectorAll('.katex, code, pre').forEach(k => k.remove());
      const m = div.textContent.match(/.{0,15}(\$|\\(frac|mathrm|left|right|rm)).{0,15}/g);
      if (m) out.push(e.id + ': ' + m.slice(0, 2).join(' | '));
    }
    return out;
  });
  ok('no raw TeX leaking in chapters/exercises', leaks.length === 0, leaks.slice(0, 12).join('\n'));

  // 8. records: export, bad import rejected, unknown ids filtered
  await page.evaluate(() => { location.hash = '#/me'; });
  await page.waitForTimeout(500);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exp')]);
  const p = path.join(OUT, 'export.json'); await dl.saveAs(p);
  const exported = JSON.parse(fs.readFileSync(p, 'utf8'));
  ok('export contains wrong mark', exported.ex && exported.ex['CH06-KP1-01'] === 'wrong');
  const bad = path.join(OUT, 'bad.json'); fs.writeFileSync(bad, '{not json');
  await page.setInputFiles('#imp', bad); await page.waitForTimeout(400);
  ok('bad JSON rejected', /不是有效/.test(await page.textContent('#me-msg')));
  const mixed = path.join(OUT, 'mixed.json');
  fs.writeFileSync(mixed, JSON.stringify({ ex: { 'CH07-KP1-01': 'done', 'FAKE-1': 'done' }, fav: ['ch06-s01', 'nope'], font: 99 }));
  await page.setInputFiles('#imp', mixed); await page.waitForTimeout(400);
  const st = await page.evaluate(() => window.__APP__.state());
  ok('import filters unknown ids & clamps font', st.ex['CH07-KP1-01'] === 'done' && !st.ex['FAKE-1'] && st.fav.length === 1 && st.font === 17, JSON.stringify(st).slice(0, 200));

  // 9. print current page expands details; print-all fills and clears
  await page.evaluate(() => { location.hash = '#/ex/set/pa'; });
  await page.waitForTimeout(600);
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const closed = await page.$$eval('#main details', ds => ds.filter(d => !d.open).length);
  ok('beforeprint opens all details', closed === 0, closed);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => { location.hash = '#/ch/ch12'; });
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('#print-all-btn');
  const filled = await page.evaluate(() => ({ n: document.querySelectorAll('#print-all .chapter').length, cls: document.body.classList.contains('printing-all') }));
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  const cleared = await page.evaluate(() => document.getElementById('print-all').innerHTML === '' && !document.body.classList.contains('printing-all'));
  ok('print-all builds 6 chapters then clears', filled.n === 6 && filled.cls && cleared, JSON.stringify(filled));

  // 10. image zoom dialog
  await page.click('#main figure img.zoomable');
  await page.waitForTimeout(300);
  ok('zoom dialog opens', await page.evaluate(() => document.getElementById('zoom-dlg').open));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok('zoom dialog closes with Esc', !(await page.evaluate(() => document.getElementById('zoom-dlg').open)));

  ok('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  ok('no http(s) requests', requests.length === 0, requests.slice(0, 5).join(' '));
  await browser.close();
  const failed = results.filter(r => !r.pass);
  for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.pass || !r.info ? '' : '  -> ' + r.info));
  console.log(failed.length ? `${failed.length} FAILED` : 'ALL PASS');
  process.exit(failed.length ? 1 : 0);
})();
