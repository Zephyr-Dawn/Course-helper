/* 模拟电路下半学期复习 · 单页应用（离线、无外部请求） */
(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('course-data').textContent);
  const IMG = JSON.parse(document.getElementById('image-data').textContent);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const main = $('#main'), toc = $('#toc'), nav = $('#sidenav');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 学习记录 ---------- */
  const KEY = 'ac2-review-v1';
  const EX_IDS = new Set(D.exercises.map(e => e.id));
  const SEC_IDS = new Set(D.chapters.flatMap(c => c.sections.map(s => s.id)));
  const CH_IDS = new Set(D.chapters.map(c => c.id));
  function blank() { return { v: 1, ex: {}, fav: [], chDone: {}, quiz: {}, font: 17, last: '' }; }
  function clean(s) {
    const o = blank();
    if (!s || typeof s !== 'object') return o;
    if (s.ex && typeof s.ex === 'object') for (const [k, v] of Object.entries(s.ex)) if (EX_IDS.has(k) && ['done', 'wrong', 'star'].includes(v)) o.ex[k] = v;
    if (Array.isArray(s.fav)) o.fav = [...new Set(s.fav.filter(x => SEC_IDS.has(x) || EX_IDS.has(x)))];
    if (s.chDone && typeof s.chDone === 'object') for (const k of Object.keys(s.chDone)) if (CH_IDS.has(k) && s.chDone[k]) o.chDone[k] = true;
    if (s.quiz && typeof s.quiz === 'object') for (const [k, v] of Object.entries(s.quiz)) if (typeof v === 'boolean') o.quiz[k] = v;
    const f = Number(s.font); if (f >= 15 && f <= 20) o.font = Math.round(f);
    if (typeof s.last === 'string' && s.last.startsWith('#/') && s.last.length < 200) o.last = s.last;
    return o;
  }
  let S;
  try { S = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { S = blank(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 存储不可用时仅本次有效 */ } }
  function applyFont() { document.documentElement.style.setProperty('--fs', S.font + 'px'); }
  applyFont();
  $('#font-inc').onclick = () => { S.font = Math.min(20, S.font + 1); applyFont(); save(); };
  $('#font-dec').onclick = () => { S.font = Math.max(15, S.font - 1); applyFont(); save(); };

  /* ---------- 图像 ---------- */
  function fillImages(root) {
    $$('img[data-img]', root).forEach(img => { if (!img.src) { const u = IMG[img.dataset.img]; if (u) img.src = u; else img.alt = '[图像缺失]'; } });
  }
  const dlg = $('#zoom-dlg'), zbody = $('.zoom-body', dlg), zimg = $('img', dlg);
  let zscale = 1;
  function zoomTo(s) { zscale = s; if (s === 0) { zbody.classList.add('fit'); zimg.style.width = ''; } else { zbody.classList.remove('fit'); zimg.style.width = (zimg.naturalWidth * s) + 'px'; } }
  document.addEventListener('click', e => {
    const img = e.target.closest('img.zoomable');
    if (img && img.src) {
      zimg.src = img.src;
      const cap = img.closest('figure') ? $('figcaption', img.closest('figure')).textContent : (img.alt || '');
      $('.zoom-cap', dlg).textContent = cap;
      dlg.showModal(); zoomTo(0);
    }
  });
  $$('.zoom-bar button', dlg).forEach(b => b.onclick = () => {
    const z = b.dataset.z;
    if (z === 'x') return dlg.close();
    if (z === '0') return zoomTo(0);
    const cur = zscale === 0 ? Math.min(1, zbody.clientWidth / (zimg.naturalWidth || 1)) : zscale;
    zoomTo(Math.max(0.25, Math.min(5, cur * (z === '1' ? 1.4 : 1 / 1.4))));
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.matches('img.zoomable')) document.activeElement.click();
  });

  /* ---------- 导航 ---------- */
  const exBySet = {};
  D.exercises.forEach(e => (exBySet[e.set] = exBySet[e.set] || []).push(e));
  function renderNav() {
    const r = location.hash || '#/home';
    let h = '<h4>开始</h4>' + link('#/home', '学习导览') +
      '<h4>讲义</h4>' + D.chapters.map(c => link('#/ch/' + c.id, c.title, S.chDone[c.id] ? '✓' : '')).join('') +
      '<h4>练习</h4>' + link('#/ex', '习题总览', D.exercises.length) +
      D.sets.map(s => link('#/ex/set/' + s.name, (s.chapter ? s.chapter + ' · ' : '') + s.title, s.count)).join('') +
      link('#/quiz', '概念快测', D.quizzes.length) +
      '<h4>工具</h4>' + link('#/labs', '互动实验', Object.keys(window.LABS || {}).length) +
      link('#/formulas', '重点公式速查', D.formulas.length) + link('#/me', '收藏与学习记录') + link('#/about', '来源与说明');
    nav.innerHTML = h;
    function link(href, text, badge) {
      const on = r === href || (href !== '#/home' && href.length > 4 && r.startsWith(href + '/') && !(href === '#/ex' && r.startsWith('#/ex/set')));
      return `<a href="${href}" class="${on ? 'active' : ''}"><span>${esc(text)}</span>${badge !== undefined && badge !== '' ? `<span class="badge">${badge}</span>` : ''}</a>`;
    }
  }
  $('#menu-btn').onclick = () => { const o = document.body.classList.toggle('nav-open'); $('#menu-btn').setAttribute('aria-expanded', o); };
  nav.addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });

  function setToc(items) {
    toc.innerHTML = items.length ? '<div class="muted" style="font-weight:600;margin:0 6px 6px">本页目录</div>' +
      items.map(i => `<a href="${i.href}" class="l${i.level}" data-tid="${i.id}">${esc(i.title)}</a>`).join('') : '';
  }
  let spy = null;
  function scrollSpy() {
    if (spy) spy.disconnect();
    const hs = $$('#main h2[id], #main h3[id]');
    if (!hs.length || !('IntersectionObserver' in window)) return;
    spy = new IntersectionObserver(ents => {
      ents.forEach(en => { if (en.isIntersecting) { $$('#toc a').forEach(a => a.classList.toggle('on', a.dataset.tid === en.target.id)); } });
    }, { rootMargin: '-60px 0px -70% 0px' });
    hs.forEach(h => spy.observe(h));
  }

  /* ---------- 视图 ---------- */
  const counts = D.meta.counts;
  function viewHome() {
    const exDone = Object.values(S.ex).filter(v => v === 'done').length;
    const wrong = Object.values(S.ex).filter(v => v === 'wrong').length;
    main.innerHTML = `<h1>模拟电路（下半学期）互动复习</h1>
    <p class="lead">覆盖课堂讲义第 6–8、10–12 章：二极管、三极管、场效应管、频率响应、反馈与功率放大器。课堂讲义是主线，MIT 讲义作补充，习题来自 EC2024 网站 Microelectronic Circuits 部分并逐题核对。</p>
    <div class="cards">${D.chapters.map(c => {
      const n = c.sections.filter(s => s.level === 2).length;
      const ex = D.exercises.filter(e => e.chapter === c.num);
      const d = ex.filter(e => S.ex[e.id] === 'done').length;
      return `<a class="card" href="#/ch/${c.id}"><h3>${esc(c.title)}</h3><div class="meta">${n} 个专题 · ${ex.length} 道习题 ${S.chDone[c.id] ? '· 已掌握 ✓' : ''}</div><div class="progress"><i style="width:${ex.length ? Math.round(100 * d / ex.length) : 0}%"></i></div></a>`;
    }).join('')}</div>
    <h2>怎么用</h2>
    <ol>
      <li><b>先读讲义</b>：每个专题按“定义 → 推导 → 条件 → 例题 → 易错 → 自检”展开，图紧跟文字，点图可放大。</li>
      <li><b>再动手调参</b>：<a href="#/labs">互动实验</a>里先猜结果，再拖滑块看曲线怎么变，最后回正文对照。</li>
      <li><b>做题</b>：<a href="#/ex">习题</a>先看题图独立做，再依次展开提示、参考答案和本站核对。做完标“会了”或“错题”。</li>
      <li><b>考前</b>：看 <a href="#/formulas">重点公式速查</a> 和 <a href="#/quiz">概念快测</a>，再刷错题。</li>
    </ol>
    <div class="cards">
      <div class="card"><h3>${counts.exercises}</h3><div class="meta">习题（已核对 ${counts.reviewed}）</div></div>
      <div class="card"><h3>${exDone} / ${wrong}</h3><div class="meta">已会 / 错题</div></div>
      <div class="card"><h3>${counts.figures}</h3><div class="meta">讲义配图</div></div>
      <div class="card"><h3>${Object.keys(window.LABS || {}).length}</h3><div class="meta">互动实验</div></div>
    </div>
    ${S.last && S.last !== '#/home' ? `<p>上次读到：<a href="${esc(S.last)}">${esc(S.last)}</a></p>` : ''}
    <p class="muted">快捷键：<span class="kbd">Ctrl/⌘</span>+<span class="kbd">K</span> 搜索。学习记录只存在本浏览器，可在“收藏与学习记录”导出备份。</p>`;
    setToc([]);
  }

  function viewChapter(id, anchor) {
    const c = D.chapters.find(x => x.id === id);
    if (!c) return viewNotFound();
    const i = D.chapters.indexOf(c);
    const prev = D.chapters[i - 1], next = D.chapters[i + 1];
    const exCount = D.exercises.filter(e => e.chapter === c.num).length;
    const set = D.sets.find(s => s.chapter === c.num);
    main.innerHTML = `<h1>${esc(c.title)}</h1>
      <div class="toolbar no-print"><button class="btn ${S.chDone[c.id] ? 'on' : ''}" id="ch-done">${S.chDone[c.id] ? '已标记掌握 ✓' : '标记本章已掌握'}</button>
      ${set ? `<a class="btn" href="#/ex/set/${set.name}">本章习题 ${exCount} 道</a>` : ''}
      <a class="btn" href="#/formulas?ch=${c.num}">本章公式</a><button class="btn" id="print-all-btn">打印全部讲义</button></div>
      <article class="chapter-body">${c.html}</article>
      <div class="toolbar no-print" style="margin-top:2em">${prev ? `<a class="btn" href="#/ch/${prev.id}">← ${esc(prev.title)}</a>` : ''}${next ? `<a class="btn" href="#/ch/${next.id}">${esc(next.title)} →</a>` : ''}</div>`;
    $('#ch-done').onclick = () => { S.chDone[c.id] = !S.chDone[c.id]; if (!S.chDone[c.id]) delete S.chDone[c.id]; save(); route(); };
    $('#print-all-btn').onclick = printAll;
    setToc(c.sections.map(s => ({ id: s.id, level: s.level, title: s.title, href: `#/ch/${c.id}/${s.id}` })));
    mountLabs(main); markFavs(main);
    if (anchor) scrollToId(anchor);
  }

  function markFavs(root) {
    $$('.fav-btn', root).forEach(b => {
      const on = S.fav.includes(b.dataset.fav);
      b.classList.toggle('on', on); b.textContent = on ? '★' : '☆';
      b.onclick = () => { toggleFav(b.dataset.fav); markFavs(root); };
    });
  }
  function toggleFav(id) { S.fav = S.fav.includes(id) ? S.fav.filter(x => x !== id) : S.fav.concat(id); save(); }

  /* ---------- 习题 ---------- */
  const KIND = { choice: '选择', fill: '填空', calc: '计算/分析' };
  const VERD = { ok: ['chip ok', '答案已核对'], corrected: ['chip fix', '已勘误'], note: ['chip fix', '有补充说明'], unclear: ['chip bad', '题面存疑'] };
  function exHtml(e) {
    const st = S.ex[e.id];
    const v = VERD[e.verdict];
    const diff = e.difficulty ? ['', '基础', '进阶', '挑战'][e.difficulty] : '';
    return `<section class="ex" id="ex-${e.id}">
      <div class="ex-head"><b>${e.id}</b><span class="chip">${esc(e.setTitle)}</span><span class="chip">${esc(e.kp.replace(/^知识点\d+[：:]/, ''))}</span><span class="chip">${KIND[e.kind] || ''}</span>${diff ? `<span class="chip">${diff}</span>` : ''}${v ? `<span class="${v[0]}">${v[1]}</span>` : ''}${st === 'done' ? '<span class="chip ok">会了</span>' : st === 'wrong' ? '<span class="chip bad">错题</span>' : ''}</div>
      <div class="ex-q">${e.qHtml}</div>
      ${e.hints.length ? `<details><summary>提示（${e.hints.length} 级）</summary><div class="dbody"><ol>${e.hints.map(h => `<li>${h}</li>`).join('')}</ol></div></details>` : ''}
      <details><summary>参考答案（原网站）</summary><div class="dbody">${e.aHtml || '<p class="muted">原网站未给答案。</p>'}</div></details>
      ${e.solutionHtml ? `<details><summary>本站分步解析</summary><div class="dbody">${e.solutionHtml}</div></details>` : ''}
      ${e.finalHtml || e.checkHtml || e.noteHtml ? `<details><summary>核对结论${e.verdict === 'corrected' ? '（含勘误）' : ''}</summary><div class="dbody">${e.finalHtml ? '<p><b>最终答案</b></p>' + e.finalHtml : ''}${e.checkHtml ? '<p><b>自检</b></p>' + e.checkHtml : ''}${e.noteHtml ? '<p><b>说明</b></p>' + e.noteHtml : ''}</div></details>` : ''}
      <div class="ex-actions no-print"><button class="btn ${st === 'done' ? 'on' : ''}" data-mark="done">会了</button><button class="btn ${st === 'wrong' ? 'on' : ''}" data-mark="wrong">错题</button><button class="btn ${S.fav.includes(e.id) ? 'on' : ''}" data-favex="1">${S.fav.includes(e.id) ? '★ 已收藏' : '☆ 收藏'}</button><a class="btn" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">原题页（需联网）</a></div>
    </section>`;
  }
  function bindEx(root) {
    $$('.ex', root).forEach(sec => {
      const id = sec.id.slice(3);
      $$('[data-mark]', sec).forEach(b => b.onclick = () => { const m = b.dataset.mark; if (S.ex[id] === m) delete S.ex[id]; else S.ex[id] = m; save(); rerenderEx(sec); });
      const f = $('[data-favex]', sec); if (f) f.onclick = () => { toggleFav(id); rerenderEx(sec); };
    });
  }
  function rerenderEx(sec) {
    const e = D.exercises.find(x => 'ex-' + x.id === sec.id);
    const open = $$('details', sec).map(d => d.open);
    const t = document.createElement('div'); t.innerHTML = exHtml(e);
    const n = t.firstElementChild; sec.replaceWith(n);
    $$('details', n).forEach((d, i) => { if (open[i]) d.open = true; });
    fillImages(n); bindEx(n.parentNode); renderNav();
  }

  function viewExOverview() {
    main.innerHTML = `<h1>习题总览</h1>
      <p class="lead">题目来自 <b>EC2024 网站 Microelectronic Circuits 部分</b>（MIT 许可，作者 bc0403）。题面、题图和原参考答案照录，另有本站独立核对：<span class="chip ok">答案已核对</span> 表示独立复算一致，<span class="chip fix">已勘误</span> 表示原答案有误或不完整并给出更正。</p>
      <div class="cards">${D.sets.map(s => {
        const ex = exBySet[s.name] || [];
        const d = ex.filter(e => S.ex[e.id] === 'done').length, w = ex.filter(e => S.ex[e.id] === 'wrong').length;
        return `<a class="card" href="#/ex/set/${s.name}"><h3>${s.chapter ? '第 ' + s.chapter + ' 章 · ' : ''}${esc(s.title)}</h3><div class="meta">${s.count} 题 · 会了 ${d} · 错题 ${w}${s.chapter === 9 ? '<br>运放属上半学期内容，题目保留供综合复习' : ''}</div><div class="progress"><i style="width:${Math.round(100 * d / s.count)}%"></i></div></a>`;
      }).join('')}</div>
      <p><a class="btn" href="#/ex/set/_wrong">只看错题</a> <a class="btn" href="#/ex/set/_fav">只看收藏题</a></p>`;
    setToc([]);
  }

  function viewExSet(name, focus) {
    let list, title;
    if (name === '_wrong') { list = D.exercises.filter(e => S.ex[e.id] === 'wrong'); title = '错题本'; }
    else if (name === '_fav') { list = D.exercises.filter(e => S.fav.includes(e.id)); title = '收藏的题'; }
    else { const s = D.sets.find(x => x.name === name); if (!s) return viewNotFound(); list = exBySet[name]; title = (s.chapter ? `第 ${s.chapter} 章 · ` : '') + s.title + ' · 习题'; }
    const kps = [...new Set(list.map(e => e.kp))];
    main.innerHTML = `<h1>${esc(title)}</h1>
      <div class="toolbar no-print">
        <select id="f-kp" aria-label="知识点"><option value="">全部知识点</option>${kps.map(k => `<option>${esc(k)}</option>`).join('')}</select>
        <select id="f-kind" aria-label="题型"><option value="">全部题型</option><option value="choice">选择</option><option value="fill">填空</option><option value="calc">计算/分析</option></select>
        <select id="f-st" aria-label="状态"><option value="">全部状态</option><option value="todo">未标记</option><option value="done">会了</option><option value="wrong">错题</option></select>
        <button class="btn" id="open-all">展开全部答案</button><span id="f-count" class="muted"></span></div>
      <div id="ex-list"></div>`;
    const draw = () => {
      const kp = $('#f-kp').value, kind = $('#f-kind').value, st = $('#f-st').value;
      const L = list.filter(e => (!kp || e.kp === kp) && (!kind || e.kind === kind) && (!st || (st === 'todo' ? !S.ex[e.id] : S.ex[e.id] === st)));
      $('#ex-list').innerHTML = L.map(exHtml).join('') || '<p class="muted">没有符合条件的题目。</p>';
      $('#f-count').textContent = `共 ${L.length} 题`;
      fillImages($('#ex-list')); bindEx($('#ex-list'));
      setToc(L.map(e => ({ id: 'ex-' + e.id, level: 2, title: e.id, href: '#/ex/' + e.id })));
    };
    ['#f-kp', '#f-kind', '#f-st'].forEach(s => $(s).onchange = draw);
    $('#open-all').onclick = () => $$('#ex-list details').forEach(d => (d.open = true));
    draw();
    if (focus) scrollToId('ex-' + focus);
  }

  /* ---------- 公式 / 快测 / 互动 / 记录 ---------- */
  function chTitle(n) { const c = D.chapters.find(x => x.num === n); return c ? c.title : '第 ' + n + ' 章'; }
  function viewFormulas(focus, q) {
    const chs = [...new Set(D.formulas.map(f => f.chapter))];
    const want = Number(new URLSearchParams(q || '').get('ch')) || 0;
    main.innerHTML = `<h1>重点公式速查</h1><p class="lead">只收反复用到的关系。每条写清用途、适用条件和易错点；完整推导与例题点“正文”回讲义。</p>
      <div class="toolbar no-print"><button class="btn ${want ? '' : 'on'}" data-ch="0">全部 ${D.formulas.length}</button>${chs.map(n => `<button class="btn ${want === n ? 'on' : ''}" data-ch="${n}">第 ${n} 章 ${D.formulas.filter(f => f.chapter === n).length}</button>`).join('')}<button class="btn" id="fx-print">打印本页</button></div><div id="fx-list"></div>`;
    const draw = n => {
      const L = D.formulas.filter(f => !n || f.chapter === n);
      $('#fx-list').innerHTML = L.map(f => `<div class="formula" id="formula-${f.id}"><h3>${esc(f.title)} <span class="chip">${f.id}</span></h3><div class="fx">${f.texHtml}</div>
        <dl><dt>用途</dt><dd>${f.useHtml}</dd><dt>条件</dt><dd>${f.condHtml}</dd><dt>易错</dt><dd>${f.pitfallHtml}</dd></dl>
        ${f.section ? `<p class="no-print" style="margin:4px 0 0;font-size:.88em"><a href="#/ch/${f.section.split('-')[0]}/${f.section}">正文 ${esc(sectionTitle(f.section))} →</a></p>` : ''}</div>`).join('');
      $$('.toolbar [data-ch]').forEach(b => b.classList.toggle('on', Number(b.dataset.ch) === n));
      setToc(L.map(f => ({ id: 'formula-' + f.id, level: 2, title: f.title, href: '#/formulas/' + f.id })));
    };
    $$('.toolbar [data-ch]').forEach(b => b.onclick = () => draw(Number(b.dataset.ch)));
    $('#fx-print').onclick = printCurrent;
    draw(want);
    if (focus) scrollToId('formula-' + focus);
  }
  function sectionTitle(sid) { for (const c of D.chapters) for (const s of c.sections) if (s.id === sid) return s.title; return sid; }

  function viewQuiz() {
    main.innerHTML = `<h1>概念快测</h1><p class="lead">点选一个选项即显示解释。每题对应一个容易混淆的概念。</p>
      <div class="toolbar no-print"><button class="btn" id="qz-reset">清空作答</button><span class="muted" id="qz-score"></span></div>` +
      D.chapters.map(c => {
        const L = D.quizzes.filter(q => q.chapter === c.num);
        if (!L.length) return '';
        return `<h2 id="qz-${c.id}">${esc(c.title)}</h2>` + L.map(q => `<div class="quiz" data-q="${q.id}"><div><b>${q.id}</b> ${q.qHtml}</div><ol>${q.options.map((o, i) => `<li><button data-i="${i}">${o}</button></li>`).join('')}</ol><div class="expl" hidden>${q.explHtml}${q.section ? ` <a href="#/ch/${q.section.split('-')[0]}/${q.section}">回正文</a>` : ''}</div></div>`).join('');
      }).join('');
    const score = () => { const a = Object.keys(S.quiz).length, r = Object.values(S.quiz).filter(Boolean).length; $('#qz-score').textContent = a ? `已答 ${a} / ${D.quizzes.length}，答对 ${r}` : ''; };
    $$('.quiz').forEach(box => {
      const q = D.quizzes.find(x => x.id === box.dataset.q);
      const show = (i) => {
        $$('button', box).forEach((b, j) => { b.classList.toggle('right', j === q.correct); b.classList.toggle('wrong', j === i && i !== q.correct); });
        $('.expl', box).hidden = false;
      };
      $$('button', box).forEach(b => b.onclick = () => { const i = Number(b.dataset.i); S.quiz[q.id] = i === q.correct; save(); show(i); score(); });
      if (q.id in S.quiz) show(S.quiz[q.id] ? q.correct : -1);
    });
    $('#qz-reset').onclick = () => { S.quiz = {}; save(); viewQuiz(); };
    score();
    setToc(D.chapters.filter(c => D.quizzes.some(q => q.chapter === c.num)).map(c => ({ id: 'qz-' + c.id, level: 2, title: c.title, href: '#/quiz' })));
  }

  function viewLabs(focus) {
    const L = window.LABS || {};
    const ids = Object.keys(L);
    main.innerHTML = `<h1>互动实验</h1><p class="lead">每个实验都是理想化的解析模型：先预测，再拖动参数，看图和读数怎么变，最后回到正文对照条件。</p>` +
      D.chapters.map(c => {
        const mine = ids.filter(id => L[id].chapter === c.num);
        return mine.length ? `<h2 id="labs-${c.id}">${esc(c.title)}</h2>` + mine.map(id => `<div class="lab-mount" data-lab="${id}"></div>`).join('') : '';
      }).join('');
    mountLabs(main);
    setToc(ids.map(id => ({ id: 'lab-' + id, level: 2, title: L[id].title, href: '#/labs/' + id })));
    if (focus) scrollToId('lab-' + focus);
  }

  function mountLabs(root) {
    const L = window.LABS || {};
    $$('.lab-mount', root).forEach(m => {
      const lab = L[m.dataset.lab];
      if (!lab) { m.innerHTML = `<p class="build-missing">[互动 ${esc(m.dataset.lab)} 未定义]</p>`; return; }
      if (m.dataset.done) return;
      m.dataset.done = '1';
      const uid = 'lab-' + m.dataset.lab + (document.getElementById('lab-' + m.dataset.lab) ? '-' + Math.random().toString(36).slice(2, 6) : '');
      m.innerHTML = `<div class="lab" id="${uid}"><div class="lab-title">互动 · ${esc(lab.title)}</div><div class="lab-desc">${lab.desc}</div>
        <div class="lab-grid"><div class="lab-ctrl">${lab.controls.map(c => ctrlHtml(c, uid)).join('')}</div><div><div class="lab-svg"></div><div class="lab-out" aria-live="polite"></div></div></div></div>`;
      const box = m.firstElementChild;
      const read = () => {
        const p = {};
        lab.controls.forEach(c => { const el = box.querySelector(`[data-c="${c.id}"]`); p[c.id] = c.type === 'select' ? el.value : Number(el.value); });
        lab.controls.forEach(c => { const o = box.querySelector(`output[data-o="${c.id}"]`); if (o) o.textContent = fmtCtrl(c, p[c.id]); });
        let r;
        try { r = lab.update(p); } catch (err) { r = { svg: '', out: '<span class="warnline">参数超出模型范围：' + esc(err.message) + '</span>' }; }
        $('.lab-svg', box).innerHTML = r.svg || '';
        $('.lab-out', box).innerHTML = r.out || '';
      };
      $$('input,select', box).forEach(el => el.addEventListener('input', read));
      read();
    });
  }
  function ctrlHtml(c, uid) {
    const id = uid + '-' + c.id;
    if (c.type === 'select') return `<label for="${id}">${esc(c.label)}</label><select id="${id}" data-c="${c.id}">${c.options.map(o => `<option value="${esc(o[0])}" ${o[0] === c.value ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    return `<label for="${id}">${esc(c.label)} <output data-o="${c.id}"></output></label><input id="${id}" type="range" data-c="${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}">`;
  }
  function fmtCtrl(c, v) {
    if (c.type === 'select') return '';
    const x = c.map ? c.map(v) : v;
    const d = c.digits !== undefined ? c.digits : (String(c.step).includes('.') ? Math.min(3, String(c.step).split('.')[1].length) : 0);
    return (typeof x === 'number' ? x.toFixed(d) : String(x)) + (c.unit ? ' ' + c.unit : '');
  }

  function viewMe() {
    const favSec = S.fav.filter(x => SEC_IDS.has(x)), favEx = S.fav.filter(x => EX_IDS.has(x));
    const wrong = Object.keys(S.ex).filter(k => S.ex[k] === 'wrong');
    main.innerHTML = `<h1>收藏与学习记录</h1>
      <h2>收藏的专题（${favSec.length}）</h2>${favSec.length ? '<ul>' + favSec.map(s => `<li><a href="#/ch/${s.split('-')[0]}/${s}">${esc(sectionTitle(s))}</a></li>`).join('') + '</ul>' : '<p class="muted">在讲义小节标题旁点 ☆ 收藏。</p>'}
      <h2>收藏的题（${favEx.length}）与错题（${wrong.length}）</h2><p><a class="btn" href="#/ex/set/_fav">打开收藏题</a> <a class="btn" href="#/ex/set/_wrong">打开错题本</a></p>
      <h2>备份</h2><p>记录保存在本浏览器的 localStorage 中，换浏览器或清除数据会丢失。可导出 JSON 文件备份，之后再导入。</p>
      <div class="toolbar"><button class="btn primary" id="exp">导出学习记录</button><label class="btn" for="imp">导入学习记录</label><input type="file" id="imp" accept="application/json,.json" hidden><button class="btn" id="clr">清空全部记录</button></div><p id="me-msg" class="muted"></p>`;
    $('#exp').onclick = () => {
      const blob = new Blob([JSON.stringify(Object.assign({ app: 'analog-circuit-review-2', exported: new Date().toISOString() }, S), null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '模拟电路复习-学习记录.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('#imp').onchange = ev => {
      const f = ev.target.files[0]; if (!f) return;
      if (f.size > 1e6) { $('#me-msg').textContent = '文件过大，已拒绝。'; return; }
      f.text().then(t => { let o; try { o = JSON.parse(t); } catch (e) { $('#me-msg').textContent = '不是有效的 JSON，未导入。'; return; } S = clean(o); save(); applyFont(); viewMe(); renderNav(); $('#me-msg').textContent = '已导入（未知条目已过滤）。'; });
    };
    $('#clr').onclick = () => { if (confirm('清空全部学习记录？此操作不能撤销（建议先导出）。')) { S = blank(); save(); applyFont(); viewMe(); renderNav(); } };
    setToc([]);
  }

  function viewAbout() {
    main.innerHTML = `<h1>来源与说明</h1>
      <ul><li><b>主线</b>：课堂讲义 chap_6m 二极管、chap_7m 三极管、chap_8m 场效应晶体管（含补充）、chap_10m 频率响应、chap_11m 反馈（含补充）、chap_12m 功率放大器。图注中的页码是 PDF 物理页序（从 1 开始）。</li>
      <li><b>补充</b>：MIT 讲义（第 6、7、8、10、11、12 章）只用来补推导和条件，标注为“补充”。</li>
      <li><b>习题</b>：<a href="https://bc0403.github.io/EC2024/" target="_blank" rel="noopener noreferrer">EC2024 网站</a> Microelectronic Circuits 部分（MIT License © 2022 bc0403），题面、题图与原参考答案照录；“本站分步解析 / 核对结论”为本站独立推导。网站未标年份的题目，本站不推断考试年份。</li>
      <li><b>范围</b>：不含 LTspice 等仿真软件的使用教程。运放（第 9 章）在上半学期已讲，这里只保留其习题供综合练习。</li>
      <li><b>互动</b>：均为理想化解析模型，用来看趋势和条件，不能代替真实器件数据手册。</li>
      <li><b>离线</b>：本页面是单个 HTML 文件，图片、字体和脚本都已内嵌，断网可用。只有“原题页”链接需要联网。</li></ul>
      <p class="muted">构建日期 ${esc(D.meta.built)} · ${D.meta.counts.chapters} 章 · ${D.meta.counts.sections} 个专题 · ${D.meta.counts.figures} 幅讲义图 · ${D.meta.counts.exercises} 道习题 · ${D.meta.counts.formulas} 组公式 · ${D.meta.counts.quizzes} 道快测。KaTeX 0.16.11（MIT License）。</p>`;
    setToc([]);
  }
  function viewNotFound() { main.innerHTML = '<h1>没找到这个页面</h1><p><a href="#/home">回到学习导览</a></p>'; setToc([]); }

  /* ---------- 路由 ---------- */
  let curView = '';
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let p = el.parentElement; while (p) { if (p.tagName === 'DETAILS') p.open = true; p = p.parentElement; }
    requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }
  function route() {
    const h = location.hash || '#/home';
    const [path, q] = h.slice(2).split('?');
    const seg = path.split('/');
    const view = seg[0] + '/' + (seg[1] || '');
    // 同一视图内锚点跳转：不重绘，避免重置滑块
    if (view === curView && seg[0] === 'ch' && seg[2] && document.getElementById(seg[2])) { scrollToId(seg[2]); renderNav(); return; }
    curView = view;
    switch (seg[0]) {
      case 'home': case '': viewHome(); break;
      case 'ch': viewChapter(seg[1], seg[2]); break;
      case 'ex':
        if (!seg[1]) viewExOverview();
        else if (seg[1] === 'set') viewExSet(seg[2]);
        else { const e = D.exercises.find(x => x.id === seg[1]); if (e) { curView = 'ex/set'; viewExSet(e.set, e.id); } else viewNotFound(); }
        break;
      case 'formulas': viewFormulas(seg[1], q); break;
      case 'quiz': viewQuiz(); break;
      case 'labs': viewLabs(seg[1]); break;
      case 'me': viewMe(); break;
      case 'about': viewAbout(); break;
      default: viewNotFound();
    }
    fillImages(main); renderNav(); scrollSpy();
    if (!seg[2] && !(seg[0] === 'ex' && seg[1] && seg[1] !== 'set') && !(seg[0] === 'formulas' && seg[1]) && !(seg[0] === 'labs' && seg[1])) window.scrollTo(0, 0);
    if (seg[0] !== 'home') { S.last = h; save(); }
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);

  /* ---------- 搜索 ---------- */
  const sbox = $('#search'), sres = $('#search-results');
  // 同一术语的不同译名统一后再匹配（如 密勒/米勒）
  const SYN = [[/米勒/g, '密勒'], [/厄利|厄尔利/g, 'early'], [/达林顿/g, '复合管'], [/共源共栅/g, 'cascode']];
  const norm = s => SYN.reduce((t, [a, b]) => t.replace(a, b), s.toLowerCase().replace(/\s+/g, ''));
  const IDX = D.search.map(r => Object.assign({ n: norm(r.title + ' ' + r.text), nt: norm(r.title) }, r));
  let hits = [], hi = 0;
  function doSearch() {
    const q = sbox.value.trim();
    if (!q) { sres.hidden = true; return; }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean).map(norm);
    hits = IDX.map(r => { let sc = 0; for (const t of terms) { const i = r.n.indexOf(t); if (i < 0) return null; sc += (r.nt.includes(t) ? 10 : 1) + (r.id.toLowerCase() === t ? 50 : 0); } return [sc, r]; })
      .filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 30).map(x => x[1]);
    hi = 0;
    sres.innerHTML = hits.length ? hits.map((r, i) => `<a href="${r.route}" class="${i === 0 ? 'active' : ''}"><span class="st">${r.t}</span>${mark(r.title, terms)}<span class="sx">${snippet(r.text, terms)}</span></a>`).join('') : '<div style="padding:10px" class="muted">没有找到。试试更短的关键词或题号，如 CH07-KP3。</div>';
    sres.hidden = false;
  }
  function snippet(t, terms) {
    const low = t.toLowerCase(); let i = -1;
    for (const x of terms) { i = low.indexOf(x); if (i >= 0) break; }
    const s = Math.max(0, i - 30);
    return mark((s ? '…' : '') + t.slice(s, s + 110), terms);
  }
  function mark(t, terms) { let h = esc(t); for (const x of terms) { if (!x) continue; h = h.replace(new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); } return h; }
  sbox.addEventListener('input', doSearch);
  sbox.addEventListener('keydown', e => {
    const as = $$('a', sres);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; as.forEach((a, i) => a.classList.toggle('active', i === hi)); as[hi] && as[hi].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && as[hi]) { location.hash = as[hi].getAttribute('href'); sres.hidden = true; sbox.blur(); }
    else if (e.key === 'Escape') { sres.hidden = true; sbox.blur(); }
  });
  sres.addEventListener('click', e => { if (e.target.closest('a')) { sres.hidden = true; } });
  document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) sres.hidden = true; });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); sbox.focus(); sbox.select(); } });

  /* ---------- 打印 ---------- */
  function expandAll(root) { $$('details', root).forEach(d => (d.open = true)); }
  function printCurrent() { expandAll(main); window.print(); }
  function printAll() {
    const box = $('#print-all');
    box.innerHTML = D.chapters.map(c => `<section class="chapter"><h1>${esc(c.title)}</h1>${c.html}</section>`).join('');
    fillImages(box); expandAll(box);
    $$('.lab-mount', box).forEach(m => (m.innerHTML = '<p class="muted">［互动实验：请在网页中使用］</p>'));
    document.body.classList.add('printing-all');
    window.print();
  }
  window.addEventListener('beforeprint', () => { if (!document.body.classList.contains('printing-all')) expandAll(main); });
  window.addEventListener('afterprint', () => { document.body.classList.remove('printing-all'); $('#print-all').innerHTML = ''; });
  $('#print-btn').onclick = printCurrent;

  window.__APP__ = { D, state: () => S, clean, route };
  route();
})();
