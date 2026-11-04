(function(){
  'use strict';
  const D=JSON.parse(document.getElementById('course-data').textContent),M=window.CircuitMath,L=window.CircuitLabs;
  const $=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chIds=D.chapters.map(c=>c.id),exIds=D.exercises.map(e=>e.id),sections=D.chapters.flatMap(c=>c.sections),secIds=sections.map(s=>s.id);
  const KEY='ee-circuits-review-v1';let state;try{state=M.sanitizeState(JSON.parse(localStorage.getItem(KEY)),chIds,exIds,secIds);}catch{state=M.sanitizeState(null,chIds,exIds,secIds);}
  let current='home',toastTimer,observer;
  const icons={home:'M3 10l7-7 7 7v8H5v-8M8 18v-6h4v6',book:'M10 5C6 2 2 3 2 3v13s4-1 8 2c4-3 8-2 8-2V3s-4-1-8 2v13',lab:'M7 2h6M8 2v6L3 17q-1 2 2 2h10q3 0 2-2l-5-9V2M6 13h8',quiz:'M5 3h10v16H5zM8 7h4M8 11h4M8 15h2',formula:'M4 17l4-13h8M9 10h7M9 16h5',star:'m10 2 2.5 5 5.5 1-4 4 .8 5.5-4.8-2.5-4.8 2.5L6 12 2 8l5.5-1z'};
  const icon=k=>`<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 20 21"><path d="${icons[k]||icons.book}"/></svg></span>`;
  function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2800);}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('当前浏览器不允许保存，请使用“导出学习记录”备份。');}updateProgress();}
  function updateProgress(){
    $('#progress-label').textContent=`已掌握 ${state.mastered.length} / 9 讲`;
    $('#progress-fill').style.width=state.mastered.length/9*100+'%';
    document.documentElement.style.setProperty('--body-size',state.font+'px');
    document.querySelectorAll('[data-mastered]').forEach(b=>{const yes=state.mastered.includes(b.dataset.mastered);b.classList.toggle('active',yes);b.textContent=yes?'✓ 已掌握':'标记掌握';b.setAttribute('aria-pressed',String(yes));});
    document.querySelectorAll('[data-chapter-done]').forEach(b=>b.textContent=state.mastered.includes(b.dataset.chapterDone)?'✓':'');
    document.querySelectorAll('[data-bookmark]').forEach(b=>{const yes=state.bookmarks.includes(b.dataset.bookmark);b.textContent=yes?'★ 已收藏':'☆ 收藏';b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
    document.querySelectorAll('[data-wrong]').forEach(b=>{const yes=state.wrong.includes(b.dataset.wrong);b.textContent=yes?'✓ 已加入错题':'加入错题';b.classList.toggle('active',yes);});
  }
  function toggle(key,id){state[key]=state[key].includes(id)?state[key].filter(x=>x!==id):[...state[key],id];save();}
  function math(root=document){root.querySelectorAll('[data-tex]').forEach(el=>{if(el.dataset.rendered)return;try{katex.render(el.dataset.tex,el,{displayMode:el.classList.contains('math-display'),throwOnError:false,strict:false,trust:false});el.dataset.rendered='1';}catch(e){el.textContent=el.dataset.tex;el.classList.add('math-error');}});}
  function toolbar(label,ch){return `<div class="toolbar"><span>${label}</span><div class="toolbar-actions"><button class="font-size" data-font="-1" title="缩小正文">A−</button><button class="font-size" data-font="1" title="放大正文">A＋</button>${ch?`<button data-mastered="${ch.id}" aria-pressed="false">标记掌握</button>`:''}<button data-action="print">打印</button></div></div>`;}
  function header(title,lead,source=''){return `<header class="article-header"><h1>${title}</h1><p class="lead">${lead}</p>${source?`<div class="source-bar">${source}</div>`:''}</header>`;}
  function exercise(e){
    return `<details class="exercise" id="ex-${e.id}" data-exercise="${e.id}"><summary><span class="exercise-id">${esc(e.id)}</span><span>${esc(e.title)}</span><span class="counter">${['','基础','进阶','挑战'][e.difficulty]||'进阶'}</span></summary><div class="exercise-body"><div class="exercise-source">${esc(e.source)}${e.url?` · <a href="${esc(e.url)}" target="_blank" rel="noopener">来源页面 ↗</a>`:''}</div><div class="question article">${e.questionHtml}</div>${e.questionImage?`<figure class="question-figure"><button class="figure-open" data-open-figure aria-label="放大 ${esc(e.id)} 电路题图"><img src="${e.questionImage}" alt="${esc(e.id)} 原课件电路图；参考答案另行折叠" loading="lazy"></button><figcaption>原题电路 · ${esc(e.id)} <span class="zoom-hint">点击图片可放大</span></figcaption></figure>`:''}${e.image&&!e.page&&!e.imageContainsSolution?`<img class="figure" data-zoom tabindex="0" role="button" aria-label="放大题图" src="${e.image}" alt="${esc(e.id)}电路题图" loading="lazy">`:''}${e.image&&(e.page||e.imageContainsSolution)?`<details><summary>${e.page?'查看原课件题面（该页也含参考答案）':'查看设计参考图（含解答）'}</summary><img class="figure original" data-zoom tabindex="0" role="button" aria-label="放大原课件页" src="${e.image}" alt="${esc(e.source)}原页" loading="lazy"></details>`:''}${e.hintsHtml.map((h,i)=>`<details><summary>提示 ${i+1}</summary><div class="article">${h}</div></details>`).join('')}<details class="answer-details"><summary>展开完整解析与答案</summary><div class="solution article">${e.solutionHtml}<div class="note"><strong>答案</strong> ${e.answerHtml}</div>${e.checksHtml?`<p><strong>自检：</strong>${e.checksHtml}</p>`:''}</div></details><div class="exercise-actions"><button data-wrong="${esc(e.id)}">加入错题</button><button data-action="understood" data-id="${esc(e.id)}">这题已弄懂</button></div></div></details>`;
  }
  function home(){
    const last=(()=>{try{return localStorage.getItem(KEY+'-last');}catch{return null;}})();
    return toolbar('学习导览')+header('电子电路基础复习讲义','从参考方向与基本定律，逐步建立对运放、动态电路、相量和频率响应的理解。','依据 EC2026 第 1–9 讲 · 525 页课件 · 离线阅读与互动')+`<div class="article"><p>这份讲义按课程顺序展开概念、物理意义、推导、适用条件和分步例题。正文新增 ${D.stats.theoryFigures} 幅电路、波形与实物插图，课后题另配 ${D.stats.questionFigures} 幅直接可见的电路题图；所有图片均可点击放大。另选 EC2024 题库中的综合题作挑战训练。</p><div class="quick-actions"><a href="#${chIds.includes(last)?last:'ch01'}"><button class="primary">${chIds.includes(last)?'继续上次阅读':'从第 1 讲开始'}</button></a><a href="#labs"><button>打开互动实验</button></a><a href="#practice"><button>进入习题训练</button></a></div><h2>按课程顺序复习</h2><div class="chapter-list">${D.chapters.map(c=>`<a class="chapter-row" href="#${c.id}"><span class="number">${String(c.n).padStart(2,'0')}</span><span><strong>${esc(c.title)}</strong><small>${esc(c.subtitle)}</small></span><span class="arrow">${state.mastered.includes(c.id)?'✓':'→'}</span></a>`).join('')}</div><h2>三条复习路径</h2><ol><li><strong>系统学习：</strong>读概念与推导，再用同节例题检验，最后完成对应课后题。</li><li><strong>查漏补缺：</strong>搜索知识点，结合公式的适用条件和“易错”说明重新建模。</li><li><strong>综合训练：</strong>在习题中选择“挑战”，先独立列方程，依次打开提示，再核对完整解析。</li></ol><h2>使用与备份</h2><p>核心内容、公式、图片和交互均已打包，断网也可使用。收藏、掌握状态和错题保存在当前浏览器；移动文件或换浏览器前可导出记录。</p><div class="quick-actions"><button data-action="export">导出学习记录</button><button data-action="import">导入学习记录</button><button data-action="print-all">打印全部讲义</button></div><div class="note">内容范围为当前九讲。教材仅补充对应知识；不包含仿真软件使用教程。题库部分按网站原编号溯源，未标注考试年份的题目不推断年份。发现源答案疑点时，解析以明确的方程与复算为依据。</div><p class="muted">正文约 ${D.stats.contentChars.toLocaleString()} 字符 · ${D.exercises.filter(e=>e.page).length} 页课后题解析 · ${D.exercises.filter(e=>e.url).length} 道题库精选 · ${L.defs.length} 个互动实验</p></div>`;
  }
  function chapter(c){return toolbar(`第 ${String(c.n).padStart(2,'0')} 讲 / ${esc(c.title)}`,c)+header(c.title,c.subtitle,`课件 L${c.n} · ${c.pages} 页 · 图示 / 推导 / 例题 / 互动 / 习题`)+`<article class="article" id="chapter-article">${c.html}<h2 id="${c.id}-labs">本讲互动实验</h2><div id="chapter-labs"></div><h2 id="${c.id}-practice">本讲课后题与挑战</h2><p>先明确方向与状态，独立列式；需要时逐个展开提示。题目保留原讲次与页码，可对照课件核查；源参考答案与独立复算的差异已在解析中说明。</p>${D.exercises.filter(e=>e.chapter===c.n).map(exercise).join('')}</article><nav class="footer-nav">${c.n>1?`<a href="#ch${String(c.n-1).padStart(2,'0')}">← 上一讲</a>`:'<a href="#home">← 学习导览</a>'}${c.n<9?`<a href="#ch${String(c.n+1).padStart(2,'0')}">下一讲 →</a>`:'<a href="#practice">综合练习 →</a>'}</nav>`;}
  function labs(){return toolbar('互动实验')+header('互动实验','用参数变化检验公式的含义。先预测曲线，再操作，最后回到对应章节解释结果。')+`<div class="filter-bar"><label>讲次 <select id="lab-chapter-filter"><option value="all">全部讲次</option>${D.chapters.map(c=>`<option value="${c.n}">第 ${c.n} 讲 · ${c.title}</option>`).join('')}</select></label></div><div id="all-labs"></div>`;}
  function practice(){return toolbar('习题训练')+header('习题训练','课后题用于巩固各类解法，题库精选用于练习多知识点联用。答案默认收起，提示按层展开。')+`<div class="filter-bar"><select id="exercise-chapter" aria-label="习题讲次"><option value="all">全部讲次</option>${D.chapters.map(c=>`<option value="${c.n}">第 ${c.n} 讲</option>`).join('')}</select><select id="exercise-source" aria-label="习题来源"><option value="all">全部来源</option><option value="local">课后题</option><option value="web">EC2024 精选</option></select><select id="exercise-level" aria-label="习题难度"><option value="all">全部难度</option><option value="1">基础</option><option value="2">进阶</option><option value="3">挑战</option></select><label><input id="wrong-only" type="checkbox"> 只看错题</label><span class="counter" id="exercise-count"></span></div><div id="exercise-list"></div><h2 class="section-title" id="concept-quiz">概念快测</h2><div id="quiz-list"></div>`;}
  function formulas(){return toolbar('公式速查')+header('公式速查',`按建模、求解与校验用途精选 ${D.formulas.length} 组重点关系。展开查看用途、适用条件与易错点，或回正文对照电路图和推导。`)+`<div class="note">先确认参考方向、初始状态与电路拓扑，再选择公式。同类关系合并为一组；数值算例和推导步骤可通过下方链接查看。</div><div class="filter-bar"><label>讲次 <select id="formula-filter"><option value="all">全部讲次</option>${D.chapters.map(c=>`<option value="${c.n}">第 ${c.n} 讲</option>`).join('')}</select></label><span class="counter" id="formula-count" aria-live="polite"></span></div><div class="formula-list" id="formula-list"></div>`;}
  function bookmarks(){return toolbar('收藏与学习记录')+header('收藏与学习记录','保存你需要反复推敲的段落，用“已掌握”和错题记录安排下一轮复习。')+`<div class="quick-actions"><button data-action="export">导出学习记录</button><button data-action="import">导入学习记录</button></div><div class="article"><h2>收藏的段落</h2>${state.bookmarks.length?state.bookmarks.map(id=>{const s=sections.find(s=>s.id===id);return `<p><a href="#${id}">${esc(s.title)}</a> <button data-bookmark="${id}">★ 已收藏</button></p>`;}).join(''):'<p class="empty">还没有收藏。正文每个专题标题右侧都有“收藏”按钮。</p>'}<h2>掌握状态</h2><div class="chapter-list">${D.chapters.map(c=>`<div class="chapter-row"><span class="number">${c.n}</span><a href="#${c.id}">${c.title}</a><button data-mastered="${c.id}">标记掌握</button></div>`).join('')}</div><h2>错题</h2>${state.wrong.length?state.wrong.map(id=>exercise(D.exercises.find(e=>e.id===id))).join(''):'<p class="empty">错题本为空。习题展开后可点击“加入错题”。</p>'}</div>`;}
  function fillExercises(){const c=$('#exercise-chapter')?.value||'all',source=$('#exercise-source')?.value||'all',level=$('#exercise-level')?.value||'all',wrong=$('#wrong-only')?.checked;const records=D.exercises.filter(e=>(c==='all'||e.chapter===+c)&&(source==='all'||(source==='web'?e.url:!e.url))&&(level==='all'||e.difficulty===+level)&&(!wrong||state.wrong.includes(e.id)));$('#exercise-list').innerHTML=records.length?records.map(exercise).join(''):'<p class="empty">当前条件下没有题目，可更换讲次、来源或难度。</p>';$('#exercise-count').textContent=`${records.length} 道`;math($('#exercise-list'));updateProgress();}
  function fillFormulas(){
    const n=$('#formula-filter').value,records=D.formulas.filter(x=>n==='all'||x.chapter===+n);
    $('#formula-count').textContent=n==='all'?`${records.length} 组重点公式`:`本讲 ${records.length} 组 · 全部 ${D.formulas.length} 组`;
    $('#formula-list').innerHTML=records.map(x=>`<details class="formula-card" id="formula-${esc(x.id)}"><summary><span class="formula-chapter-label">第 ${x.chapter} 讲</span><strong>${esc(x.title)}</strong></summary><div class="formula-content"><div class="math-display" data-tex="${esc(x.tex)}"></div><dl class="formula-notes"><dt>用途</dt><dd>${x.useHtml}</dd><dt>适用条件</dt><dd>${x.conditionsHtml}</dd><dt>易错点</dt><dd>${x.pitfallHtml}</dd></dl><div class="formula-return"><a href="#${x.section}">回到正文、电路图与推导 →</a>${(x.related_sections||[]).map(s=>`<a href="#${esc(s)}">${esc(sections.find(t=>t.id===s)?.title||'相关专题')}</a>`).join('')}</div></div></details>`).join('');
    math($('#formula-list'));
  }
  function fillQuiz(){if(!$('#quiz-list'))return;$('#quiz-list').innerHTML=D.quizzes.map((q,i)=>`<section class="quiz" data-quiz="${i}"><strong>${i+1}. ${esc(q.question)}</strong><div class="quiz-options">${q.options.map((o,j)=>`<button data-quiz-answer="${i}" data-choice="${j}">${String.fromCharCode(65+j)}. ${esc(o)}</button>`).join('')}</div><div class="quiz-feedback" aria-live="polite"></div></section>`).join('');}
  function toc(){
    const hs=[...$('#content').querySelectorAll('h2[id],.lab[id]')];$('#toc').innerHTML='<b>本页目录</b>'+hs.map(h=>`<a href="#${h.id}">${esc((h.querySelector('.lab-title')||h).textContent.replace(/☆ 收藏|★ 已收藏/g,''))}</a>`).join('');
    if(observer)observer.disconnect();observer=new IntersectionObserver(entries=>{const e=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(e){document.querySelectorAll('.toc a').forEach(a=>a.classList.toggle('current',a.hash==='#'+e.target.id));}},{rootMargin:'-5% 0px -70% 0px'});hs.forEach(h=>observer.observe(h));
  }
  function render(route){
    let target=route||location.hash.slice(1)||'home',anchor=null;
    const existing=document.getElementById(target);
    if(existing&&/^(ch\d\d-s|lab-|ch\d\d-(labs|practice)|ex-)/.test(target)){
      if(existing.tagName==='DETAILS')existing.open=true;
      existing.scrollIntoView({block:'start'});$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');$('#search-results').hidden=true;return;
    }
    const sec=sections.find(s=>s.id===target),ex=D.exercises.find(e=>'ex-'+e.id===target);
    if(sec){anchor=target;target='ch'+String(sec.chapter).padStart(2,'0');}else if(ex){anchor=target;target='practice';}
    if(target.startsWith('lab-')){anchor=target;target='labs';}
    if(/ch\d\d-(labs|practice)/.test(target)){anchor=target;target=target.slice(0,4);}
    const c=D.chapters.find(c=>c.id===target);current=target;
    $('#content').innerHTML=c?chapter(c):({home,labs,practice,formulas,bookmarks}[target]||home)();
    document.title=(c?c.title:{home:'学习导览',labs:'互动实验',practice:'习题训练',formulas:'公式速查',bookmarks:'收藏与记录'}[target]||'学习导览')+' · 电子电路基础';
    if(c){try{localStorage.setItem(KEY+'-last',c.id);}catch{}
      const matches={power:'功率',divider:'分压',delta:'Δ',load:'最大功率',bridge:'电桥',opamp:'反相',common:'共模',instrument:'仪表',dac:'DAC',storage:'电容的微分',integrator:'运放积分器',first:'三要素法',singular:'阶跃、冲激',second:'串联',phasor:'相量',bode:'波特图',resonance:'串联谐振',filter:'无源滤波'};
      for(const d of L.defs.filter(d=>d.chapter===c.n)){
        const h=[...$('#chapter-article').querySelectorAll('h2,h3')].find(h=>h.textContent.includes(matches[d.id]));
        const box=document.createElement('div');
        if(h){let at=h.nextElementSibling;if(at?.tagName==='P')at.after(box);else h.after(box);}else $('#chapter-labs').append(box);
        L.mount(box,[d.id]);
      }
      $('#chapter-labs').insertAdjacentHTML('beforeend','<p>'+L.defs.filter(d=>d.chapter===c.n).map(d=>`<a href="#lab-${d.id}">${d.title}</a>`).join(' · ')+'</p>');
      $('#chapter-article').querySelectorAll('h2[id]').forEach(h=>{if(secIds.includes(h.id)){const b=document.createElement('button');b.className='bookmark-button no-print';b.dataset.bookmark=h.id;b.textContent='☆ 收藏';b.setAttribute('aria-label','收藏段落：'+h.textContent);h.append(b);}});
    }
    if(target==='labs'){L.mount($('#all-labs'));$('#lab-chapter-filter').addEventListener('change',e=>{$('#all-labs').innerHTML='';L.mount($('#all-labs'),L.defs.filter(d=>e.target.value==='all'||d.chapter===+e.target.value).map(d=>d.id));toc();});}
    if(target==='practice'){fillExercises();fillQuiz();document.querySelectorAll('#exercise-chapter,#exercise-source,#exercise-level,#wrong-only').forEach(el=>el.addEventListener('change',fillExercises));}
    if(target==='formulas'){fillFormulas();$('#formula-filter').addEventListener('change',fillFormulas);}
    math($('#content'));updateProgress();toc();
    document.querySelectorAll('.sidebar a[href]').forEach(a=>{const active=a.hash==='#'+target;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');$('#search-results').hidden=true;
    if(anchor){const el=document.getElementById(anchor);if(el){if(el.tagName==='DETAILS')el.open=true;requestAnimationFrame(()=>el.scrollIntoView({block:'start'}));}}else window.scrollTo(0,0);
  }
  function search(q){
    const result=$('#search-results');q=q.trim();if(!q){result.hidden=true;return;}
    const terms=q.toLowerCase().split(/\s+/).filter(Boolean);const hits=D.search.filter(r=>terms.every(w=>(r.title+' '+r.text).toLowerCase().includes(w))).slice(0,30);
    result.innerHTML=`<div class="result-head"><span>搜索结果 · ${hits.length}${hits.length===30?'＋':''}</span><button data-action="close-search" aria-label="关闭搜索">×</button></div>`+(hits.length?hits.map(r=>{const p=r.text.toLowerCase().indexOf(terms[0]),start=Math.max(0,p-30),excerpt=r.text.slice(start,start+125);return `<a class="search-result" href="#${r.id}"><strong>${esc(r.title)}</strong><small>${esc(excerpt)}…</small></a>`;}).join(''):'<p class="empty">没有找到。可尝试“超节点”“初始导数”“CMRR”“半功率”等关键词。</p>');result.hidden=false;
  }
  let figureScale=1,figureBase=1;
  const figureDialog=document.getElementById('figure-viewer'),figureImage=document.getElementById('figure-image');
  function zoomFigure(scale){figureScale=Math.min(4,Math.max(.5,scale));figureImage.style.width=figureBase*figureScale+'px';document.getElementById('figure-zoom-label').textContent=Math.round(figureScale*100)+'%';}
  function fitFigure(){const stage=document.getElementById('figure-stage');figureBase=Math.min(figureImage.naturalWidth||1000,stage.clientWidth-32,(stage.clientHeight-24)*(figureImage.naturalWidth||1)/(figureImage.naturalHeight||1));zoomFigure(1);stage.scrollTo(0,0);}
  function openFigure(img){document.getElementById('figure-title').textContent=img.alt||'电路与波形图';figureImage.onload=fitFigure;figureImage.src=img.src;if(!figureDialog.open)figureDialog.showModal();if(figureImage.complete&&figureImage.naturalWidth)requestAnimationFrame(fitFigure);}
  figureDialog.addEventListener('click',e=>{if(e.target===figureDialog){const r=figureDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)figureDialog.close();}});
  document.addEventListener('keydown',e=>{if(figureDialog.open&&['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')fitFigure();else zoomFigure(figureScale+(e.key==='-'?-.25:.25));}else if(e.target.matches('img[data-zoom]')&&['Enter',' '].includes(e.key)){e.preventDefault();openFigure(e.target);}});
  document.addEventListener('click',e=>{
    const opener=e.target.closest('[data-open-figure],img[data-zoom]');if(opener){openFigure(opener.tagName==='IMG'?opener:opener.querySelector('img'));return;}
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.figureZoom){if(b.dataset.figureZoom==='fit')fitFigure();else zoomFigure(figureScale+Number(b.dataset.figureZoom));}
    if(b.dataset.figureClose!==undefined)figureDialog.close();
    if(b.dataset.mastered)toggle('mastered',b.dataset.mastered);
    if(b.dataset.bookmark){toggle('bookmarks',b.dataset.bookmark);if(current==='bookmarks')render('bookmarks');}
    if(b.dataset.wrong)toggle('wrong',b.dataset.wrong);
    if(b.dataset.font){state.font=Math.max(15,Math.min(19,state.font+Number(b.dataset.font)));save();}
    if(b.dataset.quizAnswer!==undefined){const q=D.quizzes[+b.dataset.quizAnswer],yes=+b.dataset.choice===q.correct;const section=b.closest('.quiz');section.querySelector('.quiz-feedback').textContent=(yes?'正确。':'再想一想。')+q.explanation;section.querySelectorAll('[data-choice]').forEach(x=>x.classList.toggle('active',+x.dataset.choice===q.correct));}
    const action=b.dataset.action;
    if(action==='understood'){state.wrong=state.wrong.filter(x=>x!==b.dataset.id);save();toast('已从错题记录中移除，可以继续下一题。');}
    if(action==='close-search')$('#search-results').hidden=true;
    if(action==='print'){document.body.classList.remove('printing-all');document.querySelectorAll('#content details').forEach(d=>d.open=true);window.print();}
    if(action==='print-all'){
      $('#print-all').innerHTML=D.chapters.map(c=>`<section class="chapter-print"><h1>第 ${c.n} 讲 · ${esc(c.title)}</h1><article class="article">${c.html}</article></section>`).join('');math($('#print-all'));document.body.classList.add('printing-all');window.print();
    }
    if(action==='export'){const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),...state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='电路复习-学习记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('学习记录已导出。');}
    if(action==='import')$('#import-file').click();
  });
  $('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('记录文件过大');const raw=JSON.parse(await file.text());if(!raw||typeof raw!=='object'||!['mastered','wrong','bookmarks'].some(k=>Array.isArray(raw[k])))throw Error('不是有效的学习记录');state=M.sanitizeState(raw,chIds,exIds,secIds);save();render(current);toast('已导入学习记录，未知项目已忽略。');}catch{toast('无法导入：请选择本讲义导出的 JSON 学习记录。');}e.target.value='';});
  $('#search-input').addEventListener('input',e=>search(e.target.value));$('#search-input').addEventListener('keydown',e=>{if(e.key==='Escape')$('#search-results').hidden=true;if(e.key==='Enter'){$('#search-results a')?.click();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#search-results').hidden=true;$('#sidebar').classList.remove('open');}if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();$('#sidebar').classList.add('open');$('#search-input').focus();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap,.search-results'))$('#search-results').hidden=true;});
  $('#menu-button').addEventListener('click',()=>{const yes=$('#sidebar').classList.toggle('open');$('#menu-button').setAttribute('aria-expanded',String(yes));});
  window.addEventListener('beforeprint',()=>{if(!document.body.classList.contains('printing-all'))document.querySelectorAll('#content details').forEach(d=>d.open=true);});
  window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-all');$('#print-all').innerHTML='';});
  window.addEventListener('hashchange',()=>render());
  $('#nav-main').innerHTML=[['home','home','学习导览'],['book','ch01','完整讲义'],['lab','labs','互动实验'],['quiz','practice','习题训练'],['formula','formulas','公式速查'],['star','bookmarks','收藏与记录']].map(([i,r,t])=>`<a href="#${r}">${icon(i)}${t}</a>`).join('');
  $('#chapters-nav').innerHTML=D.chapters.map(c=>`<a href="#${c.id}"><span class="chapter-no">${String(c.n).padStart(2,'0')}</span><span>${esc(c.navTitle||c.title)}</span><span class="chapter-done" data-chapter-done="${c.id}"></span></a>`).join('');
  render();window.CircuitReview={D,state:()=>state,math,render};
})();
