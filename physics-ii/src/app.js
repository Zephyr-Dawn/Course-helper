/* eslint-disable no-var */
/**
 * Main application router, state manager, search & view renderer for 大学物理甲-II 互动复习.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'physics_ii_review_state_v1';
  var DATA = JSON.parse(document.getElementById('course-data').textContent || '{}');
  var IMAGES = JSON.parse(document.getElementById('image-data').textContent || '{}');

  var CHAPTER_MAP = {};
  var SECTION_MAP = {};
  var EXERCISE_MAP = {};
  (DATA.chapters || []).forEach(function (ch) {
    CHAPTER_MAP[ch.id] = ch;
    (ch.sections || []).forEach(function (s) {
      SECTION_MAP[s.id] = { chId: ch.id, chTitle: ch.title, sec: s };
    });
  });
  (DATA.exercises || []).forEach(function (ex) {
    EXERCISE_MAP[ex.id] = ex;
  });

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return {
        theme: parsed.theme || 'light',
        doneSections: parsed.doneSections || {},
        bookmarks: parsed.bookmarks || {},
        mistakes: parsed.mistakes || {},
        quizAnswers: parsed.quizAnswers || {}
      };
    } catch (_) {
      return { theme: 'light', doneSections: {}, bookmarks: {}, mistakes: {}, quizAnswers: {} };
    }
  }

  var state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* ignore quota */ }
  }

  function applyTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    saveState();
  }
  applyTheme(state.theme);

  function hydrateImages(scope) {
    (scope || document).querySelectorAll('img[data-asset]').forEach(function (img) {
      var key = img.getAttribute('data-asset');
      if (IMAGES[key]) {
        img.src = IMAGES[key];
      }
    });
  }

  function renderExCardHtml(ex) {
    var imgHtml = '';
    if (ex.questionImage && IMAGES[ex.questionImage]) {
      imgHtml = '<div class="ex-fig-wrap"><img data-asset="' + ex.questionImage + '" src="' + IMAGES[ex.questionImage] + '" alt="' + (ex.rawTitle || ex.id) + '" loading="lazy" /></div>';
    }
    var hintsHtml = (ex.hints && ex.hints.length)
      ? '<details class="ex-details"><summary>💡 审题提示与切入点 (' + ex.hints.length + ' 条)</summary><ol>' +
        ex.hints.map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ol></details>'
      : '';
    var stepsHtml = (ex.steps && ex.steps.length)
      ? '<ol class="ex-steps">' + ex.steps.map(function (st) { return '<li>' + st + '</li>'; }).join('') + '</ol>'
      : '';
    var noteHtml = ex.note
      ? '<div class="callout callout-warn"><div class="callout-title"><span class="callout-badge">勘误/辨析</span>原课件对照与易错提醒</div><div class="callout-body">' + ex.note + '</div></div>'
      : '';
    var secInfo = SECTION_MAP[ex.section];
    var secLink = secInfo ? '<a href="#' + secInfo.chId + '/' + ex.section + '" class="ex-sec-link">关联小节：' + secInfo.sec.rawTitle + '</a>' : '';
    return (
      '<article class="ex-card" id="ex-' + ex.id + '">' +
      '<div class="ex-head">' +
      '<span class="ex-badge">' + ex.id + '</span>' +
      '<strong class="ex-title">' + ex.title + '</strong>' +
      '<span class="fig-src">' + (ex.source || '') + ' · 难度 ' + '★'.repeat(ex.difficulty || 2) + '</span>' +
      secLink +
      '</div>' +
      '<div class="ex-problem">' + ex.problem + '</div>' +
      imgHtml +
      hintsHtml +
      '<details class="ex-details"><summary>📖 展开独立分步解析与答案验算</summary>' +
      '<div class="ex-solution">' + stepsHtml +
      '<div class="callout callout-tip"><div class="callout-title"><span class="callout-badge">结论</span>最终答案</div><div class="callout-body">' + ex.answer + '</div></div>' +
      '<div class="callout callout-check"><div class="callout-title"><span class="callout-badge">验算</span>量纲与极限自检</div><div class="callout-body">' + ex.check + '</div></div>' +
      noteHtml +
      '</div></details>' +
      '</article>'
    );
  }

  function renderFormulaCardHtml(fm, idx) {
    var secInfo = SECTION_MAP[fm.section];
    var linkHtml = secInfo ? '<a href="#' + secInfo.chId + '/' + fm.section + '">跳转：' + secInfo.sec.rawTitle + ' →</a>' : '';
    return (
      '<article class="formula-card" data-fm-idx="' + idx + '">' +
      '<div class="ex-head"><span class="fig-id">' + fm.chLabel + '</span><strong>' + fm.name + '</strong><span style="margin-left:auto;font-size:0.82rem">' + linkHtml + '</span></div>' +
      '<div class="math-block">' + fm.texHtml + '</div>' +
      '<div class="formula-meta">' +
      '<div><strong>🎯 核心用途：</strong>' + fm.use + '</div>' +
      '<div><strong>⚖️ 适用条件：</strong>' + fm.conditions + '</div>' +
      '<div><strong>⚠️ 高频易错：</strong>' + fm.pitfall + '</div>' +
      '</div></article>'
    );
  }

  function renderQuizCardHtml(q) {
    var secInfo = SECTION_MAP[q.section];
    var linkHtml = secInfo ? '<a href="#' + secInfo.chId + '/' + q.section + '">回看：' + secInfo.sec.rawTitle + '</a>' : '';
    var saved = state.quizAnswers[q.id];
    var optsHtml = (q.options || []).map(function (opt, i) {
      var cls = 'quiz-opt';
      if (saved !== undefined) {
        if (i === q.answer) cls += ' correct';
        else if (i === saved && saved !== q.answer) cls += ' wrong';
      }
      return '<button type="button" class="' + cls + '" data-qid="' + q.id + '" data-opt="' + i + '">' + String.fromCharCode(65 + i) + '. ' + opt + '</button>';
    }).join('');
    var expCls = saved !== undefined ? 'quiz-explain visible' : 'quiz-explain';
    return (
      '<article class="quiz-card" id="quiz-' + q.id + '">' +
      '<div class="ex-head"><span class="ex-badge">' + q.id + '</span><span class="fig-src">' + linkHtml + '</span></div>' +
      '<div class="quiz-q" style="font-weight:600;margin-bottom:0.55rem">' + q.q + '</div>' +
      '<div class="quiz-opts">' + optsHtml + '</div>' +
      '<div class="' + expCls + '" id="qexp-' + q.id + '"><strong>解析：</strong>' + q.explain + '</div>' +
      '</article>'
    );
  }

  function renderSidebar(activeRoute) {
    var totalSecs = Object.keys(SECTION_MAP).length;
    var doneCount = Object.keys(state.doneSections).filter(function (k) { return SECTION_MAP[k] && state.doneSections[k]; }).length;
    var pct = totalSecs ? Math.round((doneCount / totalSecs) * 100) : 0;
    var chLinks = (DATA.chapters || []).map(function (ch) {
      var chDone = (ch.sections || []).filter(function (s) { return state.doneSections[s.id]; }).length;
      var cls = activeRoute === ch.id ? 'side-link active' : 'side-link';
      return '<a href="#' + ch.id + '" class="' + cls + '"><span>' + ch.shortTitle + '</span><span style="font-size:0.76rem;color:var(--text-muted)">' + chDone + '/' + ch.sections.length + '</span></a>';
    }).join('');

    var html =
      '<div class="side-group">' +
      '<div class="side-group-title">学习进度 (' + doneCount + '/' + totalSecs + ' · ' + pct + '%)</div>' +
      '<div style="height:8px;background:var(--bg-elev);border-radius:4px;overflow:hidden;margin-bottom:0.6rem"><div style="width:' + pct + '%;height:100%;background:var(--accent)"></div></div>' +
      '<a href="#home" class="side-link' + (activeRoute === 'home' ? ' active' : '') + '"><span>🏠 课程首页与路线图</span></a>' +
      '</div>' +
      '<div class="side-group"><div class="side-group-title">期中电磁学讲义 (第9～14章)</div>' + chLinks + '</div>' +
      '<div class="side-group"><div class="side-group-title">专项强化与工具</div>' +
      '<a href="#exercises" class="side-link' + (activeRoute === 'exercises' ? ' active' : '') + '"><span>📝 课堂例题与练习精解</span><span>' + (DATA.exercises || []).length + '</span></a>' +
      '<a href="#formulas" class="side-link' + (activeRoute === 'formulas' ? ' active' : '') + '"><span>📐 重点公式速查卡片</span><span>' + (DATA.formulas || []).length + '</span></a>' +
      '<a href="#labs" class="side-link' + (activeRoute === 'labs' ? ' active' : '') + '"><span>🧪 12个互动物理实验室</span><span>12</span></a>' +
      '<a href="#quiz" class="side-link' + (activeRoute === 'quiz' ? ' active' : '') + '"><span>⚡ 概念快测与错题本</span><span>' + (DATA.quizzes || []).length + '</span></a>' +
      '<button type="button" id="print-all-btn" class="btn-ghost" style="width:100%;margin-top:0.5rem">🖨️ 打印全部章节讲义</button>' +
      '</div>';
    document.getElementById('sidebar-content').innerHTML = html;
    var printAllBtn = document.getElementById('print-all-btn');
    if (printAllBtn) printAllBtn.addEventListener('click', printAllChapters);
  }

  function renderHomeView(root) {
    var chCards = (DATA.chapters || []).map(function (ch) {
      var exCount = (DATA.exercises || []).filter(function (e) { return e.ch === ch.id; }).length;
      var fmCount = (DATA.formulas || []).filter(function (f) { return f.ch === ch.id; }).length;
      return (
        '<a href="#' + ch.id + '" class="ch-overview-card" style="text-decoration:none;color:inherit">' +
        '<div><span class="fig-id">' + ch.badge + '</span><h3 style="margin:0.45rem 0 0.35rem;font-size:1.12rem">' + ch.title + '</h3>' +
        '<p style="margin:0 0 0.8rem;font-size:0.88rem;color:var(--text-secondary)">' + ch.subtitle + '</p></div>' +
        '<div style="font-size:0.8rem;color:var(--text-muted);display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:0.55rem">' +
        '<span>' + ch.sections.length + ' 讲义小节 · ' + exCount + ' 道例题</span><span>' + fmCount + ' 组核心公式 →</span></div></a>'
      );
    }).join('');

    root.innerHTML =
      '<section class="hero-card">' +
      '<span class="brand-badge">ZJU 大学物理甲-II · 仅进行到期中内容，历年题待补</span>' +
      '<h1 class="hero-title" style="margin-top:0.5rem">大学物理甲-II（电磁学 · 期中复习讲义）</h1>' +
      '<p class="hero-sub"><strong>进度说明：当前仅进行到期中内容（第 9～14 章 / 第 1～14 讲，502 页课件全覆盖），期末章节与历年题待补。</strong>涵盖全部物理定义、定理推导、适用条件、原版配图、60 道课堂例题/思考题独立复算解析、12 个实时物理仿真实验与 40 组重点公式速查。</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.6rem">' +
      '<a href="#ch09" class="btn-primary" style="text-decoration:none">🚀 从第 9 章开始系统复习</a>' +
      '<a href="#exercises" class="btn-ghost" style="text-decoration:none">📝 浏览全部课堂例题精解 (' + (DATA.exercises || []).length + ' 题)</a>' +
      '<a href="#formulas" class="btn-ghost" style="text-decoration:none">📐 考前重点公式速查 (' + (DATA.formulas || []).length + ' 组)</a>' +
      '<a href="#labs" class="btn-ghost" style="text-decoration:none">🧪 进入互动物理实验室 (12 组)</a>' +
      '</div></section>' +
      '<h2 style="margin:1.4rem 0 0.6rem;font-size:1.25rem">📚 期中复习章节导航（第 9～14 章 / 第 1～14 讲）</h2>' +
      '<div class="chapter-grid">' + chCards + '</div>' +
      '<section class="section-card">' +
      '<div class="sec-header"><h3 class="sec-title">🗺️ 课程总体架构与后续内容扩展路线图（预留接口已就绪）</h3></div>' +
      '<p style="margin-top:0;color:var(--text-secondary)">本系统采用模块化单文件编译架构（<code>physics-ii/</code> 源码工程），当前已完成<strong>期中及之前全部内容（第 1～14 讲 / PDF p1–p502）</strong>，并为期末阶段课件与历年真题预留了无缝扩展槽位：</p>' +
      '<table><thead><tr><th>模块阶段</th><th>章节 / 专题范围</th><th>状态与数据源</th></tr></thead><tbody>' +
      '<tr><td><strong>第一模块：电磁学（期中范围）</strong></td><td>第9章 静电场 · 第10章 导体与电介质 · 第11章 稳恒电流 · 第12章 稳恒磁场 · 第13章 磁介质 · 第14章 电磁感应</td><td><span class="fig-id">✅ 已完成 (502页PDF全覆盖)</span></td></tr>' +
      '<tr><td><strong>第二模块：电磁场与电磁波（待补充）</strong></td><td>第15章 位移电流、麦克斯韦方程组、电磁波的产生与传播、坡印廷矢量</td><td><span class="fig-src">⏳ 预留扩展槽 (ch15)</span></td></tr>' +
      '<tr><td><strong>第三模块：光学（几何光学与波动光学）</strong></td><td>费马原理、薄透镜成像、杨氏干涉、薄膜等厚/等倾干涉、单缝衍射、光栅衍射、偏振</td><td><span class="fig-src">⏳ 预留扩展槽 (ch16–ch18)</span></td></tr>' +
      '<tr><td><strong>第四模块：量子物理基础與历年真题卷</strong></td><td>黑体辐射、光电效应、康普顿散射、德布罗意波、薛定谔方程 + 期中/期末历年真题精解</td><td><span class="fig-src">⏳ 预留扩展槽 (exams)</span></td></tr>' +
      '</tbody></table></section>';

    document.getElementById('toc-content').innerHTML =
      '<div class="side-group-title">快速入口</div>' +
      '<a href="#ch09" class="toc-link">第9章 真空中的静电场</a>' +
      '<a href="#ch10" class="toc-link">第10章 导体和电介质</a>' +
      '<a href="#ch11" class="toc-link">第11章 稳恒电流</a>' +
      '<a href="#ch12" class="toc-link">第12章 稳恒磁场</a>' +
      '<a href="#ch13" class="toc-link">第13章 磁场中的磁介质</a>' +
      '<a href="#ch14" class="toc-link">第14章 电磁感应</a>';
  }

  function renderChapterView(root, chId, targetSecId) {
    var ch = CHAPTER_MAP[chId];
    if (!ch) { renderHomeView(root); return; }

    var secsHtml = (ch.sections || []).map(function (s) {
      var isDone = Boolean(state.doneSections[s.id]);
      return (
        '<section class="section-card" id="sec-' + s.id + '" data-sec-id="' + s.id + '">' +
        '<div class="sec-header">' +
        '<h2 class="sec-title">' + s.title + '</h2>' +
        '<div class="sec-actions">' +
        '<button type="button" class="btn-ghost sec-done-btn" data-sec="' + s.id + '">' + (isDone ? '✅ 已掌握' : '☐ 标记掌握') + '</button>' +
        '</div></div>' +
        '<div class="sec-body">' + s.html + '</div>' +
        '</section>'
      );
    }).join('');

    var chExs = (DATA.exercises || []).filter(function (e) { return e.ch === chId; });
    var chFms = (DATA.formulas || []).filter(function (f) { return f.ch === chId; });
    var chQzs = (DATA.quizzes || []).filter(function (q) { return q.ch === chId; });
    var unmountedExs = chExs.filter(function (e) {
      return secsHtml.indexOf('data-ex="' + e.id + '"') === -1;
    });
    var exBottomBody = unmountedExs.length
      ? unmountedExs.map(renderExCardHtml).join('')
      : '<p style="margin:0;color:var(--text-secondary)">本章全部 ' + chExs.length + ' 道典型例题已随文嵌入各讲义小节中，您也可前往 <a href="#exercises/' + chId + '">📝 精选习题库 (' + ch.shortTitle + ' 专项视图)</a> 集中练习。</p>';

    root.innerHTML =
      '<section class="hero-card">' +
      '<span class="fig-id">' + ch.badge + ' · ' + ch.pageRange + '</span>' +
      '<h1 class="hero-title" style="margin-top:0.4rem">' + ch.title + '</h1>' +
      '<p class="hero-sub">' + ch.subtitle + '</p>' +
      (ch.introHtml ? '<div class="ch-intro">' + ch.introHtml + '</div>' : '') +
      '</section>' +
      secsHtml +
      '<section class="section-card" id="sec-' + chId + '-formulas">' +
      '<div class="sec-header"><h2 class="sec-title">📐 本章重点公式速查 (' + chFms.length + ' 组)</h2></div>' +
      '<div class="formula-grid">' + chFms.map(renderFormulaCardHtml).join('') + '</div></section>' +
      '<section class="section-card" id="sec-' + chId + '-exercises">' +
      '<div class="sec-header"><h2 class="sec-title">📝 本章课堂例题与思考题全解 (' + chExs.length + ' 题)</h2></div>' +
      exBottomBody + '</section>' +
      '<section class="section-card" id="sec-' + chId + '-quiz">' +
      '<div class="sec-header"><h2 class="sec-title">⚡ 本章概念快测 (' + chQzs.length + ' 题)</h2></div>' +
      chQzs.map(renderQuizCardHtml).join('') + '</section>';

    // Hydrate inline exercise mounts {{ex:ID}} if any
    root.querySelectorAll('.inline-ex-mount[data-ex]').forEach(function (el) {
      var ex = EXERCISE_MAP[el.getAttribute('data-ex')];
      if (ex) el.outerHTML = renderExCardHtml(ex);
    });

    hydrateImages(root);
    if (window.mountAllLabs) window.mountAllLabs(root);
    bindSectionAndQuizEvents(root);

    // Populate right TOC rail
    var tocHtml = '<div class="side-group-title">本章小节导航</div>' +
      (ch.sections || []).map(function (s) {
        return '<a href="#' + chId + '/' + s.id + '" class="toc-link" data-toc="' + s.id + '">' + s.rawTitle + '</a>';
      }).join('') +
      '<a href="#' + chId + '/sec-' + chId + '-formulas" class="toc-link">📐 本章重点公式</a>' +
      '<a href="#' + chId + '/sec-' + chId + '-exercises" class="toc-link">📝 本章例题全解</a>' +
      '<a href="#' + chId + '/sec-' + chId + '-quiz" class="toc-link">⚡ 本章概念快测</a>';
    document.getElementById('toc-content').innerHTML = tocHtml;

    if (targetSecId) {
      var el = document.getElementById('sec-' + targetSecId) || document.getElementById(targetSecId);
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
    } else {
      window.scrollTo(0, 0);
    }
  }

  function renderFilterPills(activeCh, routePrefix) {
    var items = [{ id: 'all', label: '全部章节' }].concat((DATA.chapters || []).map(function (c) {
      return { id: c.id, label: c.shortTitle };
    }));
    return '<div class="lab-modes" style="margin-bottom:1.1rem">' + items.map(function (it) {
      var cls = it.id === activeCh ? 'lab-mode-btn active' : 'lab-mode-btn';
      return '<a href="#' + routePrefix + (it.id === 'all' ? '' : '/' + it.id) + '" class="' + cls + '" style="text-decoration:none">' + it.label + '</a>';
    }).join('') + '</div>';
  }

  function renderExercisesView(root, filterCh) {
    var ch = filterCh || 'all';
    var list = (DATA.exercises || []).filter(function (e) { return ch === 'all' || e.ch === ch; });
    root.innerHTML =
      '<section class="hero-card">' +
      '<span class="fig-id">精选习题库 · 课件例题与思考题独立精解</span>' +
      '<h1 class="hero-title" style="margin-top:0.4rem">课堂例题、练习与思考题全解 (' + list.length + ' 题)</h1>' +
      '<p class="hero-sub">当前阶段暂无单列历年真题卷；本模块完整收录第 9～14 章 PDF 课件内的全部典型例题、随堂练习与深度思考题，每道题均配有原题配图、审题提示、独立分步推导、量纲极限验算及原课件对照勘误。</p>' +
      renderFilterPills(ch, 'exercises') +
      '</section>' +
      list.map(renderExCardHtml).join('');
    hydrateImages(root);
    window.scrollTo(0, 0);
  }

  function renderFormulasView(root, filterCh) {
    var ch = filterCh || 'all';
    var list = (DATA.formulas || []).filter(function (f) { return ch === 'all' || f.ch === ch; });
    root.innerHTML =
      '<section class="hero-card">' +
      '<span class="fig-id">人工精选 · 重点公式速查</span>' +
      '<h1 class="hero-title" style="margin-top:0.4rem">第 9～14 章核心公式与适用边界卡片 (' + list.length + ' 组)</h1>' +
      '<p class="hero-sub">拒绝机械堆砌中间推导式：每张卡片人工提炼核心定律、物理用途、严格适用条件（对称性/介质线性/稳恒性）与考场高频陷阱。</p>' +
      renderFilterPills(ch, 'formulas') +
      '</section>' +
      '<div class="formula-grid">' + list.map(renderFormulaCardHtml).join('') + '</div>';
    window.scrollTo(0, 0);
  }

  function renderLabsView(root, filterCh) {
    var ch = filterCh || 'all';
    var specs = (window.LAB_SPECS || []).filter(function (sp) { return ch === 'all' || sp.ch === ch; });
    root.innerHTML =
      '<section class="hero-card">' +
      '<span class="fig-id">12 组实时物理仿真实验</span>' +
      '<h1 class="hero-title" style="margin-top:0.4rem">大学物理甲-II 互动物理实验室</h1>' +
      '<p class="hero-sub">拖动滑块实时改变电荷、介电常数、桥臂电阻、螺线管匝数或磁导率，直观检验远场近似、高斯分布、惠斯通电桥平衡与互感耦合定律。</p>' +
      renderFilterPills(ch, 'labs') +
      '</section>' +
      specs.map(function (sp) { return '<div class="lab-mount" data-lab="' + sp.id + '"></div>'; }).join('');
    if (window.mountAllLabs) window.mountAllLabs(root);
    window.scrollTo(0, 0);
  }

  function renderQuizView(root, filterCh) {
    var ch = filterCh || 'all';
    var list = (DATA.quizzes || []).filter(function (q) {
      if (ch === 'mistakes') return Boolean(state.mistakes[q.id]);
      return ch === 'all' || q.ch === ch;
    });
    var mistakeCount = Object.keys(state.mistakes).filter(function (k) { return state.mistakes[k]; }).length;
    root.innerHTML =
      '<section class="hero-card">' +
      '<span class="fig-id">概念辨析与错题追踪</span>' +
      '<h1 class="hero-title" style="margin-top:0.4rem">电磁学核心概念快测 (' + list.length + ' 题)</h1>' +
      '<p class="hero-sub">针对静电场高斯定理、导体接地、介质边界条件、安培环路定律、铁磁磁滞与动生/感生电动势的高频概念辨析。</p>' +
      renderFilterPills(ch, 'quiz') +
      '<div style="display:flex;gap:0.6rem"><a href="#quiz/mistakes" class="btn-ghost" style="text-decoration:none">📕 仅看错题本 (' + mistakeCount + ')</a>' +
      '<button type="button" id="reset-quiz-btn" class="btn-ghost">🔄 重置快测作答记录</button></div>' +
      '</section>' +
      (list.length ? list.map(renderQuizCardHtml).join('') : '<div class="section-card">当前筛选下暂无题目。</div>');
    bindSectionAndQuizEvents(root);
    var resetBtn = document.getElementById('reset-quiz-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.quizAnswers = {};
        state.mistakes = {};
        saveState();
        renderQuizView(root, ch);
      });
    }
    window.scrollTo(0, 0);
  }

  function bindSectionAndQuizEvents(root) {
    root.querySelectorAll('.sec-done-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var secId = btn.getAttribute('data-sec');
        state.doneSections[secId] = !state.doneSections[secId];
        saveState();
        btn.textContent = state.doneSections[secId] ? '✅ 已掌握' : '☐ 标记掌握';
        renderSidebar(currentRouteBase());
      });
    });

    root.querySelectorAll('.quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qid = btn.getAttribute('data-qid');
        var optIdx = parseInt(btn.getAttribute('data-opt'), 10);
        var qObj = (DATA.quizzes || []).find(function (q) { return q.id === qid; });
        if (!qObj) return;
        state.quizAnswers[qid] = optIdx;
        if (optIdx !== qObj.answer) state.mistakes[qid] = true;
        else delete state.mistakes[qid];
        saveState();
        var card = btn.closest('.quiz-card');
        if (card) {
          card.outerHTML = renderQuizCardHtml(qObj);
          bindSectionAndQuizEvents(root);
        }
      });
    });
  }

  function printAllChapters() {
    var root = document.getElementById('view-root');
    var allHtml = (DATA.chapters || []).map(function (ch) {
      return '<section class="hero-card"><h1>' + ch.title + '</h1><p>' + ch.subtitle + '</p></section>' +
        (ch.sections || []).map(function (s) {
          return '<section class="section-card"><h2>' + s.title + '</h2>' + s.html + '</section>';
        }).join('');
    }).join('');
    root.innerHTML = allHtml;
    hydrateImages(root);
    setTimeout(function () { window.print(); }, 150);
  }

  function currentRouteBase() {
    var hash = (window.location.hash || '#home').slice(1);
    return hash.split('/')[0] || 'home';
  }

  function handleRoute() {
    var raw = (window.location.hash || '#home').slice(1);
    var parts = raw.split('/');
    var base = parts[0] || 'home';
    var sub = parts[1] || '';
    var root = document.getElementById('view-root');

    document.querySelectorAll('.nav-pill').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === base);
    });
    renderSidebar(base);

    if (CHAPTER_MAP[base]) renderChapterView(root, base, sub);
    else if (base === 'exercises') renderExercisesView(root, sub || 'all');
    else if (base === 'formulas') renderFormulasView(root, sub || 'all');
    else if (base === 'labs') renderLabsView(root, sub || 'all');
    else if (base === 'quiz') renderQuizView(root, sub || 'all');
    else renderHomeView(root);
  }

  // Global UI bindings: sidebar toggle, theme toggle, print, image zoom, search
  document.getElementById('sidebar-toggle').addEventListener('click', function () {
    var layout = document.getElementById('app-layout');
    var sb = document.getElementById('sidebar');
    if (window.innerWidth <= 860) sb.classList.toggle('mobile-open');
    else layout.classList.toggle('sidebar-collapsed');
  });

  document.getElementById('theme-toggle').addEventListener('click', function () {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('print-page-btn').addEventListener('click', function () { window.print(); });

  var imgDialog = document.getElementById('img-dialog');
  document.addEventListener('click', function (e) {
    var wrap = e.target.closest('.lecture-fig-img-wrap, .ex-fig-wrap');
    if (wrap) {
      var img = wrap.querySelector('img');
      if (img && img.src && imgDialog && imgDialog.showModal) {
        document.getElementById('img-dialog-target').src = img.src;
        document.getElementById('img-dialog-caption').textContent = img.alt || '';
        imgDialog.showModal();
      }
    }
  });
  document.getElementById('img-dialog-close').addEventListener('click', function () { imgDialog.close(); });

  var searchDialog = document.getElementById('search-dialog');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  function openSearch() {
    if (searchDialog && searchDialog.showModal) {
      searchDialog.showModal();
      searchInput.focus();
      runSearch(searchInput.value);
    }
  }
  function runSearch(q) {
    var kw = (q || '').trim().toLowerCase();
    var items = DATA.searchIndex || [];
    var hits = !kw ? items.slice(0, 18) : items.filter(function (it) {
      return it.title.toLowerCase().indexOf(kw) !== -1 || it.text.toLowerCase().indexOf(kw) !== -1;
    }).slice(0, 25);
    searchResults.innerHTML = hits.length ? hits.map(function (it) {
      return '<a href="' + it.href + '" class="search-item"><strong>[' + it.kind + '] ' + it.title + '</strong><div style="font-size:0.82rem;color:var(--text-secondary)">' + it.snippet + '</div></a>';
    }).join('') : '<div style="padding:0.8rem;color:var(--text-muted)">未找到匹配内容</div>';
  }
  document.getElementById('search-btn').addEventListener('click', openSearch);
  document.getElementById('search-close').addEventListener('click', function () { searchDialog.close(); });
  searchInput.addEventListener('input', function () { runSearch(searchInput.value); });
  searchResults.addEventListener('click', function (e) {
    if (e.target.closest('.search-item')) searchDialog.close();
  });
  window.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  });
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
})();
