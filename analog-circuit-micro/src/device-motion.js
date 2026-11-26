/* 第 7/8 章器件动作教学动画（离线 SVG + 原生 JS）
   window.DeviceMotion.mount(root) / window.DeviceMotion.dispose()
   容器：<div data-device-motion="bjt"></div> 或 data-device-motion="mos"
   物理模型为教学分段大信号模型，假设写在每个动画底部。 */
(function () {
  'use strict';
  if (window.DeviceMotion && window.DeviceMotion.__deviceMotion) return;

  let UID = 0;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmtV = (x, d = 2) => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(d) + ' V';
  const fmtmA = (x, d = 2) => (Math.abs(x) < 5e-6 ? 0 : x * 1e3).toFixed(d) + ' mA';
  const fmtUA = (x, d = 1) => (Math.abs(x) < 5e-7 ? 0 : x * 1e6).toFixed(d) + ' µA';
  const pct = x => Math.round(100 * x) + '%';

  function marker(id, color) {
    return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`;
  }
  function wire(x1, y1, x2, y2) {
    return `<line class="dm-wire" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }
  function pathWire(d) {
    return `<path class="dm-wire" d="${d}"/>`;
  }
  function resistorV(x, y1, y2) {
    const n = 6, h = (y2 - y1) / n, w = 7, pts = [[x, y1]];
    for (let i = 0; i < n; i++) pts.push([x + (i % 2 ? -w : w), y1 + h * (i + 0.5)]);
    pts.push([x, y2]);
    return `<polyline class="dm-rez" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  }
  function resistorH(x1, x2, y) {
    const n = 6, h = (x2 - x1) / n, w = 7, pts = [[x1, y]];
    for (let i = 0; i < n; i++) pts.push([x1 + h * (i + 0.5), y + (i % 2 ? -w : w)]);
    pts.push([x2, y]);
    return `<polyline class="dm-rez" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  }
  function ground(x, y) {
    return `<path class="dm-wire" d="M${x} ${y}V${y + 9}M${x - 13} ${y + 9}H${x + 13}M${x - 8} ${y + 15}H${x + 8}M${x - 3} ${y + 21}H${x + 3}"/>`;
  }
  function sourceV(x, y) {
    return `<circle class="dm-src" cx="${x}" cy="${y}" r="13"/><path d="M${x - 4} ${y - 5}h8m-4 -4v8m-4 7h8" fill="none" stroke="#3d4d66" stroke-width="1.2"/>`;
  }
  function arrowHead(x, y, dx, dy, color) {
    const s = 5.5;
    return `<path d="M${x - dx * s - dy * s * 0.65} ${y - dy * s + dx * s * 0.65}L${x} ${y}L${x - dx * s + dy * s * 0.65} ${y - dy * s - dx * s * 0.65}Z" fill="${color || '#3d4d66'}"/>`;
  }
  function band(x, y, w, h, cls, label, tx, ty, color) {
    return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>` +
      (label ? `<text class="dm-t3" x="${tx}" y="${ty}" text-anchor="middle" fill="${color || '#5a6a82'}">${label}</text>` : '');
  }

  /* =====================================================================
     第 7 章：NPN 共射，固定偏置。分段大信号模型：
     截止 v_I ≤ 0.7 V；放大 I_C=βI_B(1+V_CE/V_A)，V_CE≥0.2 V；
     饱和 V_CE=0.2 V，I_C=(V_CC-0.2)/R_C，β_forced=I_C/I_B。
     ===================================================================== */
  const BJT = { VCC: 12, RC: 2200, RB: 47000, beta: 100, VBEon: 0.7, VCEsat: 0.2, VA: 100, VT: 0.026 };
  const BJT_VIS = { vIMax: 4 };
  const BJT_KEYS = [
    { id: 'cut', label: '截止', vI: 0.2 },
    { id: 'active', label: '放大', vI: 2.0 },
    { id: 'sat', label: '饱和', vI: 3.8 },
  ];
  const BJT_KEYMAP = Object.fromEntries(BJT_KEYS.map(k => [k.id, k]));

  function bjtSolve(vI) {
    const p = BJT;
    const vbe = Math.min(vI, p.VBEon);
    if (vI <= p.VBEon + 1e-9) {
      return { region: 'cut', vI, vBE: vbe, IB: 0, IC: 0, IE: 0, VCE: p.VCC, VBC: vI - p.VCC, forced: 0, betaUsed: 0 };
    }
    const IB = (vI - p.VBEon) / p.RB;
    const den = 1 + p.beta * IB * p.RC / p.VA;
    const ICact = p.beta * IB * (1 + p.VCC / p.VA) / den;
    const VCEact = p.VCC - ICact * p.RC;
    if (VCEact >= p.VCEsat) {
      return { region: 'active', vI, vBE: p.VBEon, IB, IC: ICact, IE: IB + ICact, VCE: VCEact, VBC: p.VBEon - VCEact, forced: p.beta, betaUsed: p.beta };
    }
    const VCE = p.VCEsat, IC = (p.VCC - VCE) / p.RC;
    return { region: 'sat', vI, vBE: p.VBEon, IB, IC, IE: IB + IC, VCE, VBC: p.VBEon - VCE, forced: IC / IB, betaUsed: IC / IB };
  }
  function bjtSaturationVI() {
    // 计入 Early 效应，二分求放大/饱和边界对应的 v_I
    let lo = 0, hi = (BJT.VCC - BJT.VCEsat) / (BJT.RC * BJT.beta) * 1.15;
    for (let i = 0; i < 48; i++) {
      const ib = (lo + hi) / 2;
      const den = 1 + BJT.beta * ib * BJT.RC / BJT.VA;
      const ic = BJT.beta * ib * (1 + BJT.VCC / BJT.VA) / den;
      if (BJT.VCC - ic * BJT.RC > BJT.VCEsat) lo = ib; else hi = ib;
    }
    return BJT.VBEon + (lo + hi) / 2 * BJT.RB;
  }
  function bjtFamilyPath(IB) {
    if (IB <= 0) return 'M0 0L13 0';
    let d = 'M0 0L' + BJT.VCEsat + ' 0';
    for (let i = 0; i <= 24; i++) {
      const vce = lerp(BJT.VCEsat, 13, i / 24);
      const ic = BJT.beta * IB * (1 + vce / BJT.VA) * 1e3;
      d += 'L' + vce.toFixed(2) + ' ' + ic.toFixed(3);
    }
    return d;
  }
  function bjtXferPath() {
    let d = '';
    for (let i = 0; i <= 240; i++) {
      const vI = BJT_VIS.vIMax * i / 240, s = bjtSolve(vI);
      d += (i ? 'L' : 'M') + vI.toFixed(3) + ' ' + s.VCE.toFixed(3);
    }
    return d;
  }

  function bjtTemplate(id, inst) {
    return `<div class="dm dm-bjt" data-dm-kind="bjt">
      <div class="dm-head"><div class="dm-title"><span class="dm-badge">第 7 章</span>NPN 共射：截止 → 放大 → 饱和</div>
        <div class="dm-sub">固定偏置、直流负载线。看 v<sub>I</sub> 增大时 Q 点如何沿负载线移动，以及为什么 v<sub>O</sub> 与 v<sub>I</sub> 反相。</div></div>
      <div class="dm-controls">
        <button class="dm-btn primary" data-act="play" aria-pressed="false">▶ 播放扫描</button>
        <button class="dm-btn" data-act="step">⏭ 单步</button>
        <button class="dm-btn" data-act="reset">↺ 重置</button>
        <span class="dm-keys-label">关键状态</span>
        <span class="dm-keys" role="group" aria-label="BJT 关键状态">${BJT_KEYS.map(k => `<button class="dm-key" data-key="${k.id}" aria-pressed="false">${k.label}</button>`).join('')}</span>
        <span class="dm-live">v<sub>I</sub> = <b data-dm="vi">2.00 V</b></span>
      </div>
      <div class="dm-grid">
        <section class="dm-panel"><h4>教学电路 <span>NPN 共射，固定偏置</span></h4>${bjtCircuitSvg(id)}</section>
        <section class="dm-panel"><h4>内部机理 <span>两个结的偏置与载流子</span></h4>${bjtMechSvg(id)}</section>
        <section class="dm-panel"><h4>输出特性与直流负载线 <span>i<sub>C</sub>–v<sub>CE</sub></span></h4>${bjtCurveSvg(id, inst)}</section>
        <section class="dm-panel"><h4>输入电压与输出电压 <span>反相与失真</span></h4>${bjtXferSvg(id)}</section>
      </div>
      <div class="dm-readout">
        <span class="dm-state" data-dm="state">放大</span>
        <span class="dm-chip">I<sub>B</sub> = <b data-dm="ib">27.7 µA</b></span>
        <span class="dm-chip">I<sub>C</sub> = <b data-dm="ic">2.92 mA</b></span>
        <span class="dm-chip">V<sub>CE</sub> = <b data-dm="vce">5.58 V</b></span>
        <span class="dm-chip">V<sub>BC</sub> = <b data-dm="vbc">−4.88 V</b></span>
        <span class="dm-chip" data-dm="beta-label">β = <b data-dm="beta">100</b></span>
      </div>
      <div class="dm-chain" data-dm="chain"></div>
      <div class="dm-note"><b>模型假设</b>：NPN，β=100，V<sub>BE(on)</sub>=0.7 V，V<sub>CE(sat)</sub>=0.2 V，V<sub>A</sub>=100 V；分段大信号模型（截止 / 放大 / 饱和），忽略结电容与存储时间。电流模型采用 I<sub>C</sub> = βI<sub>B</sub>(1 + V<sub>CE</sub>/V<sub>A</sub>)，直到负载将 V<sub>CE</sub> 限至 0.2 V。实际器件在集电结开始正偏时逐渐进入饱和，图中的垂直钳位支路是分段近似。数值为自拟教学值，不取自课件原题。<br>
      <b>依据</b>：chap_7m PDF p12（工作状态）、p14（输出特性）、p25（截止/饱和等效）、p36（图解法负载线）、p38（工作区判据）、p39–47（共射放大器）。</div>
    </div>`;
  }

  function bjtCircuitSvg(id) {
    return `<svg class="dm-svg" viewBox="0 0 420 330" role="img" aria-label="NPN 共射教学电路，VCC 12 伏，RC 2.2 千欧，RB 47 千欧，输入 vI，输出 vO">
      <defs>${marker(id + '-c-arr', '#0d7c86')}${marker(id + '-c-arr2', '#b35c00')}</defs>
      ${wire(70, 32, 320, 32)}
      <text class="dm-lab" x="195" y="20" text-anchor="middle">+V<tspan baseline-shift="sub" font-size="8">CC</tspan> = 12 V</text>
      ${wire(300, 32, 300, 48)}${resistorV(300, 48, 112)}${wire(300, 112, 300, 130)}
      <text class="dm-t2" data-dm="rc-label" x="311" y="62">R<tspan baseline-shift="sub" font-size="8">C</tspan> = 2.2 kΩ</text>
      <circle class="dm-junc" cx="300" cy="130" r="2.7"/>
      <text class="dm-t2" data-dm="ic-label" x="311" y="84">I<tspan baseline-shift="sub" font-size="8">C</tspan> = 2.92 mA</text>
      ${pathWire('M300 130L230 150')}
      ${pathWire('M230 142V178')}
      ${pathWire('M230 170L300 198')}
      ${arrowHead(286, 191, 0.78, 0.62, '#3d4d66')}
      ${pathWire('M300 130H352')}
      <circle class="dm-junc" cx="352" cy="130" r="3"/>
      <text class="dm-lab" x="360" y="126">v<tspan baseline-shift="sub" font-size="8">O</tspan></text><text class="dm-t3" x="360" y="140">输出</text>
      <text class="dm-t3" x="262" y="162">NPN</text>
      ${wire(300, 198, 300, 265)}
      <text class="dm-t2" data-dm="ie-label" x="311" y="236">I<tspan baseline-shift="sub" font-size="8">E</tspan> = 3.02 mA</text>
      ${pathWire('M230 160H180')}${resistorH(120, 180, 160)}${pathWire('M82 147V137H108V160H120')}
      <text class="dm-t2" x="150" y="128" text-anchor="middle">R<tspan baseline-shift="sub" font-size="8">B</tspan> = 47 kΩ</text>
      <text class="dm-t2" data-dm="ib-label" x="150" y="148" text-anchor="middle">I<tspan baseline-shift="sub" font-size="8">B</tspan> = 27.7 µA</text>
      ${sourceV(82, 160)}${wire(82, 173, 82, 265)}
      <text class="dm-lab" x="34" y="156">v<tspan baseline-shift="sub" font-size="8">I</tspan></text><text class="dm-t3" x="34" y="170">输入</text>
      ${wire(82, 265, 300, 265)}${ground(191, 265)}
      <text class="dm-t3" x="191" y="300" text-anchor="middle">地 0 V</text>
      <text class="dm-t2" data-dm="vce-label" x="330" y="176">V<tspan baseline-shift="sub" font-size="8">CE</tspan> = 5.58 V</text>
      <text class="dm-t2" data-dm="vbe-label" x="220" y="214" text-anchor="end">V<tspan baseline-shift="sub" font-size="8">BE</tspan> = 0.70 V</text>
      ${arrowHead(300, 102, 0, 1, '#b35c00')}
      ${arrowHead(198, 160, 1, 0, '#0d7c86')}
      ${arrowHead(300, 232, 0, 1, '#0d7c86')}
      ${wire(82, 197, 82, 205)}
      <text class="dm-t3" x="91" y="222">可调直流源</text>
    </svg>`;
  }

  function bjtMechSvg(id) {
    return `<svg class="dm-svg" viewBox="0 0 420 300" role="img" aria-label="NPN 内部载流子与发射结、集电结耗尽区">
      <text class="dm-lab" data-dm="mech-state" x="210" y="22" text-anchor="middle">放大：发射结正偏，集电结反偏</text>
      <rect class="dm-region" x="40" y="70" width="80" height="120" rx="3"/>
      <rect class="dm-pbase" x="120" y="70" width="60" height="120"/>
      <rect class="dm-ncoll" x="180" y="70" width="180" height="120" rx="3"/>
      <text class="dm-t2" x="80" y="87" text-anchor="middle">N+ 发射区</text>
      <text class="dm-t3" x="150" y="87" text-anchor="middle">P 基区</text>
      <text class="dm-t2" x="270" y="87" text-anchor="middle">N 集电区</text>
      <rect class="dm-dep" data-dm="dep-eb" x="115" y="70" width="10" height="120"/>
      <rect class="dm-dep" data-dm="dep-cb" x="171" y="70" width="18" height="120"/>
      <text class="dm-t3" data-dm="eb-label" x="106" y="58" text-anchor="middle">EBJ</text>
      <text class="dm-t3" data-dm="cb-label" x="214" y="58" text-anchor="middle">CBJ</text>
      <line class="dm-dash" x1="58" y1="126" x2="340" y2="126" opacity=".55"/>
      <line class="dm-dash" x1="58" y1="160" x2="340" y2="160" opacity=".35"/>
      <g data-dm="e-dots">${Array.from({ length: 8 }, () => '<circle class="dm-dot-e" r="3.2"/>').join('')}</g>
      <g data-dm="h-dots">${Array.from({ length: 6 }, () => '<circle class="dm-dot-h" r="3"/>').join('')}</g>
      <g data-dm="sat-e-dots">${Array.from({ length: 4 }, () => '<circle class="dm-dot-e" r="3" opacity="0"/>').join('')}</g>
      <g data-dm="sat-h-dots">${Array.from({ length: 4 }, () => '<circle class="dm-dot-h" r="3" opacity="0"/>').join('')}</g>
      <text class="dm-t3" x="245" y="112" text-anchor="middle">电子流 E→C</text>
      <text class="dm-t3" x="120" y="176" text-anchor="middle">空穴 B→E</text>
      <text class="dm-t3" data-dm="sat-note" x="210" y="205" text-anchor="middle" style="fill:#b35c00"></text>
      ${wire(70, 190, 70, 238)}${wire(150, 190, 150, 238)}${wire(300, 190, 300, 238)}
      <text class="dm-lab2" x="70" y="254" text-anchor="middle">E</text>
      <text class="dm-lab2" x="150" y="254" text-anchor="middle">B</text>
      <text class="dm-lab2" x="300" y="254" text-anchor="middle">C</text>
      <circle class="dm-dot-e" cx="44" cy="278" r="3.4"/><text class="dm-t3" x="52" y="282">电子</text>
      <circle class="dm-dot-h" cx="106" cy="278" r="3.4"/><text class="dm-t3" x="114" y="282">空穴</text>
      <text class="dm-t3" x="210" y="282" text-anchor="middle">点的速度 ∝ 电流大小</text>
    </svg>`;
  }

  function bjtCurveSvg(id, inst) {
    const L = 54, R = 14, T = 24, B = 42, W = 460, H = 330;
    const pw = W - L - R, ph = H - T - B;
    const X = v => L + pw * v / 13, Y = v => H - B - ph * v / 6.2;
    let g = '';
    for (let x = 0; x <= 12; x += 2) g += `<line class="dm-gridline" x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${H - B}"/><text class="dm-t3" x="${X(x)}" y="${H - B + 14}" text-anchor="middle">${x}</text>`;
    for (let y = 0; y <= 6; y++) g += `<line class="dm-gridline" x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="dm-t3" x="${L - 5}" y="${Y(y) + 3}" text-anchor="end">${y}</text>`;
    g += `<rect class="dm-band-sat" x="${L}" y="${T}" width="${Math.max(2, X(0.25) - L)}" height="${ph}" opacity=".65"/>`;
    g += `<text class="dm-t3" x="${X(0.25) + 4}" y="${T + 12}" style="fill:#b35c00">饱和</text>`;
    const clip = id + '-c-clip';
    g += `<clipPath id="${clip}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath><g clip-path="url(#${clip})">`;
    [0, 15, 30, 45, 60].forEach(ib => { g += `<path class="dm-fam" d="${bjtFamilyPath(ib * 1e-6)}" transform="translate(${L} ${H - B}) scale(${pw / 13} ${-ph / 6.2})"/>`; });
    g += `<path class="dm-cur" data-dm="ib-curve" d="" transform="translate(${L} ${H - B}) scale(${pw / 13} ${-ph / 6.2})"/></g>`;
    const y0 = (BJT.VCC / BJT.RC) * 1e3;
    g += `<line class="dm-load" x1="${X(0)}" y1="${Y(y0)}" x2="${X(BJT.VCC)}" y2="${Y(0)}"/>`;
    g += `<text class="dm-t3" x="${X(7.4)}" y="${Y(2.6)}" text-anchor="middle" style="fill:#b35c00">直流负载线</text>`;
    g += `<line class="dm-dash" x1="${X(BJT.VCEsat)}" x2="${X(BJT.VCEsat)}" y1="${T}" y2="${H - B}"/><text class="dm-t3" x="${X(BJT.VCEsat) + 4}" y="${T + 26}" style="fill:#b35c00">V<tspan baseline-shift="sub" font-size="7">CE(sat)</tspan></text>`;
    g += `<text class="dm-t3" x="${L + 8}" y="${T + 12}" style="fill:#5a6a82">I<tspan baseline-shift="sub" font-size="7">B</tspan> 增大 ↑</text>`;
    g += `<line class="dm-axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="dm-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    g += `<text class="dm-t3" x="${(W + L - R) / 2}" y="${H - 5}" text-anchor="middle">v<tspan baseline-shift="sub" font-size="7">CE</tspan> / V</text>`;
    g += `<text class="dm-t3" x="14" y="${(H - B + T) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(H - B + T) / 2})">i<tspan baseline-shift="sub" font-size="7">C</tspan> / mA</text>`;
    g += `<g data-dm="q-group"><line class="dm-dash" data-dm="q-h" x1="${L}" y1="0" x2="0" y2="0"/><line class="dm-dash" data-dm="q-v" x1="0" y1="${T}" x2="0" y2="${H - B}"/><circle class="dm-qring" data-dm="q-ring" r="7"/><circle class="dm-q" data-dm="q" r="4"/><text class="dm-lab2" data-dm="q-t" x="0" y="0">Q</text></g>`;
    return `<svg class="dm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="BJT 输出特性曲线族、直流负载线与 Q 点">${g}</svg>`;
  }

  function bjtXferSvg(id) {
    const L = 54, R = 14, T = 24, B = 42, W = 460, H = 300;
    const pw = W - L - R, ph = H - T - B;
    const X = v => L + pw * clamp(v, 0, 4) / 4, Y = v => H - B - ph * clamp(v, 0, 12.6) / 12.6;
    const vs = bjtSaturationVI();
    let g = '';
    g += `<rect class="dm-band-cut" x="${L}" y="${T}" width="${X(0.7) - L}" height="${ph}"/>`;
    g += `<rect class="dm-band-act" x="${X(0.7)}" y="${T}" width="${X(vs) - X(0.7)}" height="${ph}"/>`;
    g += `<rect class="dm-band-sat" x="${X(vs)}" y="${T}" width="${W - R - X(vs)}" height="${ph}"/>`;
    g += `<text class="dm-t3" x="${(L + X(0.7)) / 2}" y="${T + 13}" text-anchor="middle">截止</text>`;
    g += `<text class="dm-t3" x="${(X(0.7) + X(vs)) / 2}" y="${T + 13}" text-anchor="middle" style="fill:#0d7c86">放大（反相）</text>`;
    g += `<text class="dm-t3" x="${(X(vs) + W - R) / 2}" y="${T + 13}" text-anchor="middle" style="fill:#b35c00">饱和</text>`;
    for (let x = 0; x <= 4; x++) g += `<line class="dm-gridline" x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${H - B}"/><text class="dm-t3" x="${X(x)}" y="${H - B + 14}" text-anchor="middle">${x}</text>`;
    for (let y = 0; y <= 12; y += 2) g += `<line class="dm-gridline" x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="dm-t3" x="${L - 5}" y="${Y(y) + 3}" text-anchor="end">${y}</text>`;
    const clip = id + '-x-clip';
    g += `<clipPath id="${clip}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath><g clip-path="url(#${clip})"><path class="dm-cur" d="${bjtXferPath()}" transform="translate(${L} ${H - B}) scale(${pw / 4} ${-ph / 12.6})"/></g>`;
    g += `<line class="dm-dash" x1="${X(0.7)}" x2="${X(0.7)}" y1="${T}" y2="${H - B}"/><line class="dm-dash" x1="${X(vs)}" x2="${X(vs)}" y1="${T}" y2="${H - B}"/>`;
    g += `<text class="dm-t3" x="${X(0.7) + 3}" y="${H - B - 5}">0.7 V</text><text class="dm-t3" x="${X(vs) + 3}" y="${H - B - 5}">饱和边界</text>`;
    g += `<line class="dm-axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="dm-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    g += `<text class="dm-t3" x="${(W + L - R) / 2}" y="${H - 5}" text-anchor="middle">v<tspan baseline-shift="sub" font-size="7">I</tspan> / V</text>`;
    g += `<text class="dm-t3" x="14" y="${(H - B + T) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(H - B + T) / 2})">v<tspan baseline-shift="sub" font-size="7">O</tspan> / V</text>`;
    g += `<text class="dm-t3" x="${X(2.0)}" y="${Y(8.6)}" text-anchor="middle" style="fill:#0d7c86">v<tspan baseline-shift="sub" font-size="7">I</tspan> ↑ ⇒ v<tspan baseline-shift="sub" font-size="7">O</tspan> ↓</text>`;
    g += `<line class="dm-dash" data-dm="xv-line" x1="0" y1="${T}" x2="0" y2="${H - B}"/><circle class="dm-q" data-dm="xv-q" r="4"/><text class="dm-lab2" data-dm="xv-t" x="0" y="0">Q</text>`;
    return `<svg class="dm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="BJT 转移特性 vO 随 vI 变化，放大区负斜率表示反相">${g}</svg>`;
  }

  const instances = new Set();

  class BjTMotion {
    constructor(root) {
      this.root = root;
      this.id = 'dm-bjt-' + (++UID);
      this.phase = 0.5;
      this.animT = 0.35;
      this.playing = false;
      this.last = 0;
      this.raf = 0;
      this.tick = this.tick.bind(this);
      root.innerHTML = bjtTemplate(this.id, this);
      const q = s => root.querySelector(s);
      this.q = q;
      this.el = {
        vi: q('[data-dm="vi"]'), state: q('[data-dm="state"]'),
        ib: q('[data-dm="ib"]'), ic: q('[data-dm="ic"]'), vce: q('[data-dm="vce"]'),
        vbc: q('[data-dm="vbc"]'), beta: q('[data-dm="beta"]'), betaLabel: q('[data-dm="beta-label"]'),
        chain: q('[data-dm="chain"]'),
        ibLabel: q('[data-dm="ib-label"]'), icLabel: q('[data-dm="ic-label"]'), ieLabel: q('[data-dm="ie-label"]'),
        vceLabel: q('[data-dm="vce-label"]'), vbeLabel: q('[data-dm="vbe-label"]'),
        ibCurve: q('[data-dm="ib-curve"]'), qDot: q('[data-dm="q"]'), qRing: q('[data-dm="q-ring"]'),
        qH: q('[data-dm="q-h"]'), qV: q('[data-dm="q-v"]'), qT: q('[data-dm="q-t"]'),
        xvLine: q('[data-dm="xv-line"]'), xvQ: q('[data-dm="xv-q"]'), xvT: q('[data-dm="xv-t"]'),
        depEb: q('[data-dm="dep-eb"]'), depCb: q('[data-dm="dep-cb"]'),
        ebLabel: q('[data-dm="eb-label"]'), cbLabel: q('[data-dm="cb-label"]'),
        mechState: q('[data-dm="mech-state"]'), satNote: q('[data-dm="sat-note"]'),
        eDots: [...root.querySelectorAll('[data-dm="e-dots"] circle')],
        hDots: [...root.querySelectorAll('[data-dm="h-dots"] circle')],
        satEDots: [...root.querySelectorAll('[data-dm="sat-e-dots"] circle')],
        satHDots: [...root.querySelectorAll('[data-dm="sat-h-dots"] circle')],
        playBtn: q('[data-act="play"]'),
      };
      this.keyBtns = [...root.querySelectorAll('[data-key]')];
      this.ac = new AbortController();
      this.bind();
      this.setActiveKey('active');
      this.render();
    }

    bind() {
      const on = (el, ev, fn) => el && el.addEventListener(ev, fn, { signal: this.ac.signal });
      on(this.el.playBtn, 'click', () => this.toggle());
      on(this.q('[data-act="step"]'), 'click', () => this.step());
      on(this.q('[data-act="reset"]'), 'click', () => this.reset());
      this.keyBtns.forEach(b => on(b, 'click', () => this.setKey(b.dataset.key)));
      on(document, 'visibilitychange', () => { if (document.hidden && this.playing) this.pause(); });
    }

    setActiveKey(id) {
      this.keyBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.key === id ? 'true' : 'false'));
    }

    toggle() {
      if (this.playing) { this.pause(); return; }
      this.playing = true;
      this.last = 0;
      this.setActiveKey(null);
      this.el.playBtn.textContent = '❚❚ 暂停';
      this.el.playBtn.setAttribute('aria-pressed', 'true');
      this.raf = requestAnimationFrame(this.tick);
    }

    pause() {
      this.playing = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.el.playBtn) {
        this.el.playBtn.textContent = '▶ 播放扫描';
        this.el.playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    tick(ts) {
      if (!this.playing) return;
      if (!this.root.isConnected) { this.destroy(); return; }
      if (!this.last) this.last = ts;
      const dt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      this.animT += dt;
      this.phase += dt * 0.38;
      if (this.phase >= 2) this.phase -= 2;
      this.render();
      this.raf = requestAnimationFrame(this.tick);
    }

    step() {
      this.pause();
      this.phase = (this.phase + 0.05) % 2;
      this.animT += 0.08;
      this.setActiveKey(null);
      this.render();
    }

    reset() {
      this.pause();
      this.phase = 0;
      this.animT = 0;
      this.setActiveKey('cut');
      this.render();
    }

    setKey(id) {
      const k = BJT_KEYMAP[id];
      if (!k) return;
      this.pause();
      this.phase = k.vI / BJT_VIS.vIMax;
      this.animT = 0.35;
      this.setActiveKey(id);
      this.render();
    }

    render() {
      const vI = BJT_VIS.vIMax * (1 - Math.abs(1 - this.phase));
      const s = bjtSolve(vI);
      const el = this.el;
      const stateName = { cut: '截止', active: '放大', sat: '饱和' }[s.region];
      el.state.textContent = s.region === 'active' && s.VBC > 0 ? '临近饱和' : stateName;
      el.state.className = 'dm-state ' + s.region;
      el.vi.textContent = fmtV(vI);
      el.ib.textContent = fmtUA(s.IB);
      el.ic.textContent = fmtmA(s.IC);
      el.vce.textContent = fmtV(s.VCE);
      el.vbc.textContent = fmtV(s.VBC);
      el.beta.textContent = s.IB ? (s.IC/s.IB).toFixed(1) : '—';
      if (el.betaLabel.firstChild) el.betaLabel.firstChild.nodeValue = s.region === 'sat' ? '强迫 β = ' : 'IC / IB = ';
      el.ibLabel.innerHTML = 'I<tspan baseline-shift="sub" font-size="7">B</tspan> = ' + fmtUA(s.IB);
      el.icLabel.innerHTML = 'I<tspan baseline-shift="sub" font-size="7">C</tspan> = ' + fmtmA(s.IC);
      el.ieLabel.innerHTML = 'I<tspan baseline-shift="sub" font-size="7">E</tspan> = ' + fmtmA(s.IE);
      el.vceLabel.innerHTML = 'V<tspan baseline-shift="sub" font-size="7">CE</tspan> = ' + fmtV(s.VCE);
      el.vbeLabel.innerHTML = 'V<tspan baseline-shift="sub" font-size="7">BE</tspan> = ' + fmtV(s.vBE);

      if (s.region === 'cut') {
        el.chain.innerHTML = `<b>v<sub>I</sub> = ${fmtV(vI)} ≤ 0.7 V</b>：发射结未正偏 → I<sub>B</sub>≈0，I<sub>C</sub>≈0 → v<sub>O</sub>≈V<sub>CC</sub>。此时 Q 在负载线最右端，输出高电平。`;
      } else if (s.region === 'active' && s.VBC > 0) {
        el.chain.innerHTML = '集电极已低于基极，集电结开始正偏。曲线在这一小段仍用放大区公式外推到 0.2 V 的钳位点，实际电流增益会逐渐下降。';
      } else if (s.region === 'active') {
        el.chain.innerHTML = `<b>放大</b>：v<sub>I</sub> ↑ → I<sub>B</sub> ↑ → I<sub>C</sub> ↑ → R<sub>C</sub> 压降 ↑ → v<sub>CE</sub> ↓。所以 <b>v<sub>O</sub> 与 v<sub>I</sub> 反相</b>；Q 沿负载线向左上方移动。`;
      } else {
        el.chain.innerHTML = `<b>饱和</b>：负载线限制 I<sub>C</sub> ≈ (V<sub>CC</sub>−V<sub>CE(sat)</sub>)/R<sub>C</sub> = ${fmtmA(s.IC)}，β<sub>forced</sub> = ${s.forced.toFixed(1)}。集电结正偏：C→B 电子与 B→C 空穴使 I<sub>B</sub> 增大，而 I<sub>C</sub> 不再按 βI<sub>B</sub> 增加。`;
      }

      this.drawQ(s);
      this.drawXfer(vI, s);
      this.drawMech(s);
      this.drawDots(s);
    }

    drawQ(s) {
      const L = 54, R = 14, T = 24, B = 42, W = 460, H = 330;
      const pw = W - L - R, ph = H - T - B;
      const X = v => L + pw * clamp(v, 0, 13) / 13;
      const Y = v => H - B - ph * clamp(v, 0, 6.2) / 6.2;
      const qx = X(s.VCE), qy = Y(s.IC * 1e3);
      const el = this.el;
      el.ibCurve.setAttribute('d', s.IB > 0 ? bjtFamilyPath(s.IB) : 'M0 0L13 0');
      el.qDot.setAttribute('cx', qx); el.qDot.setAttribute('cy', qy);
      el.qRing.setAttribute('cx', qx); el.qRing.setAttribute('cy', qy);
      el.qH.setAttribute('x1', L); el.qH.setAttribute('y1', qy);
      el.qH.setAttribute('x2', qx); el.qH.setAttribute('y2', qy);
      el.qV.setAttribute('x1', qx); el.qV.setAttribute('y1', T);
      el.qV.setAttribute('x2', qx); el.qV.setAttribute('y2', H - B);
      el.qT.setAttribute('x', clamp(qx + 8, L + 4, W - R - 12));
      el.qT.setAttribute('y', clamp(qy - 8, T + 12, H - B - 5));
      el.qT.textContent = 'Q';
    }

    drawXfer(vI, s) {
      const L = 54, R = 14, T = 24, B = 42, W = 460, H = 300;
      const pw = W - L - R, ph = H - T - B;
      const X = v => L + pw * clamp(v, 0, 4) / 4;
      const Y = v => H - B - ph * clamp(v, 0, 12.6) / 12.6;
      const el = this.el;
      const x = X(vI), y = Y(s.VCE);
      el.xvLine.setAttribute('x1', x); el.xvLine.setAttribute('x2', x);
      el.xvLine.setAttribute('y1', T); el.xvLine.setAttribute('y2', H - B);
      el.xvQ.setAttribute('cx', x); el.xvQ.setAttribute('cy', y);
      el.xvT.setAttribute('x', clamp(x + 8, L + 4, W - R - 12));
      el.xvT.setAttribute('y', clamp(y - 8, T + 12, H - B - 5));
      el.xvT.textContent = 'Q';
    }

    drawMech(s) {
      const el = this.el;
      const dep = s.region === 'cut' ? [9, 11] : s.region === 'active' ? [5, 9] : [4, 3];
      el.depEb.setAttribute('x', 120 - dep[0] / 2); el.depEb.setAttribute('width', dep[0]);
      el.depCb.setAttribute('x', 180 - dep[1] / 2); el.depCb.setAttribute('width', dep[1]);
      el.ebLabel.textContent = s.region === 'cut' ? 'EBJ 未导通' : 'EBJ 正偏';
      el.cbLabel.textContent = s.VBC > 0 ? 'CBJ 正偏' : 'CBJ 反偏';
      el.mechState.textContent = s.region === 'cut'
        ? '截止：发射结注入可忽略'
        : s.region === 'active'
          ? (s.VBC > 0 ? '过渡段：集电结开始正偏，接近饱和' : '放大：发射结正偏、集电结反偏')
          : '饱和：两个结都正偏';
      el.satNote.textContent = s.region === 'sat' ? 'CBJ 正偏：额外的 C→B 电子与 B→C 空穴增加 I_B' : '';
    }

    drawDots(s) {
      const el = this.el;
      const icN = clamp(s.IC / 5.4e-3, 0, 1.2);
      const speed = 0.10 + 0.62 * icN;
      const eVis = s.IC > 1e-6;
      el.eDots.forEach((d, i) => {
        const p = (this.animT * speed + i / el.eDots.length) % 1;
        d.setAttribute('cx', (58 + 282 * p).toFixed(1));
        d.setAttribute('cy', (124 + 2.1 * Math.sin(6.283 * (p * 3 + i))).toFixed(1));
        d.setAttribute('opacity', eVis ? '1' : '0');
      });
      const ibVis = s.IB > 1e-9;
      const hSpeed = 0.08 + 0.42 * clamp(s.IB / 66e-6, 0, 1);
      el.hDots.forEach((d, i) => {
        const p = (this.animT * hSpeed + i / el.hDots.length) % 1;
        d.setAttribute('cx', (168 - 64 * p).toFixed(1));
        d.setAttribute('cy', (158 + 1.8 * Math.sin(6.283 * (p * 2 + i))).toFixed(1));
        d.setAttribute('opacity', ibVis ? '1' : '0');
      });
      const sat = s.region === 'sat';
      el.satEDots.forEach((d, i) => {
        const p = (this.animT * speed * 0.85 + i / el.satEDots.length) % 1;
        d.setAttribute('cx', (338 - 154 * p).toFixed(1));
        d.setAttribute('cy', (108 + 1.6 * Math.sin(6.283 * (p * 2 + i))).toFixed(1));
        d.setAttribute('opacity', sat ? '1' : '0');
      });
      el.satHDots.forEach((d, i) => {
        const p = (this.animT * hSpeed * 0.85 + i / el.satHDots.length) % 1;
        d.setAttribute('cx', (184 + 154 * p).toFixed(1));
        d.setAttribute('cy', (172 + 1.6 * Math.sin(6.283 * (p * 2 + i))).toFixed(1));
        d.setAttribute('opacity', sat ? '1' : '0');
      });
    }

    destroy() {
      this.pause();
      if (this.ac) this.ac.abort();
      this.root.innerHTML = '';
      this.root.__deviceMotion = null;
      instances.delete(this);
    }
  }

  /* =====================================================================
     第 8 章：增强型 NMOS 共源，固定 R_D。分段平方律模型：
     截止 V_GS≤V_th；三极管区 V_DS<V_OV；饱和 V_DS≥V_OV。
     饱和区忽略沟道长度调制（λ=0）。沟道形状为定性示意。
     ===================================================================== */
  const MOS = { VDD: 10, RD: 4700, kn: 1e-3, Vth: 1.0 };
  const MOS_VIS = { vGSMax: 4 };
  const MOS_EDGE = (() => {
    const a = 0.5 * MOS.kn * MOS.RD;
    const x = (-1 + Math.sqrt(1 + 4 * a * MOS.VDD)) / (2 * a);
    return MOS.Vth + x;
  })();
  const MOS_KEYS = [
    { id: 'cut', label: '截止', vGS: 0.6 },
    { id: 'onset', label: '反型建立', vGS: 1.2 },
    { id: 'sat', label: '饱和/夹断', vGS: 2.2 },
    { id: 'pinch', label: '临界夹断', vGS: MOS_EDGE },
    { id: 'tri', label: '线性区', vGS: 3.6 },
  ];
  const MOS_KEYMAP = Object.fromEntries(MOS_KEYS.map(k => [k.id, k]));

  function mosId(vgs, vds) {
    if (vgs <= MOS.Vth || vds <= 0) return 0;
    const vov = vgs - MOS.Vth;
    if (vds < vov) return MOS.kn * (vov * vds - 0.5 * vds * vds);
    return 0.5 * MOS.kn * vov * vov;
  }
  function mosSolve(vgs) {
    const p = MOS;
    if (vgs <= p.Vth) {
      return { region: 'cut', vGS: vgs, VOV: vgs - p.Vth, ID: 0, VDS: p.VDD };
    }
    const vov = vgs - p.Vth;
    const ids = 0.5 * p.kn * vov * vov;
    const vdsSat = p.VDD - ids * p.RD;
    if (vdsSat >= vov - 1e-9) {
      const edge = Math.abs(vdsSat - vov) < 1e-8;
      return { region: edge ? 'edge' : 'sat', vGS: vgs, VOV: vov, ID: ids, VDS: vdsSat };
    }
    const a = 0.5 * p.kn * p.RD;
    const b = -(1 + p.kn * p.RD * vov);
    const disc = Math.max(0, b * b - 4 * a * p.VDD);
    const r1 = (-b - Math.sqrt(disc)) / (2 * a);
    const r2 = (-b + Math.sqrt(disc)) / (2 * a);
    let vds = (r1 >= 0 && r1 <= vov + 1e-9) ? r1 : r2;
    vds = clamp(vds, 0, Math.min(p.VDD, vov));
    return { region: 'tri', vGS: vgs, VOV: vov, ID: (p.VDD - vds) / p.RD, VDS: vds };
  }
  function mosFamilyPath(vgs) {
    if (vgs <= MOS.Vth) return 'M0 0';
    let d = '';
    for (let i = 0; i <= 36; i++) {
      const vds = MOS.VDD * i / 36;
      d += (i ? 'L' : 'M') + vds.toFixed(2) + ' ' + (mosId(vgs, vds) * 1e3).toFixed(3);
    }
    return d;
  }
  function mosXferPath() {
    let d = '';
    for (let i = 0; i <= 240; i++) {
      const vgs = MOS_VIS.vGSMax * i / 240, s = mosSolve(vgs);
      d += (i ? 'L' : 'M') + vgs.toFixed(3) + ' ' + (s.ID * 1e3).toFixed(3);
    }
    return d;
  }
  function mosBoundaryPath() {
    let d = '';
    for (let i = 0; i <= 50; i++) {
      const vds = 2.7 * i / 50;
      d += (i ? 'L' : 'M') + vds.toFixed(3) + ' ' + (0.5 * MOS.kn * vds * vds * 1e3).toFixed(3);
    }
    return d;
  }

  function mosTemplate(id) {
    return `<div class="dm dm-mos" data-dm-kind="mos">
      <div class="dm-head"><div class="dm-title"><span class="dm-badge">第 8 章</span>增强 NMOS 共源：反型 → 夹断 / 线性</div>
        <div class="dm-sub">固定 R<sub>D</sub>、输入 v<sub>GS</sub> 扫描。分清“截止（没有沟道）”与“夹断（沟道在漏端消失，电流仍流）”。</div></div>
      <div class="dm-controls">
        <button class="dm-btn primary" data-act="play" aria-pressed="false">▶ 播放扫描</button>
        <button class="dm-btn" data-act="step">⏭ 单步</button>
        <button class="dm-btn" data-act="reset">↺ 重置</button>
        <span class="dm-keys-label">关键状态</span>
        <span class="dm-keys" role="group" aria-label="NMOS 关键状态">${MOS_KEYS.map(k => `<button class="dm-key" data-key="${k.id}" aria-pressed="false">${k.label}</button>`).join('')}</span>
        <span class="dm-live">v<sub>GS</sub> = <b data-dm="vgs">2.20 V</b></span>
      </div>
      <div class="dm-grid">
        <section class="dm-panel"><h4>教学电路 <span>增强 NMOS 共源，固定 R_D</span></h4>${mosCircuitSvg(id)}</section>
        <section class="dm-panel"><h4>内部机理 <span>反型层与夹断点</span></h4>${mosMechSvg(id)}</section>
        <section class="dm-panel"><h4>输出特性与直流负载线 <span>i<sub>D</sub>–v<sub>DS</sub></span></h4>${mosCurveSvg(id)}</section>
        <section class="dm-panel"><h4>栅压与漏极电流 <span>固定负载下的状态</span></h4>${mosXferSvg(id)}</section>
      </div>
      <div class="dm-readout">
        <span class="dm-state" data-dm="state">饱和（夹断）</span>
        <span class="dm-chip">V<sub>OV</sub> = <b data-dm="vov">1.20 V</b></span>
        <span class="dm-chip">I<sub>D</sub> = <b data-dm="id">0.72 mA</b></span>
        <span class="dm-chip">V<sub>DS</sub> = <b data-dm="vds">6.62 V</b></span>
        <span class="dm-chip" data-dm="yp-label">漏端沟道 <b data-dm="yp">夹断</b></span>
      </div>
      <div class="dm-chain" data-dm="chain"></div>
      <div class="dm-note"><b>模型假设</b>：增强型 NMOS，V<sub>th</sub>=1.0 V，k<sub>n</sub>=μ<sub>n</sub>C<sub>ox</sub>W/L=1.0 mA/V²，λ=0；V<sub>DD</sub>=10 V，R<sub>D</sub>=4.7 kΩ；体与源短接，忽略体效应。分段平方律模型（截止 / 三极管区 / 饱和），饱和区忽略沟道长度调制；截面定性表示漏端附近的夹断和高场区，图中长度未按比例绘制。平方律仅用于计算端口电流。数值为自拟教学值，不取自课件原题。<br>
      <b>依据</b>：chap_8m_补充 PDF p5–9（沟道形成）、p10–17（线性、变阻、预夹断、饱和）；chap_8m PDF p9–10（电流方程与输出特性）、p21–27（偏置与图解法）、p28–31（共源放大器）。</div>
    </div>`;
  }

  function mosCircuitSvg(id) {
    return `<svg class="dm-svg" viewBox="0 0 420 330" role="img" aria-label="增强 NMOS 共源教学电路，VDD 10 伏，RD 4.7 千欧，输入 vGS，输出 vO">
      <defs>${marker(id + '-m-arr', '#0d7c86')}</defs>
      ${wire(70, 32, 320, 32)}
      <text class="dm-lab" x="195" y="20" text-anchor="middle">+V<tspan baseline-shift="sub" font-size="8">DD</tspan> = 10 V</text>
      ${wire(300, 32, 300, 48)}${resistorV(300, 48, 112)}${wire(300, 112, 300, 130)}
      <text class="dm-t2" x="311" y="62">R<tspan baseline-shift="sub" font-size="8">D</tspan> = 4.7 kΩ</text>
      <text class="dm-t2" data-dm="id-label" x="311" y="84">I<tspan baseline-shift="sub" font-size="8">D</tspan> = 0.72 mA</text>
      <circle class="dm-junc" cx="300" cy="130" r="2.7"/>
      ${pathWire('M300 130H352')}<circle class="dm-junc" cx="352" cy="130" r="3"/>
      <text class="dm-lab" x="360" y="126">v<tspan baseline-shift="sub" font-size="8">O</tspan></text><text class="dm-t3" x="360" y="140">输出</text>
      ${pathWire('M300 130L238 150')}${pathWire('M238 145V163M238 171V179M238 187V195')}
      <path class="dm-wire" d="M225 145V195"/>${pathWire('M238 190L300 208')}
      
      ${pathWire('M225 170H160')}${pathWire('M82 157V146H111V170H160')}
      ${sourceV(82, 170)}${wire(82, 183, 82, 265)}
      <text class="dm-lab" x="34" y="166">v<tspan baseline-shift="sub" font-size="8">GS</tspan></text><text class="dm-t3" x="34" y="180">输入</text>
      <text class="dm-t3" x="190" y="158" text-anchor="middle">I<tspan baseline-shift="sub" font-size="8">G</tspan> = 0</text>
      <text class="dm-t3" x="213" y="166" text-anchor="end">G</text>
      <text class="dm-t3" x="310" y="118">D</text>
      <text class="dm-t2" x="255" y="168">NMOS</text><text class="dm-t3" x="255" y="186">增强型</text>
      ${wire(300, 208, 300, 265)}
      <text class="dm-t2" data-dm="vds-label" x="330" y="176">V<tspan baseline-shift="sub" font-size="8">DS</tspan> = 6.62 V</text>
      <text class="dm-t2" data-dm="vgs-label" x="180" y="210" text-anchor="end">V<tspan baseline-shift="sub" font-size="8">GS</tspan> = 2.20 V</text>
      ${pathWire('M238 175H247V220H300')}${arrowHead(238,175,-1,0,'#3d4d66')}<text class="dm-t3" x="269" y="232" text-anchor="middle">B = S</text>
      ${wire(82, 265, 300, 265)}${ground(191, 265)}
      <text class="dm-t3" x="191" y="300" text-anchor="middle">地 0 V</text>
      ${arrowHead(300, 102, 0, 1, '#0d7c86')}
      <text class="dm-t3" x="310" y="222">S</text>
    </svg>`;
  }

  function mosMechSvg(id) {
    return `<svg class="dm-svg" viewBox="0 0 420 300" role="img" aria-label="增强 NMOS 截面：栅氧化层、反型层、源漏与夹断点">
      <text class="dm-lab" data-dm="mech-state" x="210" y="22" text-anchor="middle">饱和：漏端夹断，沟道仍导电</text>
      <text class="dm-t3" data-dm="vgs-mech" x="60" y="44" text-anchor="middle">V_GS</text>
      <text class="dm-t3" data-dm="vov-mech" x="210" y="44" text-anchor="middle">V_OV</text>
      <text class="dm-t3" data-dm="vds-mech" x="350" y="44" text-anchor="middle">V_DS</text>
      <rect class="dm-sub" x="40" y="130" width="340" height="90" rx="3"/>
      <rect class="dm-nplus" x="60" y="130" width="60" height="55" rx="2"/>
      <rect class="dm-nplus" x="300" y="130" width="60" height="55" rx="2"/>
      <rect class="dm-ox" x="120" y="122" width="180" height="8"/>
      <rect class="dm-gate" x="120" y="94" width="180" height="28" rx="2"/>
      <text class="dm-t3" x="210" y="84" text-anchor="middle">G 栅</text>
      <text class="dm-t3" x="307" y="126" style="fill:#8a6a2b">氧化层</text>
      <text class="dm-t3" x="90" y="145" text-anchor="middle">n+ 源</text>
      <text class="dm-t3" x="330" y="145" text-anchor="middle">n+ 漏</text>
      <text class="dm-t3" x="210" y="207" text-anchor="middle">P 型衬底（B 接 S）</text>
      <rect class="dm-dep2" data-dm="dep-cut" x="140" y="126" width="140" height="48"/>
      <text class="dm-t3" data-dm="dep-cut-t" x="210" y="170" text-anchor="middle">耗尽区，无沟道</text>
      <rect class="dm-dep2" data-dm="pinch-region" x="280" y="127" width="20" height="18" opacity="0"/>
      <path class="dm-chan" data-dm="chan" d=""/>
      <path class="dm-chan-edge" data-dm="chan-edge" d=""/>
      <line class="dm-dash" data-dm="pinch-line" x1="280" y1="120" x2="280" y2="185" opacity="0"/>
      <text class="dm-t3" data-dm="pinch-label" x="285" y="188" style="fill:#b35c00" opacity="0">夹断点</text>
      <path class="dm-wire" data-dm="highfield" d="M282 140H300" style="stroke:#b35c00;stroke-dasharray:4 3" opacity="0"/>
      <text class="dm-t3" data-dm="highfield-t" x="300" y="137" style="fill:#b35c00" opacity="0">高场</text>
      <text class="dm-t3" data-dm="chan-label" x="210" y="190" text-anchor="middle" style="fill:#0d7c86"></text>
      <g data-dm="e-dots">${Array.from({ length: 9 }, () => '<circle class="dm-dot-e" r="3.2"/>').join('')}</g>
      <text class="dm-t3" x="210" y="267" text-anchor="middle">电子流 S→D</text>
      ${wire(90, 185, 90, 235)}${wire(330, 185, 330, 235)}${wire(210, 220, 210, 235)}
      <text class="dm-lab2" x="90" y="250" text-anchor="middle">S</text>
      <text class="dm-lab2" x="330" y="250" text-anchor="middle">D</text>
      <text class="dm-lab2" x="210" y="250" text-anchor="middle">B</text>
      <circle class="dm-dot-e" cx="44" cy="278" r="3.4"/><text class="dm-t3" x="52" y="282">电子</text>
      <text class="dm-t3" x="210" y="282" text-anchor="middle">夹断 ≠ 截止：夹断处仍有强电场，电流连续</text>
    </svg>`;
  }

  function mosCurveSvg(id) {
    const L = 54, R = 14, T = 24, B = 42, W = 460, H = 330;
    const pw = W - L - R, ph = H - T - B;
    const X = v => L + pw * v / 10, Y = v => H - B - ph * clamp(v, 0, 3.6) / 3.6;
    let g = '';
    for (let x = 0; x <= 10; x += 2) g += `<line class="dm-gridline" x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${H - B}"/><text class="dm-t3" x="${X(x)}" y="${H - B + 14}" text-anchor="middle">${x}</text>`;
    for (let y = 0; y <= 3.5; y += 0.5) g += `<line class="dm-gridline" x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="dm-t3" x="${L - 5}" y="${Y(y) + 3}" text-anchor="end">${y}</text>`;
    const clip = id + '-g-clip';
    g += `<clipPath id="${clip}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath><g clip-path="url(#${clip})">`;
    [1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6].forEach(vg => {
      g += `<path class="dm-fam" d="${mosFamilyPath(vg)}" transform="translate(${L} ${H - B}) scale(${pw / 10} ${-ph / 3.6})"/>`;
    });
    g += `<path class="dm-bound" d="${mosBoundaryPath()}" transform="translate(${L} ${H - B}) scale(${pw / 10} ${-ph / 3.6})"/>`;
    g += `<path class="dm-cur" data-dm="mos-cur" d="" transform="translate(${L} ${H - B}) scale(${pw / 10} ${-ph / 3.6})"/></g>`;
    const y0 = (MOS.VDD / MOS.RD) * 1e3;
    g += `<line class="dm-load" x1="${X(0)}" y1="${Y(y0)}" x2="${X(MOS.VDD)}" y2="${Y(0)}"/>`;
    g += `<text class="dm-t3" x="${X(7.2)}" y="${Y(.71)}" text-anchor="middle" style="fill:#b35c00">直流负载线</text>`;
    g += `<text class="dm-t3" x="${X(2.55)}" y="${Y(3.25)}" style="fill:#6a4fb3">夹断边界</text>`;
    g += `<text class="dm-t3" x="${L + 8}" y="${T + 12}">V<tspan baseline-shift="sub" font-size="7">GS</tspan> 增大 ↑</text>`;
    g += `<line class="dm-axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="dm-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    g += `<text class="dm-t3" x="${(W + L - R) / 2}" y="${H - 5}" text-anchor="middle">v<tspan baseline-shift="sub" font-size="7">DS</tspan> / V</text>`;
    g += `<text class="dm-t3" x="14" y="${(H - B + T) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(H - B + T) / 2})">i<tspan baseline-shift="sub" font-size="7">D</tspan> / mA</text>`;
    g += `<line class="dm-dash" data-dm="vov-line" x1="0" y1="${T}" x2="0" y2="${H - B}"/><text class="dm-t3" data-dm="vov-t" x="0" y="${T + 26}" style="fill:#6a4fb3">V<tspan baseline-shift="sub" font-size="7">OV</tspan></text>`;
    g += `<g data-dm="q-group"><line class="dm-dash" data-dm="q-h" x1="${L}" y1="0" x2="0" y2="0"/><line class="dm-dash" data-dm="q-v" x1="0" y1="${T}" x2="0" y2="${H - B}"/><circle class="dm-qring" data-dm="q-ring" r="7"/><circle class="dm-q" data-dm="q" r="4"/><text class="dm-lab2" data-dm="q-t" x="0" y="0">Q</text></g>`;
    return `<svg class="dm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="NMOS 输出特性曲线族、夹断边界、直流负载线与 Q 点">${g}</svg>`;
  }

  function mosXferSvg(id) {
    const L = 54, R = 14, T = 24, B = 42, W = 460, H = 300;
    const pw = W - L - R, ph = H - T - B;
    const X = v => L + pw * clamp(v, 0, 4) / 4, Y = v => H - B - ph * clamp(v, 0, 2.2) / 2.2;
    let g = '';
    g += `<rect class="dm-band-cut" x="${L}" y="${T}" width="${X(MOS.Vth) - L}" height="${ph}"/>`;
    g += `<rect class="dm-band-act" x="${X(MOS.Vth)}" y="${T}" width="${X(MOS_EDGE) - X(MOS.Vth)}" height="${ph}"/>`;
    g += `<rect class="dm-band-tri" x="${X(MOS_EDGE)}" y="${T}" width="${W - R - X(MOS_EDGE)}" height="${ph}"/>`;
    g += `<text class="dm-t3" x="${(L + X(MOS.Vth)) / 2}" y="${T + 13}" text-anchor="middle">截止</text>`;
    g += `<text class="dm-t3" x="${(X(MOS.Vth) + X(MOS_EDGE)) / 2}" y="${T + 13}" text-anchor="middle" style="fill:#0d7c86">饱和（夹断）</text>`;
    g += `<text class="dm-t3" x="${(X(MOS_EDGE) + W - R) / 2}" y="${T + 13}" text-anchor="middle" style="fill:#6a4fb3">线性区</text>`;
    for (let x = 0; x <= 4; x++) g += `<line class="dm-gridline" x1="${X(x)}" x2="${X(x)}" y1="${T}" y2="${H - B}"/><text class="dm-t3" x="${X(x)}" y="${H - B + 14}" text-anchor="middle">${x}</text>`;
    for (let y = 0; y <= 2; y += 0.5) g += `<line class="dm-gridline" x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="dm-t3" x="${L - 5}" y="${Y(y) + 3}" text-anchor="end">${y}</text>`;
    const clip = id + '-x-clip';
    g += `<clipPath id="${clip}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath><g clip-path="url(#${clip})"><path class="dm-cur" d="${mosXferPath()}" transform="translate(${L} ${H - B}) scale(${pw / 4} ${-ph / 2.2})"/></g>`;
    g += `<line class="dm-dash" x1="${X(MOS.Vth)}" x2="${X(MOS.Vth)}" y1="${T}" y2="${H - B}"/><line class="dm-dash" x1="${X(MOS_EDGE)}" x2="${X(MOS_EDGE)}" y1="${T}" y2="${H - B}"/>`;
    g += `<text class="dm-t3" x="${X(MOS.Vth) + 3}" y="${H - B - 5}">V_th</text><text class="dm-t3" x="${X(MOS_EDGE) + 3}" y="${H - B - 5}">边界</text>`;
    g += `<line class="dm-axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="dm-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    g += `<text class="dm-t3" x="${(W + L - R) / 2}" y="${H - 5}" text-anchor="middle">v<tspan baseline-shift="sub" font-size="7">GS</tspan> / V</text>`;
    g += `<text class="dm-t3" x="14" y="${(H - B + T) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(H - B + T) / 2})">i<tspan baseline-shift="sub" font-size="7">D</tspan> / mA</text>`;
    g += `<line class="dm-dash" data-dm="xv-line" x1="0" y1="${T}" x2="0" y2="${H - B}"/><circle class="dm-q" data-dm="xv-q" r="4"/><text class="dm-lab2" data-dm="xv-t" x="0" y="0">Q</text>`;
    return `<svg class="dm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="NMOS 固定负载转移特性，Q 随 vGS 从饱和进入线性">${g}</svg>`;
  }

  class MosMotion {
    constructor(root) {
      this.root = root;
      this.id = 'dm-mos-' + (++UID);
      this.phase = 2.2 / MOS_VIS.vGSMax;
      this.animT = 0.35;
      this.playing = false;
      this.last = 0;
      this.raf = 0;
      this.tick = this.tick.bind(this);
      root.innerHTML = mosTemplate(this.id);
      const q = s => root.querySelector(s);
      this.q = q;
      this.el = {
        vgs: q('[data-dm="vgs"]'), state: q('[data-dm="state"]'),
        vov: q('[data-dm="vov"]'), id: q('[data-dm="id"]'), vds: q('[data-dm="vds"]'),
        yp: q('[data-dm="yp"]'), ypLabel: q('[data-dm="yp-label"]'), chain: q('[data-dm="chain"]'),
        idLabel: q('[data-dm="id-label"]'), vdsLabel: q('[data-dm="vds-label"]'), vgsLabel: q('[data-dm="vgs-label"]'),
        mosCur: q('[data-dm="mos-cur"]'), qDot: q('[data-dm="q"]'), qRing: q('[data-dm="q-ring"]'),
        qH: q('[data-dm="q-h"]'), qV: q('[data-dm="q-v"]'), qT: q('[data-dm="q-t"]'),
        vovLine: q('[data-dm="vov-line"]'), vovT: q('[data-dm="vov-t"]'),
        xvLine: q('[data-dm="xv-line"]'), xvQ: q('[data-dm="xv-q"]'), xvT: q('[data-dm="xv-t"]'),
        mechState: q('[data-dm="mech-state"]'), vgsMech: q('[data-dm="vgs-mech"]'),
        vovMech: q('[data-dm="vov-mech"]'), vdsMech: q('[data-dm="vds-mech"]'),
        depCut: q('[data-dm="dep-cut"]'), depCutT: q('[data-dm="dep-cut-t"]'),
        chan: q('[data-dm="chan"]'), chanEdge: q('[data-dm="chan-edge"]'),
        pinchRegion: q('[data-dm="pinch-region"]'), pinchLine: q('[data-dm="pinch-line"]'),
        pinchLabel: q('[data-dm="pinch-label"]'), highfield: q('[data-dm="highfield"]'),
        highfieldT: q('[data-dm="highfield-t"]'), chanLabel: q('[data-dm="chan-label"]'),
        eDots: [...root.querySelectorAll('[data-dm="e-dots"] circle')],
        playBtn: q('[data-act="play"]'),
      };
      this.keyBtns = [...root.querySelectorAll('[data-key]')];
      this.ac = new AbortController();
      this.bind();
      this.setActiveKey('sat');
      this.render();
    }

    bind() {
      const on = (el, ev, fn) => el && el.addEventListener(ev, fn, { signal: this.ac.signal });
      on(this.el.playBtn, 'click', () => this.toggle());
      on(this.q('[data-act="step"]'), 'click', () => this.step());
      on(this.q('[data-act="reset"]'), 'click', () => this.reset());
      this.keyBtns.forEach(b => on(b, 'click', () => this.setKey(b.dataset.key)));
      on(document, 'visibilitychange', () => { if (document.hidden && this.playing) this.pause(); });
    }

    setActiveKey(id) {
      this.keyBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.key === id ? 'true' : 'false'));
    }

    toggle() {
      if (this.playing) { this.pause(); return; }
      this.playing = true;
      this.last = 0;
      this.setActiveKey(null);
      this.el.playBtn.textContent = '❚❚ 暂停';
      this.el.playBtn.setAttribute('aria-pressed', 'true');
      this.raf = requestAnimationFrame(this.tick);
    }

    pause() {
      this.playing = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.el.playBtn) {
        this.el.playBtn.textContent = '▶ 播放扫描';
        this.el.playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    tick(ts) {
      if (!this.playing) return;
      if (!this.root.isConnected) { this.destroy(); return; }
      if (!this.last) this.last = ts;
      const dt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      this.animT += dt;
      this.phase += dt * 0.36;
      if (this.phase >= 2) this.phase -= 2;
      this.render();
      this.raf = requestAnimationFrame(this.tick);
    }

    step() {
      this.pause();
      this.phase = (this.phase + 0.05) % 2;
      this.animT += 0.08;
      this.setActiveKey(null);
      this.render();
    }

    reset() {
      this.pause();
      this.phase = 0;
      this.animT = 0;
      this.setActiveKey('cut');
      this.render();
    }

    setKey(id) {
      const k = MOS_KEYMAP[id];
      if (!k) return;
      this.pause();
      this.phase = k.vGS / MOS_VIS.vGSMax;
      this.animT = 0.35;
      this.setActiveKey(id);
      this.render();
    }

    render() {
      const vgs = MOS_VIS.vGSMax * (1 - Math.abs(1 - this.phase));
      const s = mosSolve(vgs);
      const el = this.el;
      const stateMap = {
        cut: ['截止', 'cut'], sat: ['饱和（夹断）', 'satmos'],
        edge: ['临界夹断', 'edge'], tri: ['线性（三极管区）', 'tri'],
      };
      const st = stateMap[s.region] || stateMap.cut;
      el.state.textContent = st[0];
      el.state.className = 'dm-state ' + st[1];
      el.vgs.textContent = fmtV(vgs);
      el.vov.textContent = fmtV(s.VOV);
      el.id.textContent = fmtmA(s.ID);
      el.vds.textContent = fmtV(s.VDS);
      el.yp.textContent = ({cut:'无反型层', tri:'连续', edge:'刚夹断', sat:'夹断'})[s.region];
      el.idLabel.innerHTML = 'I<tspan baseline-shift="sub" font-size="7">D</tspan> = ' + fmtmA(s.ID);
      el.vdsLabel.innerHTML = 'V<tspan baseline-shift="sub" font-size="7">DS</tspan> = ' + fmtV(s.VDS);
      el.vgsLabel.innerHTML = 'V<tspan baseline-shift="sub" font-size="7">GS</tspan> = ' + fmtV(vgs);

      if (s.region === 'cut') {
        el.chain.innerHTML = `<b>v<sub>GS</sub> = ${fmtV(vgs)} ≤ V<sub>th</sub> = 1.0 V</b>：栅下没有反型层，源漏之间没有导电沟道 → I<sub>D</sub>=0。这是<b>截止</b>，不是夹断。`;
      } else if (s.region === 'tri') {
        el.chain.innerHTML = `<b>线性区（三极管区）</b>：V<sub>DS</sub> = ${fmtV(s.VDS)} &lt; V<sub>OV</sub> = ${fmtV(s.VOV)}，整条沟道都存在。I<sub>D</sub> = k<sub>n</sub>(V<sub>OV</sub>V<sub>DS</sub> − ½V<sub>DS</sub>²)，Q 靠近原点，管子像受 V<sub>GS</sub> 控制的可变电阻。`;
      } else if (s.region === 'edge') {
        el.chain.innerHTML = `<b>临界夹断</b>：V<sub>DS</sub> = V<sub>OV</sub> = ${fmtV(s.VOV)}，漏端沟道刚好消失；I<sub>D</sub> = ½k<sub>n</sub>V<sub>OV</sub>² = ${fmtmA(s.ID)}。固定栅压再增大漏压会进入饱和。本实验沿负载线继续增大栅压时，漏压会下降，下一段进入三极管区。`;
      } else {
        const near = vgs < 1.45 ? '本实验扫栅压，漏极通过电阻接电源。刚超过阈值时电阻压降很小，漏压很高，因此建立沟道后先进入饱和区。' : '';
        el.chain.innerHTML = `<b>饱和（夹断）</b>：V<sub>DS</sub> = ${fmtV(s.VDS)} ≥ V<sub>OV</sub> = ${fmtV(s.VOV)}，漏端沟道夹断，源端仍有反型层，电子通过沟道到达夹断点，再由强电场扫入漏区。I<sub>D</sub> ≈ ½k<sub>n</sub>V<sub>OV</sub>² = ${fmtmA(s.ID)}，几乎不随 V<sub>DS</sub> 变。${near}`;
      }

      this.drawQ(s);
      this.drawXfer(vgs, s);
      this.drawMech(vgs, s);
      this.drawDots(s);
    }

    drawQ(s) {
      const L = 54, R = 14, T = 24, B = 42, W = 460, H = 330;
      const pw = W - L - R, ph = H - T - B;
      const X = v => L + pw * clamp(v, 0, 10) / 10;
      const Y = v => H - B - ph * clamp(v, 0, 3.6) / 3.6;
      const el = this.el;
      const qx = X(s.VDS), qy = Y(s.ID * 1e3);
      el.mosCur.setAttribute('d', s.vGS > MOS.Vth ? mosFamilyPath(s.vGS) : 'M0 0L10 0');
      el.qDot.setAttribute('cx', qx); el.qDot.setAttribute('cy', qy);
      el.qRing.setAttribute('cx', qx); el.qRing.setAttribute('cy', qy);
      el.qH.setAttribute('x1', L); el.qH.setAttribute('y1', qy);
      el.qH.setAttribute('x2', qx); el.qH.setAttribute('y2', qy);
      el.qV.setAttribute('x1', qx); el.qV.setAttribute('y1', T);
      el.qV.setAttribute('x2', qx); el.qV.setAttribute('y2', H - B);
      el.qT.setAttribute('x', clamp(qx + 8, L + 4, W - R - 12));
      el.qT.setAttribute('y', clamp(qy - 8, T + 12, H - B - 5));
      el.qT.textContent = 'Q';
      const showVov = s.VOV > 0 && s.VOV < 10;
      const vx = X(s.VOV);
      el.vovLine.setAttribute('x1', vx); el.vovLine.setAttribute('x2', vx);
      el.vovLine.setAttribute('y1', T); el.vovLine.setAttribute('y2', H - B);
      el.vovLine.setAttribute('opacity', showVov ? '.8' : '0');
      el.vovT.setAttribute('x', clamp(vx + 4, L + 4, W - R - 26));
      el.vovT.setAttribute('y', T + 26);
      el.vovT.setAttribute('opacity', showVov ? '1' : '0');
    }

    drawXfer(vgs, s) {
      const L = 54, R = 14, T = 24, B = 42, W = 460, H = 300;
      const pw = W - L - R, ph = H - T - B;
      const X = v => L + pw * clamp(v, 0, 4) / 4;
      const Y = v => H - B - ph * clamp(v, 0, 2.2) / 2.2;
      const el = this.el;
      const x = X(vgs), y = Y(s.ID * 1e3);
      el.xvLine.setAttribute('x1', x); el.xvLine.setAttribute('x2', x);
      el.xvLine.setAttribute('y1', T); el.xvLine.setAttribute('y2', H - B);
      el.xvQ.setAttribute('cx', x); el.xvQ.setAttribute('cy', y);
      el.xvT.setAttribute('x', clamp(x + 8, L + 4, W - R - 12));
      el.xvT.setAttribute('y', clamp(y - 8, T + 12, H - B - 5));
      el.xvT.textContent = 'Q';
    }

    channelParams(vgs, s) {
      const tmax = clamp(4 + 5 * s.VOV, 4, 22);
      // Schematic placement only. The terminal-current model does not predict pinch-off length.
      const yp = s.region === 'sat' ? 1 - 0.08 * clamp((s.VDS - s.VOV) / MOS.VDD, 0, 1) : 1;
      return { tmax, yp };
    }

    drawMech(vgs, s) {
      const el = this.el;
      el.vgsMech.textContent = 'V_GS = ' + fmtV(vgs);
      el.vovMech.textContent = s.VOV > 0 ? 'V_OV = ' + fmtV(s.VOV) : 'V_OV ≤ 0';
      el.vdsMech.textContent = 'V_DS = ' + fmtV(s.VDS);
      const cut = s.region === 'cut';
      el.depCut.setAttribute('opacity', cut ? '1' : '0');
      el.depCutT.setAttribute('opacity', cut ? '1' : '0');
      if (cut) {
        el.chan.setAttribute('d', '');
        el.chanEdge.setAttribute('d', '');
        el.pinchRegion.setAttribute('opacity', '0');
        el.pinchLine.setAttribute('opacity', '0');
        el.pinchLabel.setAttribute('opacity', '0');
        el.highfield.setAttribute('opacity', '0');
        el.highfieldT.setAttribute('opacity', '0');
        el.chanLabel.textContent = '无沟道（截止）';
        el.mechState.textContent = '截止：V_GS < V_th，栅下无反型层';
        return;
      }
      const { tmax, yp } = this.channelParams(vgs, s);
      const x0 = 120, x1 = 300, top = 130;
      const endU = (s.region === 'sat' || s.region === 'edge') ? yp : 1;
      const n = 28, tops = [], bots = [];
      for (let i = 0; i <= n; i++) {
        const u = endU * i / n;
        const x = x0 + (x1 - x0) * u;
        let t;
        if (s.region === 'tri') t = tmax * (1 - (s.VDS / s.VOV) * u);
        else t = tmax * (1 - u / endU);
        t = Math.max(1.2, t);
        tops.push([x, top]);
        bots.push([x, top + t]);
      }
      let d = 'M' + tops.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
      d += 'L' + bots.slice().reverse().map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
      el.chan.setAttribute('d', d);
      el.chanEdge.setAttribute('d', d);
      const pinched = s.region === 'sat' || s.region === 'edge';
      const xp = x0 + (x1 - x0) * yp;
      el.pinchRegion.setAttribute('x', xp);
      el.pinchRegion.setAttribute('width', Math.max(0, 300 - xp));
      el.pinchRegion.setAttribute('opacity', pinched ? '.55' : '0');
      el.pinchLine.setAttribute('x1', xp); el.pinchLine.setAttribute('x2', xp);
      el.pinchLine.setAttribute('y1', 120); el.pinchLine.setAttribute('y2', 185);
      el.pinchLine.setAttribute('opacity', pinched ? '1' : '0');
      el.pinchLabel.setAttribute('x', clamp(xp + 4, 145, 345));
      el.pinchLabel.setAttribute('opacity', pinched ? '1' : '0');
      el.highfield.setAttribute('d', `M${(xp + 2).toFixed(1)} 140H300`);
      el.highfield.setAttribute('opacity', pinched ? '1' : '0');
      el.highfieldT.setAttribute('x', 302);
      el.highfieldT.setAttribute('opacity', s.region === 'sat' ? '1' : '0');
      el.chanLabel.textContent = s.region === 'tri'
        ? '整条沟道存在（V_DS < V_OV）'
        : s.region === 'edge'
          ? '临界夹断：漏端沟道刚好消失'
          : '漏端夹断，源端仍有沟道，电流继续流';
      el.mechState.textContent = s.region === 'tri'
        ? '线性：V_DS < V_OV，整条沟道存在'
        : s.region === 'edge'
          ? '临界夹断：V_DS = V_OV'
          : '饱和：V_DS ≥ V_OV，漏端夹断';
    }

    drawDots(s) {
      const el = this.el;
      const on = s.region !== 'cut';
      const speed = 0.12 + 0.62 * clamp(s.ID / 2e-3, 0, 1);
      const { tmax, yp } = this.channelParams(s.vGS, s);
      el.eDots.forEach((d, i) => {
        d.setAttribute('opacity', on ? '1' : '0');
        if (!on) return;
        const p = (this.animT * speed + i / el.eDots.length) % 1;
        const x = 80 + 260 * p;
        let y = 150;
        if (x >= 120 && x <= 300) {
          const u = (x - 120) / 180;
          if (s.region === 'tri') {
            const t = Math.max(1.2, tmax * (1 - (s.VDS / s.VOV) * u));
            y = 130 + t / 2;
          } else if (u < yp) {
            const t = Math.max(1.2, tmax * (1 - u / yp));
            y = 130 + t / 2;
          } else {
            y = yp < 1 ? 130 + 20 * (u - yp) / (1 - yp) : 130;
          }
        }
        d.setAttribute('cx', x.toFixed(1));
        d.setAttribute('cy', y.toFixed(1));
      });
    }

    destroy() {
      this.pause();
      if (this.ac) this.ac.abort();
      this.root.innerHTML = '';
      this.root.__deviceMotion = null;
      instances.delete(this);
    }
  }

  function collectMounts(root) {
    const scope = (root && root.querySelectorAll) ? root : document;
    const out = [];
    if (scope.nodeType === 1 && scope.matches && scope.matches('[data-device-motion]')) out.push(scope);
    if (scope.querySelectorAll) out.push(...scope.querySelectorAll('[data-device-motion]'));
    return [...new Set(out)];
  }

  const DeviceMotion = {
    __deviceMotion: true,
    version: '1.0',
    mount(root) {
      const nodes = collectMounts(root);
      nodes.forEach(node => {
        if (node.__deviceMotion) return;
        const kind = (node.getAttribute('data-device-motion') || '').trim().toLowerCase();
        try {
          let inst = null;
          if (kind === 'bjt') inst = new BjTMotion(node);
          else if (kind === 'mos') inst = new MosMotion(node);
          if (inst) {
            node.__deviceMotion = inst;
            instances.add(inst);
          } else {
            node.textContent = '[未知识别：data-device-motion="' + kind + '"]';
          }
        } catch (err) {
          node.textContent = '[器件动画初始化失败：' + (err && err.message ? err.message : '未知错误') + ']';
          if (window.console && console.error) console.error(err);
        }
      });
      return nodes.map(n => n.__deviceMotion).filter(Boolean);
    },
    dispose() {
      [...instances].forEach(inst => inst.destroy());
      instances.clear();
    },
  };
  window.DeviceMotion = DeviceMotion;
})();



