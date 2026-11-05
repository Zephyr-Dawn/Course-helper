// Quick browser smoke test: node tests/smoke.browser.cjs [outDir]
// Requires PLAYWRIGHT_MODULE (path to playwright-core) and Google Chrome.
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const FILE = 'file://' + (process.env.SITE_HTML ? path.resolve(process.env.SITE_HTML) : path.resolve(__dirname, '..', '..', 'dist', '模拟电路-下半学期复习.html'));
const OUT = process.argv[2] || process.env.QA_OUTPUT || path.resolve(__dirname, '..', '..', 'tmp', 'qa');
const routes = (process.env.ROUTES || '#/home,#/ex/set/bjt,#/labs,#/formulas,#/quiz,#/me,#/about').split(',');

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const res = { errors: [], requests: [], routes: {} };
  for (const vp of [{ name: 'desk', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') res.errors.push(vp.name + ': ' + m.text()); });
    page.on('pageerror', e => res.errors.push(vp.name + ' pageerror: ' + e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) res.requests.push(r.url()); });
    await page.goto(FILE + '#/home');
    for (const r of routes) {
      await page.evaluate(h => { location.hash = h; }, r);
      await page.waitForTimeout(400);
      const info = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        missing: document.querySelectorAll('.build-missing').length,
        brokenImg: Array.from(document.querySelectorAll('img[data-img]')).filter(i => !i.src).length,
        labs: document.querySelectorAll('.lab').length,
        ids: (() => { const s = {}; let d = 0; document.querySelectorAll('[id]').forEach(e => { if (s[e.id]) d++; s[e.id] = 1; }); return d; })(),
        h1: (document.querySelector('#main h1') || {}).textContent,
      }));
      res.routes[vp.name + ' ' + r] = info;
      await page.screenshot({ path: path.join(OUT, `${vp.name}-${r.replace(/[#/?=]/g, '_')}.png`), fullPage: false });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(res, null, 1));
})();
