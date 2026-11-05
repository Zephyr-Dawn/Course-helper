/* 互动实验定义：window.LABS[id] = {title, chapter, desc, controls, update(p) -> {svg, out}} */
(function () {
  'use strict';
  const M = window.M;
  const COL = ['#0d7c86', '#b35c00', '#6a4fb3', '#1b7f3b', '#b3261e', '#5876a8'];
  const fmt = (x, d = 3) => {
    if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '—';
    const a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return x.toExponential(2).replace('e', '×10^').replace('+', '');
    return Number(x.toPrecision(d)).toString().replace('-', '−');
  };
  // 工程单位
  const eng = (x, unit, d = 3) => {
    if (!isFinite(x)) return (x > 0 ? '∞' : '—') + ' ' + unit;
    const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    const a = Math.abs(x);
    for (const [v, s] of P) if (a >= v * 0.9995) return fmt(x / v, d) + ' ' + s + unit;
    return fmt(x / 1e-12, d) + ' p' + unit;
  };
  const W = 560, H = 300, PAD = { l: 52, r: 14, t: 14, b: 38 };

  /** plot({series:[{x:[],y:[],color,dash,width,label}], xr, yr, xlog, xlabel, ylabel, marks:[{x,y,label}], hlines, vlines}) */
  function plot(o) {
    const xr = o.xr, yr = o.yr, lx = !!o.xlog;
    const X = v => PAD.l + (W - PAD.l - PAD.r) * ((lx ? Math.log10(v) : v) - (lx ? Math.log10(xr[0]) : xr[0])) / ((lx ? Math.log10(xr[1]) : xr[1]) - (lx ? Math.log10(xr[0]) : xr[0]));
    const Y = v => H - PAD.b - (H - PAD.t - PAD.b) * (v - yr[0]) / (yr[1] - yr[0]);
    const clampY = v => Math.max(PAD.t - 2, Math.min(H - PAD.b + 2, Y(v)));
    let g = '';
    // 网格
    const xt = lx ? decades(xr) : ticks(xr), yt = ticks(yr);
    for (const t of xt) g += `<line class="svg-grid" x1="${X(t)}" x2="${X(t)}" y1="${PAD.t}" y2="${H - PAD.b}"/><text class="svg-txt" x="${X(t)}" y="${H - PAD.b + 15}" text-anchor="middle">${lx ? tickLog(t) : fmt(t)}</text>`;
    for (const t of yt) g += `<line class="svg-grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="svg-txt" x="${PAD.l - 5}" y="${Y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
    if (yr[0] < 0 && yr[1] > 0) g += `<line class="svg-axis" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    if (!lx && xr[0] < 0 && xr[1] > 0) g += `<line class="svg-axis" x1="${X(0)}" x2="${X(0)}" y1="${PAD.t}" y2="${H - PAD.b}"/>`;
    g += `<rect class="svg-axis" x="${PAD.l}" y="${PAD.t}" width="${W - PAD.l - PAD.r}" height="${H - PAD.t - PAD.b}"/>`;
    for (const h of o.hlines || []) if (h.y >= yr[0] && h.y <= yr[1]) g += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(h.y)}" y2="${Y(h.y)}" stroke="${h.color || '#999'}" stroke-dasharray="4 3"/>${h.label ? `<text class="svg-txt" x="${W - PAD.r - 4}" y="${Y(h.y) - 4}" text-anchor="end" style="fill:${h.color || '#777'}">${h.label}</text>` : ''}`;
    for (const v of o.vlines || []) if (v.x >= xr[0] && v.x <= xr[1]) g += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${PAD.t}" y2="${H - PAD.b}" stroke="${v.color || '#999'}" stroke-dasharray="4 3"/>${v.label ? `<text class="svg-txt" x="${X(v.x) + 3}" y="${PAD.t + 12}" style="fill:${v.color || '#777'}">${v.label}</text>` : ''}`;
    const cid = 'cp' + (++plot.n);
    g += `<clipPath id="${cid}"><rect x="${PAD.l}" y="${PAD.t}" width="${W - PAD.l - PAD.r}" height="${H - PAD.t - PAD.b}"/></clipPath><g clip-path="url(#${cid})">`;
    (o.series || []).forEach((s, i) => {
      let d = '';
      for (let j = 0; j < s.x.length; j++) { const yy = s.y[j]; if (!isFinite(yy)) continue; d += (d ? 'L' : 'M') + X(s.x[j]).toFixed(1) + ' ' + clampY(yy).toFixed(1); }
      g += `<path d="${d}" fill="none" stroke="${s.color || COL[i % COL.length]}" stroke-width="${s.width || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
    });
    g += '</g>';
    for (const m of o.marks || []) if (isFinite(m.x) && isFinite(m.y)) g += `<circle cx="${X(m.x)}" cy="${clampY(m.y)}" r="4.5" fill="${m.color || '#b3261e'}"/>${m.label ? `<text class="svg-txt" x="${X(m.x) + 7}" y="${clampY(m.y) - 7}" style="fill:${m.color || '#b3261e'};font-weight:600">${m.label}</text>` : ''}`;
    // 图例
    let lg = '', lxp = PAD.l + 8;
    (o.series || []).forEach((s, i) => { if (!s.label) return; lg += `<line x1="${lxp}" x2="${lxp + 18}" y1="${PAD.t + 12}" y2="${PAD.t + 12}" stroke="${s.color || COL[i % COL.length]}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/><text class="svg-txt" x="${lxp + 22}" y="${PAD.t + 16}">${s.label}</text>`; lxp += 30 + 7.5 * s.label.length; });
    g += `<g style="paint-order:stroke">${lg}</g>`;
    g += `<text class="svg-txt" x="${(W + PAD.l) / 2}" y="${H - 4}" text-anchor="middle">${o.xlabel || ''}</text><text class="svg-txt" x="12" y="${(H) / 2}" transform="rotate(-90 12 ${H / 2})" text-anchor="middle">${o.ylabel || ''}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || o.ylabel || '曲线'}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
  }
  function ticks([a, b]) { const span = b - a, step0 = Math.pow(10, Math.floor(Math.log10(span / 5))); const m = span / step0; const step = step0 * (m > 25 ? 5 : m > 10 ? 2 : 1); const t = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9 * span; v += step) t.push(Math.abs(v) < 1e-12 * span ? 0 : v); return t; }
  function decades([a, b]) { const t = []; for (let e = Math.ceil(Math.log10(a)); e <= Math.floor(Math.log10(b)); e++) t.push(Math.pow(10, e)); return t; }
  function tickLog(v) { const e = Math.round(Math.log10(v)); const P = { 0: '1', 1: '10', 2: '100', 3: '1k', 4: '10k', 5: '100k', 6: '1M', 7: '10M', 8: '100M', 9: '1G', 10: '10G' }; return P[e] || '1e' + e; }
  const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  const logspace = (a, b, n) => Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(a) + (Math.log10(b) - Math.log10(a)) * i / (n - 1)));
  const range = (ys, padFrac = 0.08) => { const f = ys.filter(isFinite); let lo = Math.min(...f), hi = Math.max(...f); if (hi - lo < 1e-12) { hi += 1; lo -= 1; } const p = (hi - lo) * padFrac; return [lo - p, hi + p]; };
  const row = (k, v) => `${k}：<b>${v}</b>`;
  const lines = arr => arr.filter(Boolean).join('<br>');
  const L = {};
  window.LABS = L;
  window.LAB_UTIL = { plot, fmt, eng };
  plot.n = 0;

  /* ===== 第 6 章 二极管 ===== */
  L['diode-iv'] = {
    title: '二极管指数伏安特性', chapter: 6,
    desc: '模型 i = I<sub>S</sub>(e<sup>v/(nV<sub>T</sub>)</sup> − 1)。先猜：I<sub>S</sub> 增大 10 倍，同一电流下 v 变化多少？用对数坐标看“每十倍电流的电压差”。',
    controls: [
      { id: 'lgIs', label: 'I_S（对数）', min: -16, max: -8, step: 0.5, value: -14, map: v => Math.pow(10, v), digits: 1, unit: '' },
      { id: 'n', label: '理想因子 n', min: 1, max: 2, step: 0.05, value: 1 },
      { id: 'T', label: '温度 T', min: 250, max: 400, step: 5, value: 300, unit: 'K' },
      { id: 'scale', label: '纵轴', type: 'select', value: 'lin', options: [['lin', '线性 (mA)'], ['log', '对数 (log₁₀ A)']] },
    ],
    update(p) {
      const Is = Math.pow(10, p.lgIs), VT = M.VT(p.T), v = lin(0, 0.9, 300);
      const i = v.map(x => M.diodeI(x, Is, p.n, VT));
      const v1 = M.diodeV(1e-3, Is, p.n, VT);
      const log = p.scale === 'log';
      const y = log ? i.map(x => x > 0 ? Math.log10(x) : NaN) : i.map(x => x * 1e3);
      return {
        svg: plot({ series: [{ x: v, y }], xr: [0, 0.9], yr: log ? [-14, 0] : [0, 10], xlabel: 'v / V', ylabel: log ? 'log₁₀(i / A)' : 'i / mA',
          marks: [{ x: v1, y: log ? -3 : 1, label: '1 mA' }] }),
        out: lines([row('V<sub>T</sub> = kT/q', eng(VT, 'V')), row('i = 1 mA 时 v', fmt(v1, 4) + ' V'),
          row('电流 ×10 所需 Δv = nV<sub>T</sub>ln10', eng(p.n * VT * Math.LN10, 'V')),
          row('1 mA 处小信号电阻 r<sub>d</sub> = nV<sub>T</sub>/I<sub>D</sub>', eng(p.n * VT / 1e-3, 'Ω'))]),
      };
    },
  };

  L['diode-loadline'] = {
    title: '负载线：指数模型 vs 恒压降模型', chapter: 6,
    desc: '串联回路 V<sub>S</sub>–R–D。工作点是负载线 i = (V<sub>S</sub> − v)/R 与器件曲线的交点。比较精确解与 0.7 V 恒压降模型的误差在何时变大。',
    controls: [
      { id: 'Vs', label: '电源 V_S', min: 0.2, max: 10, step: 0.1, value: 5, unit: 'V' },
      { id: 'R', label: '电阻 R', min: 0.1, max: 20, step: 0.1, value: 1, unit: 'kΩ' },
      { id: 'lgIs', label: 'I_S（对数）', min: -16, max: -10, step: 0.5, value: -14, map: v => Math.pow(10, v), digits: 1 },
      { id: 'Von', label: '恒压降模型 V_D(on)', min: 0.5, max: 0.8, step: 0.01, value: 0.7, unit: 'V' },
    ],
    update(p) {
      const R = p.R * 1e3, Is = Math.pow(10, p.lgIs), VT = 0.02585;
      const ex = M.diodeLoad(p.Vs, R, Is, 1, VT), cv = M.diodeCVD(p.Vs, R, p.Von);
      const vmax = Math.max(1, Math.min(p.Vs, 1.2)), v = lin(0, vmax, 300);
      const imax = Math.max(p.Vs / R, 1e-6) * 1e3 * 1.15;
      return {
        svg: plot({ series: [{ x: v, y: v.map(x => M.diodeI(x, Is, 1, VT) * 1e3), label: '二极管' },
          { x: [0, vmax], y: [p.Vs / R * 1e3, (p.Vs - vmax) / R * 1e3], label: '负载线', color: COL[1] }],
          xr: [0, vmax], yr: [0, imax], xlabel: 'v_D / V', ylabel: 'i_D / mA',
          marks: [{ x: ex.V, y: ex.I * 1e3, label: 'Q' }, { x: cv.V, y: cv.I * 1e3, color: COL[2] }], vlines: [{ x: p.Von, label: 'V_D(on)', color: COL[2] }] }),
        out: lines([row('指数模型（迭代精确解）', `I<sub>D</sub> = ${eng(ex.I, 'A')}，V<sub>D</sub> = ${fmt(ex.V, 4)} V`),
          row('恒压降模型', cv.on ? `I<sub>D</sub> = ${eng(cv.I, 'A')}（误差 ${fmt(100 * (cv.I - ex.I) / ex.I, 3)}%）` : '判为截止 I<sub>D</sub> = 0'),
          p.Vs < 1.5 ? '<span class="warnline">V<sub>S</sub> 与 V<sub>D</sub> 同量级：恒压降模型误差明显，应迭代或用指数模型。</span>' : '']),
      };
    },
  };

  L['rectifier'] = {
    title: '整流与电容滤波', chapter: 6,
    desc: '二极管取恒压降模型。大电容时纹波 V<sub>r</sub> ≈ V<sub>P</sub>/(f<sub>r</sub>R<sub>L</sub>C)，f<sub>r</sub> 半波为 f、全波为 2f。把 C 调到 0 看纯整流波形，再加大 C 看纹波和二极管导通角。',
    controls: [
      { id: 'type', label: '电路', type: 'select', value: 'bridge', options: [['half', '半波整流'], ['center', '全波（中心抽头）'], ['bridge', '桥式整流']] },
      { id: 'Vp', label: '副边峰值 V_P', min: 2, max: 30, step: 0.5, value: 12, unit: 'V' },
      { id: 'RL', label: '负载 R_L', min: 0.1, max: 10, step: 0.1, value: 1, unit: 'kΩ' },
      { id: 'C', label: '滤波电容 C', min: 0, max: 1000, step: 10, value: 100, unit: 'µF' },
      { id: 'Von', label: 'V_D(on)', min: 0, max: 1, step: 0.05, value: 0.7, unit: 'V' },
    ],
    update(p) {
      const r = M.rectifier({ type: p.type, Vp: p.Vp, f: 50, RL: p.RL * 1e3, C: p.C * 1e-6, Von: p.Von });
      const t = r.ts.map(x => x * 1e3);
      return {
        svg: plot({ series: [{ x: t, y: r.vin, color: '#9aa7b8', dash: '4 3', label: 'v_s' }, { x: t, y: r.vo, label: 'v_o' }],
          xr: [0, 60], yr: [-p.Vp * 1.1, p.Vp * 1.1], xlabel: 't / ms（50 Hz）', ylabel: 'v / V' }),
        out: lines([row('输出峰值', fmt(r.vmax) + ' V'), p.C > 0 ? row('纹波峰峰值（仿真 / 近似）', `${fmt(r.ripple)} V / ${fmt(r.ripApprox)} V`) : row('无电容：输出平均值', fmt(r.vavg) + ' V'),
          row('输出平均值', fmt(r.vavg) + ' V'), row('二极管最大反向电压 PIV（近似）', fmt(r.PIV) + ' V'),
          p.C > 0 && r.ripApprox > 0.3 * (p.Vp - p.Von) ? '<span class="warnline">纹波已不小：近似式 V<sub>r</sub> ≪ V<sub>P</sub> 的前提不再成立。</span>' : '']),
      };
    },
  };

  L['clipper'] = {
    title: '限幅与钳位波形', chapter: 6,
    desc: '输入 v<sub>i</sub> = V<sub>m</sub> sin ωt，二极管取恒压降模型。限幅电路“削”掉超出阈值的部分；钳位电路不改变形状，只把整条波形平移。',
    controls: [
      { id: 'mode', label: '电路', type: 'select', value: 'upper', options: [['upper', '并联上限幅（D 串 V_REF）'], ['lower', '并联下限幅'], ['double', '双向限幅'], ['series', '串联半波（削去负半周）'], ['clampP', '正钳位（底部钳在 −V_D 附近→上移）'], ['clampN', '负钳位（整体下移）']] },
      { id: 'Vm', label: '输入幅值 V_m', min: 1, max: 10, step: 0.5, value: 5, unit: 'V' },
      { id: 'Vref', label: '参考电压 V_REF', min: 0, max: 6, step: 0.5, value: 2, unit: 'V' },
      { id: 'Von', label: 'V_D(on)', min: 0, max: 0.8, step: 0.1, value: 0.7, unit: 'V' },
    ],
    update(p) {
      const t = lin(0, 2, 400), vi = t.map(x => p.Vm * Math.sin(2 * Math.PI * x));
      let vo, note;
      if (p.mode === 'clampP' || p.mode === 'clampN') {
        const sh = M.clampShift(p.Vm, p.Von, p.mode === 'clampP');
        vo = vi.map(v => v + sh);
        note = `稳态时电容电压 ≈ ${fmt(p.Vm - p.Von)} V（RC ≫ T），输出${p.mode === 'clampP' ? '最低' : '最高'}点 ≈ ${p.mode === 'clampP' ? '−' : ''}${fmt(p.Von)} V，峰峰值仍为 ${fmt(2 * p.Vm)} V。`;
      } else {
        vo = vi.map(v => M.shaper(p.mode, v, p.Vref, p.Von));
        note = p.mode === 'series' ? `正半周输出 v<sub>i</sub> − V<sub>D(on)</sub>，峰值 ${fmt(Math.max(0, p.Vm - p.Von))} V。` : `限幅阈值 ±(V<sub>REF</sub> + V<sub>D(on)</sub>) = ${fmt(p.Vref + p.Von)} V${p.Vm <= p.Vref + p.Von ? '，输入未超过阈值，不削波' : ''}。`;
      }
      const lim = 2 * p.Vm + 1;
      return { svg: plot({ series: [{ x: t, y: vi, color: '#9aa7b8', dash: '4 3', label: 'v_i' }, { x: t, y: vo, label: 'v_o' }], xr: [0, 2], yr: [-lim, lim], xlabel: 't / T', ylabel: 'v / V' }), out: note };
    },
  };

  L['zener'] = {
    title: '齐纳稳压器的工作范围', chapter: 6,
    desc: 'V<sub>S</sub> 经 R<sub>S</sub> 接齐纳管与负载并联。齐纳管模型 V<sub>Z0</sub> + r<sub>z</sub>I<sub>Z</sub>（仅 I<sub>Z</sub> &gt; 0 时成立）。负载变重时 I<sub>Z</sub> 下降，低于 I<sub>ZK</sub> 就失去稳压。',
    controls: [
      { id: 'Vs', label: '输入 V_S', min: 5, max: 25, step: 0.5, value: 15, unit: 'V' },
      { id: 'Rs', label: '限流电阻 R_S', min: 50, max: 1000, step: 10, value: 300, unit: 'Ω' },
      { id: 'RL', label: '负载 R_L', min: 50, max: 5000, step: 10, value: 1000, unit: 'Ω' },
      { id: 'Vz', label: 'V_Z0', min: 3, max: 12, step: 0.1, value: 6.8, unit: 'V' },
      { id: 'rz', label: '动态电阻 r_z', min: 0.5, max: 50, step: 0.5, value: 5, unit: 'Ω' },
      { id: 'Izk', label: '最小稳压电流 I_ZK', min: 0.5, max: 10, step: 0.5, value: 2, unit: 'mA' },
    ],
    update(p) {
      const r = M.zener(p.Vs, p.Rs, p.RL, p.Vz, p.rz);
      const RLs = lin(50, 5000, 200), vo = RLs.map(x => M.zener(p.Vs, p.Rs, x, p.Vz, p.rz).Vo);
      const RLmin = p.Vz / ((p.Vs - p.Vz) / p.Rs - p.Izk * 1e-3);
      const ok = r.on && r.Iz * 1e3 >= p.Izk;
      const lineReg = p.rz / (p.Rs + p.rz); // ΔVo/ΔVs（RL 并联忽略时近似）
      return {
        svg: plot({ series: [{ x: RLs, y: vo, label: 'V_o(R_L)' }], xr: [50, 5000], yr: [0, Math.max(p.Vz * 1.4, 1)], xlabel: 'R_L / Ω', ylabel: 'V_o / V',
          marks: [{ x: p.RL, y: r.Vo, label: '当前' }], vlines: RLmin > 0 && RLmin < 5000 ? [{ x: RLmin, label: 'R_L,min', color: COL[4] }] : [] }),
        out: lines([row('V<sub>o</sub>', fmt(r.Vo, 4) + ' V'), row('I<sub>S</sub> / I<sub>Z</sub> / I<sub>L</sub>', `${eng(r.Is, 'A')} / ${eng(r.Iz, 'A')} / ${eng(r.IL, 'A')}`),
          row('齐纳管功耗 ≈ V<sub>o</sub>I<sub>Z</sub>', eng(r.Vo * r.Iz, 'W')), row('线性调整率 ΔV<sub>o</sub>/ΔV<sub>S</sub> ≈ r<sub>z</sub>/(R<sub>S</sub>+r<sub>z</sub>)', fmt(lineReg)),
          RLmin > 0 ? row('保证 I<sub>Z</sub> ≥ I<sub>ZK</sub> 的最小负载', eng(RLmin, 'Ω')) : '<span class="warnline">即使空载 I<sub>Z</sub> 也达不到 I<sub>ZK</sub>：减小 R<sub>S</sub> 或提高 V<sub>S</sub>。</span>',
          ok ? '状态：稳压区' : `<span class="warnline">状态：${r.on ? 'I<sub>Z</sub> &lt; I<sub>ZK</sub>，稳压变差' : '齐纳管未击穿，输出就是分压'}</span>`]),
      };
    },
  };

  /* ===== 第 7 章 BJT ===== */
  L['bjt-output'] = {
    title: 'BJT 输出特性与直流负载线', chapter: 7,
    desc: '画 i<sub>C</sub>–v<sub>CE</sub> 曲线族（含 Early 效应），直流负载线 i<sub>C</sub> = (V<sub>CC</sub> − v<sub>CE</sub>)/R<sub>C</sub>。改 I<sub>B</sub> 看 Q 点沿负载线移动：太大进饱和，太小靠近截止。',
    controls: [
      { id: 'VCC', label: 'V_CC', min: 5, max: 20, step: 0.5, value: 12, unit: 'V' },
      { id: 'RC', label: 'R_C', min: 0.5, max: 10, step: 0.1, value: 3, unit: 'kΩ' },
      { id: 'IB', label: '基极电流 I_B', min: 0, max: 80, step: 1, value: 20, unit: 'µA' },
      { id: 'beta', label: 'β', min: 50, max: 300, step: 5, value: 100 },
      { id: 'VA', label: 'Early 电压 V_A', min: 20, max: 200, step: 5, value: 100, unit: 'V' },
    ],
    update(p) {
      const vce = lin(0, p.VCC * 1.1, 220), fam = [10, 20, 30, 40, 50, 60].map(x => x * 1e-6);
      const ser = fam.map((IB, i) => ({ x: vce, y: vce.map(v => M.bjtIc(IB, v, p.beta, p.VA) * 1e3), color: '#9fb3c8', width: 1.3 }));
      const IBq = p.IB * 1e-6, RC = p.RC * 1e3;
      ser.push({ x: vce, y: vce.map(v => M.bjtIc(IBq, v, p.beta, p.VA) * 1e3), color: COL[0], width: 2.4, label: '当前 I_B' });
      ser.push({ x: [0, p.VCC], y: [p.VCC / RC * 1e3, 0], color: COL[1], label: '负载线' });
      // 交点：二分 v
      let lo = 0, hi = p.VCC;
      for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (M.bjtIc(IBq, m, p.beta, p.VA) > (p.VCC - m) / RC) hi = m; else lo = m; }
      const VCE = (lo + hi) / 2, IC = (p.VCC - VCE) / RC;
      const region = IBq === 0 ? '截止' : VCE < 0.3 ? '饱和' : '放大';
      return {
        svg: plot({ series: ser, xr: [0, p.VCC * 1.1], yr: [0, Math.max(p.VCC / RC * 1e3 * 1.2, 0.1)], xlabel: 'v_CE / V', ylabel: 'i_C / mA', marks: [{ x: VCE, y: IC * 1e3, label: 'Q' }] }),
        out: lines([row('Q 点', `I<sub>C</sub> = ${eng(IC, 'A')}，V<sub>CE</sub> = ${fmt(VCE)} V`), row('工作区', region),
          region === '饱和' ? `<span class="warnline">I<sub>C</sub> &lt; βI<sub>B</sub> = ${eng(p.beta * IBq, 'A')}：负载线限制了电流，β 关系不再成立。</span>` : '',
          region === '放大' ? row('最大不失真摆幅（粗估）', `min(V<sub>CE</sub> − 0.2, I<sub>C</sub>R<sub>C</sub>) ≈ ${fmt(Math.min(VCE - 0.2, IC * RC))} V`) : '']),
      };
    },
  };

  L['bjt-bias'] = {
    title: '分压式偏置：Q 点对 β 的敏感度', chapter: 7,
    desc: '把 R<sub>1</sub>、R<sub>2</sub> 做戴维南等效：V<sub>BB</sub> = V<sub>CC</sub>R<sub>2</sub>/(R<sub>1</sub>+R<sub>2</sub>)，R<sub>B</sub> = R<sub>1</sub>∥R<sub>2</sub>。当 (β+1)R<sub>E</sub> ≫ R<sub>B</sub> 时 I<sub>E</sub> ≈ (V<sub>BB</sub> − V<sub>BE</sub>)/R<sub>E</sub>，几乎与 β 无关。',
    controls: [
      { id: 'VCC', label: 'V_CC', min: 5, max: 20, step: 0.5, value: 12, unit: 'V' },
      { id: 'R1', label: 'R_1', min: 5, max: 200, step: 1, value: 47, unit: 'kΩ' },
      { id: 'R2', label: 'R_2', min: 2, max: 100, step: 1, value: 15, unit: 'kΩ' },
      { id: 'RC', label: 'R_C', min: 0.5, max: 10, step: 0.1, value: 3.3, unit: 'kΩ' },
      { id: 'RE', label: 'R_E', min: 0, max: 5, step: 0.1, value: 1.2, unit: 'kΩ' },
      { id: 'beta', label: 'β', min: 30, max: 400, step: 5, value: 100 },
    ],
    update(p) {
      const base = { VCC: p.VCC, R1: p.R1 * 1e3, R2: p.R2 * 1e3, RC: p.RC * 1e3, RE: p.RE * 1e3 };
      const r = M.bjtDivider(Object.assign({ beta: p.beta }, base));
      const bs = lin(30, 400, 120), ic = bs.map(b => M.bjtDivider(Object.assign({ beta: b }, base)).IC * 1e3);
      const r2 = M.bjtDivider(Object.assign({ beta: 2 * p.beta }, base));
      const approx = p.RE > 0 ? (r.VBB - 0.7) / (p.RE * 1e3) : NaN;
      return {
        svg: plot({ series: [{ x: bs, y: ic, label: 'I_C(β)' }], xr: [30, 400], yr: [0, Math.max(...ic) * 1.2 || 1], xlabel: 'β', ylabel: 'I_C / mA', marks: [{ x: p.beta, y: r.IC * 1e3, label: '当前' }] }),
        out: lines([row('V<sub>BB</sub> / R<sub>B</sub>', `${fmt(r.VBB)} V / ${eng(r.RB, 'Ω')}`), row('工作区', r.region),
          row('I<sub>C</sub>，V<sub>CE</sub>', `${eng(r.IC, 'A')}，${fmt(r.VCE)} V`),
          row('β 加倍后 I<sub>C</sub> 变化', `${fmt(100 * (r2.IC - r.IC) / (r.IC || 1), 3)}%`),
          p.RE > 0 ? row('近似 I<sub>E</sub> ≈ (V<sub>BB</sub>−0.7)/R<sub>E</sub>', eng(approx, 'A')) : '<span class="warnline">R<sub>E</sub> = 0：I<sub>C</sub> 正比于 β，Q 点极不稳定。</span>',
          row('(β+1)R<sub>E</sub> / R<sub>B</sub>', fmt((p.beta + 1) * p.RE * 1e3 / r.RB))]),
      };
    },
  };

  L['bjt-amp'] = {
    title: 'BJT 三种组态的小信号参数', chapter: 7,
    desc: '混合 π 模型：g<sub>m</sub> = I<sub>C</sub>/V<sub>T</sub>，r<sub>π</sub> = β/g<sub>m</sub>，r<sub>o</sub> = V<sub>A</sub>/I<sub>C</sub>。共射反相大增益，共集增益略小于 1 但输出电阻小，共基输入电阻小。R<sub>E</sub> 指未被旁路的射极电阻。',
    controls: [
      { id: 'cfg', label: '组态', type: 'select', value: 'CE', options: [['CE', '共射 CE'], ['CC', '共集 CC（射极跟随器）'], ['CB', '共基 CB']] },
      { id: 'IC', label: 'I_C', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'mA' },
      { id: 'beta', label: 'β', min: 30, max: 300, step: 5, value: 100 },
      { id: 'RC', label: 'R_C', min: 0.5, max: 20, step: 0.1, value: 5, unit: 'kΩ' },
      { id: 'RE', label: 'R_E（未旁路；CC/CB 为射极电阻）', min: 0, max: 5, step: 0.05, value: 0, unit: 'kΩ' },
      { id: 'RL', label: 'R_L', min: 0.1, max: 100, step: 0.1, value: 10, unit: 'kΩ' },
      { id: 'RS', label: '信号源内阻 R_S', min: 0, max: 20, step: 0.1, value: 1, unit: 'kΩ' },
      { id: 'VA', label: 'V_A（0 表示忽略 r_o）', min: 0, max: 200, step: 10, value: 0, unit: 'V' },
    ],
    update(p) {
      const RE = p.cfg === 'CE' ? p.RE * 1e3 : Math.max(p.RE, 0.05) * 1e3;
      const r = M.bjtAmp({ cfg: p.cfg, IC: p.IC * 1e-3, beta: p.beta, VT: 0.026, RC: p.RC * 1e3, RE, RL: p.RL * 1e3, RS: p.RS * 1e3, VA: p.VA > 0 ? p.VA : Infinity });
      const bars = [['|A_v|', Math.abs(r.Av)], ['|A_vs|', Math.abs(r.Avs)]];
      const mx = Math.max(1, ...bars.map(b => b[1]));
      const svg = `<svg viewBox="0 0 560 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="增益条">${bars.map((b, i) => `<text class="svg-txt" x="8" y="${34 + i * 44}">${b[0]}</text><rect x="70" y="${18 + i * 44}" width="${(470 * b[1] / mx).toFixed(1)}" height="24" fill="${COL[i]}" rx="4"/><text class="svg-txt" x="${Math.min(470, 76 + 470 * b[1] / mx)}" y="${35 + i * 44}">${fmt(b[1])}</text>`).join('')}</svg>`;
      return {
        svg,
        out: lines([row('g<sub>m</sub> / r<sub>π</sub> / r<sub>o</sub>', `${eng(r.gm, 'S')} / ${eng(r.rpi, 'Ω')} / ${eng(r.ro, 'Ω')}`),
          row('A<sub>v</sub> = v<sub>o</sub>/v<sub>i</sub>', fmt(r.Av)), row('A<sub>vs</sub> = v<sub>o</sub>/v<sub>s</sub>', fmt(r.Avs)),
          row('R<sub>in</sub>（不含偏置电阻）', eng(r.Rin, 'Ω')), row('R<sub>out</sub>（不含 R<sub>L</sub>）', eng(r.Rout, 'Ω')),
          p.cfg === 'CE' && p.RE > 0 ? row('射极负反馈后增益约', `−R<sub>C</sub>∥R<sub>L</sub>/(r<sub>e</sub>+R<sub>E</sub>) = ${fmt(-M.par(p.RC * 1e3, p.RL * 1e3) / (r.rpi / (p.beta + 1) + RE))}`) : '']),
      };
    },
  };

  /* ===== 第 8 章 MOSFET ===== */
  L['mos-iv'] = {
    title: 'NMOS 平方律特性与工作区', chapter: 8,
    desc: '饱和区 i<sub>D</sub> = ½k<sub>n</sub>(v<sub>GS</sub> − V<sub>th</sub>)²(1 + λv<sub>DS</sub>)，三极管区 i<sub>D</sub> = k<sub>n</sub>[(v<sub>GS</sub>−V<sub>th</sub>)v<sub>DS</sub> − v<sub>DS</sub>²/2]。虚线是边界 v<sub>DS</sub> = v<sub>GS</sub> − V<sub>th</sub>。',
    controls: [
      { id: 'kn', label: 'k_n = µ_nC_ox·W/L', min: 0.2, max: 10, step: 0.1, value: 2, unit: 'mA/V²' },
      { id: 'Vth', label: 'V_th', min: 0.3, max: 2, step: 0.05, value: 0.7, unit: 'V' },
      { id: 'lam', label: 'λ', min: 0, max: 0.2, step: 0.005, value: 0.02, unit: 'V⁻¹' },
      { id: 'VGS', label: '当前 V_GS', min: 0, max: 3, step: 0.05, value: 1.5, unit: 'V' },
      { id: 'VDS', label: '当前 V_DS', min: 0, max: 5, step: 0.05, value: 2, unit: 'V' },
    ],
    update(p) {
      const k = p.kn * 1e-3, vds = lin(0, 5, 200);
      const vg = [0.5, 1, 1.5, 2, 2.5].map(x => x + p.Vth - 0.5).filter(x => x > p.Vth);
      const ser = vg.map(g => ({ x: vds, y: vds.map(d => M.mosId(g, d, k, p.Vth, p.lam) * 1e3), color: '#9fb3c8', width: 1.3 }));
      ser.push({ x: vds, y: vds.map(d => M.mosId(p.VGS, d, k, p.Vth, p.lam) * 1e3), color: COL[0], width: 2.4, label: '当前 V_GS' });
      const vb = lin(0, 3, 60);
      ser.push({ x: vb, y: vb.map(v => 0.5 * k * v * v * 1e3), color: COL[1], dash: '5 4', label: '饱和边界' });
      const id = M.mosId(p.VGS, p.VDS, k, p.Vth, p.lam), reg = M.mosRegion(p.VGS, p.VDS, p.Vth);
      const vov = p.VGS - p.Vth;
      const ymax = Math.max(0.5 * k * Math.pow(2.5, 2) * 1e3 * 1.2, id * 1.3e3, 0.1);
      return {
        svg: plot({ series: ser, xr: [0, 5], yr: [0, ymax], xlabel: 'v_DS / V', ylabel: 'i_D / mA', marks: [{ x: p.VDS, y: id * 1e3, label: 'Q' }] }),
        out: lines([row('V<sub>OV</sub> = V<sub>GS</sub> − V<sub>th</sub>', fmt(vov) + ' V'), row('工作区', reg), row('I<sub>D</sub>', eng(id, 'A')),
          reg === '饱和区' ? row('g<sub>m</sub> = 2I<sub>D</sub>/V<sub>OV</sub> = k<sub>n</sub>V<sub>OV</sub>(1+λV<sub>DS</sub>)', eng(2 * id / vov, 'S')) : '',
          reg === '饱和区' && p.lam > 0 ? row('r<sub>o</sub> ≈ 1/(λI<sub>D</sub>)', eng(1 / (p.lam * id), 'Ω')) : '',
          reg.startsWith('三极管') ? row('小 v<sub>DS</sub> 时导通电阻 r<sub>DS</sub> ≈ 1/(k<sub>n</sub>V<sub>OV</sub>)', eng(1 / (k * vov), 'Ω')) : '']),
      };
    },
  };

  L['mos-amp'] = {
    title: 'MOSFET 三种组态的小信号参数', chapter: 8,
    desc: 'g<sub>m</sub> = 2I<sub>D</sub>/V<sub>OV</sub>，r<sub>o</sub> = 1/(λI<sub>D</sub>)。栅极几乎不取电流，所以共源、共漏的输入电阻由偏置电阻 R<sub>G</sub> 决定；共栅输入电阻约 1/g<sub>m</sub>。',
    controls: [
      { id: 'cfg', label: '组态', type: 'select', value: 'CS', options: [['CS', '共源 CS'], ['CD', '共漏 CD（源极跟随器）'], ['CG', '共栅 CG']] },
      { id: 'ID', label: 'I_D', min: 0.1, max: 5, step: 0.1, value: 0.5, unit: 'mA' },
      { id: 'Vov', label: 'V_OV', min: 0.1, max: 1, step: 0.02, value: 0.25, unit: 'V' },
      { id: 'lam', label: 'λ', min: 0, max: 0.1, step: 0.005, value: 0, unit: 'V⁻¹' },
      { id: 'RD', label: 'R_D', min: 0.5, max: 50, step: 0.5, value: 10, unit: 'kΩ' },
      { id: 'RS', label: 'R_S（CS 为未旁路源极电阻）', min: 0, max: 10, step: 0.1, value: 0, unit: 'kΩ' },
      { id: 'RL', label: 'R_L', min: 1, max: 100, step: 1, value: 20, unit: 'kΩ' },
      { id: 'Rsig', label: 'R_sig', min: 0, max: 100, step: 1, value: 10, unit: 'kΩ' },
    ],
    update(p) {
      const RS = p.cfg === 'CS' ? p.RS * 1e3 : Math.max(p.RS, 0.1) * 1e3;
      const r = M.mosAmp({ cfg: p.cfg, ID: p.ID * 1e-3, Vov: p.Vov, lam: p.lam, RD: p.RD * 1e3, RS, RL: p.RL * 1e3, Rsig: p.Rsig * 1e3, RG: p.cfg === 'CG' ? Infinity : 1e6 });
      return {
        svg: '',
        out: lines([row('g<sub>m</sub> / r<sub>o</sub>', `${eng(r.gm, 'S')} / ${eng(r.ro, 'Ω')}`), row('A<sub>v</sub>', fmt(r.Av)), row('A<sub>vs</sub>（R<sub>G</sub> = 1 MΩ）', fmt(r.Avs)),
          row('R<sub>in</sub>', eng(r.Rin, 'Ω')), row('R<sub>out</sub>', eng(r.Rout, 'Ω')),
          row('同电流下 BJT 的 g<sub>m</sub> = I/V<sub>T</sub>', `${eng(p.ID * 1e-3 / 0.026, 'S')}（是 MOS 的 ${fmt(0.5 * p.Vov / 0.026 * 1)} 倍）`)]),
      };
    },
  };

  /* ===== 第 10 章 频率响应 ===== */
  L['bode'] = {
    title: '波特图：精确曲线与渐近线', chapter: 10,
    desc: 'H(jf) = K(1 + jf/f<sub>z</sub>)/[(1 + jf/f<sub>p1</sub>)(1 + jf/f<sub>p2</sub>)]。每个极点使斜率减 20 dB/dec、相位减 90°；左半平面零点相反；右半平面零点幅度同左零点、相位却减 90°。',
    controls: [
      { id: 'KdB', label: '低频增益 |K|', min: -20, max: 60, step: 1, value: 40, unit: 'dB' },
      { id: 'p1', label: 'f_p1（对数）', min: 1, max: 7, step: 0.1, value: 3, map: v => Math.pow(10, v), digits: 0, unit: 'Hz' },
      { id: 'p2', label: 'f_p2（对数）', min: 1, max: 8, step: 0.1, value: 6, map: v => Math.pow(10, v), digits: 0, unit: 'Hz' },
      { id: 'zt', label: '零点类型', type: 'select', value: 'none', options: [['none', '无零点'], ['lhp', '左半平面零点'], ['rhp', '右半平面零点']] },
      { id: 'z', label: 'f_z（对数）', min: 1, max: 8, step: 0.1, value: 7, map: v => Math.pow(10, v), digits: 0, unit: 'Hz' },
      { id: 'view', label: '显示', type: 'select', value: 'mag', options: [['mag', '幅频 (dB)'], ['ph', '相频 (°)']] },
    ],
    update(p) {
      const K = Math.pow(10, p.KdB / 20), poles = [Math.pow(10, p.p1), Math.pow(10, p.p2)];
      const zeros = p.zt === 'none' ? [] : [{ f: Math.pow(10, p.z), rhp: p.zt === 'rhp' }];
      const f = logspace(1, 1e9, 400), h = f.map(x => M.bodeH(x, K, poles, zeros));
      let ph = h.map(x => M.carg(x) * 180 / Math.PI);
      for (let i = 1; i < ph.length; i++) { while (ph[i] - ph[i - 1] > 180) ph[i] -= 360; while (ph[i] - ph[i - 1] < -180) ph[i] += 360; }
      const mag = h.map(x => M.db(M.cabs(x)));
      const asy = f.map(x => M.bodeAsym(x, K, poles, zeros));
      let f3 = NaN; for (let i = 1; i < f.length; i++) if (mag[i] < p.KdB - 3 && mag[i - 1] >= p.KdB - 3) { f3 = f[i]; break; }
      const fu = (() => { for (let i = 1; i < f.length; i++) if (mag[i] < 0 && mag[i - 1] >= 0) return f[i]; return NaN; })();
      const mv = p.view === 'mag';
      return {
        svg: plot({ xlog: true, xr: [10, 1e9], yr: mv ? [Math.min(-40, p.KdB - 100), p.KdB + 20] : range(ph.concat([0, -180])), xlabel: 'f / Hz', ylabel: mv ? '|H| / dB' : '∠H / °',
          series: mv ? [{ x: f, y: mag, label: '精确' }, { x: f, y: asy, dash: '5 4', color: COL[1], label: '渐近线' }] : [{ x: f, y: ph, label: '相位' }],
          vlines: poles.map((x, i) => ({ x, label: 'p' + (i + 1), color: '#8a99ad' })).concat(zeros.map(z => ({ x: z.f, label: 'z', color: COL[2] }))) }),
        out: lines([row('−3 dB 频率（数值）', isFinite(f3) ? eng(f3, 'Hz') : '—'), row('单位增益频率', isFinite(fu) ? eng(fu, 'Hz') : '—'),
          poles[1] / poles[0] >= 10 ? row('主极点近似 f<sub>H</sub> ≈ f<sub>p1</sub>', eng(poles[0], 'Hz')) : '<span class="warnline">两极点相距不到 10 倍：主极点近似误差变大。</span>',
          row('转折频率处精确值比渐近线低', '3 dB（单个实极点）')]),
      };
    },
  };

  L['miller'] = {
    title: '共源/共射高频响应：密勒近似与开路时间常数', chapter: 10,
    desc: '跨接电容 C<sub>gd</sub>（或 C<sub>μ</sub>）折算到输入端变成 C<sub>gd</sub>(1 + g<sub>m</sub>R′<sub>L</sub>)。增益越大，输入极点越低。对比密勒近似、开路时间常数法和忽略零点的两极点精确解。',
    controls: [
      { id: 'gm', label: 'g_m', min: 0.5, max: 50, step: 0.5, value: 4, unit: 'mS' },
      { id: 'Rsig', label: 'R_sig', min: 0.1, max: 100, step: 0.1, value: 10, unit: 'kΩ' },
      { id: 'RL', label: "R'_L（输出端总电阻）", min: 0.5, max: 50, step: 0.5, value: 5, unit: 'kΩ' },
      { id: 'Cgs', label: 'C_gs / C_π', min: 1, max: 100, step: 1, value: 20, unit: 'pF' },
      { id: 'Cgd', label: 'C_gd / C_μ', min: 0.1, max: 20, step: 0.1, value: 5, unit: 'pF' },
      { id: 'CL', label: 'C_L', min: 0, max: 50, step: 1, value: 0, unit: 'pF' },
    ],
    update(p) {
      const r = M.millerCS({ gm: p.gm * 1e-3, Rsig: p.Rsig * 1e3, RLp: p.RL * 1e3, Cgs: p.Cgs * 1e-12, Cgd: p.Cgd * 1e-12, CL: p.CL * 1e-12 });
      const items = [['密勒输入极点', r.fin], ['开路时间常数', r.fOCTC], ['两极点精确 p1', r.fp1exact], ['输出极点（密勒）', r.fout], ['右半平面零点 g_m/2πC_gd', r.fz]];
      const lg = items.map(i => Math.log10(i[1])).filter(isFinite);
      const lo = Math.floor(Math.min(...lg)) - 0.3, hi = Math.ceil(Math.max(...lg)) + 0.3;
      const X = v => 20 + 520 * (Math.log10(v) - lo) / (hi - lo);
      let svg = `<svg viewBox="0 0 560 ${40 + items.length * 30}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="频率位置"><line class="svg-axis" x1="20" x2="540" y1="20" y2="20"/>`;
      for (let e = Math.ceil(lo); e <= hi; e++) svg += `<line class="svg-grid" x1="${X(10 ** e)}" x2="${X(10 ** e)}" y1="14" y2="${30 + items.length * 30}"/><text class="svg-txt" x="${X(10 ** e)}" y="12" text-anchor="middle">${tickLog(10 ** e)}Hz</text>`;
      items.forEach((it, i) => { if (isFinite(it[1])) svg += `<circle cx="${X(it[1])}" cy="${42 + i * 30}" r="6" fill="${COL[i]}"/><text class="svg-txt" x="${Math.min(X(it[1]) + 10, 400)}" y="${46 + i * 30}">${it[0]}：${eng(it[1], 'Hz')}</text>`; });
      svg += '</svg>';
      return {
        svg,
        out: lines([row('中频增益 −g<sub>m</sub>R′<sub>L</sub>', fmt(r.Av)), row('密勒输入电容 C<sub>gs</sub> + C<sub>gd</sub>(1 + g<sub>m</sub>R′<sub>L</sub>)', eng(r.Cin, 'F')),
          row('f<sub>H</sub>（密勒）/ f<sub>H</sub>（OCTC）', `${eng(r.fin, 'Hz')} / ${eng(r.fOCTC, 'Hz')}`),
          row('增益带宽积 |A|·f<sub>H</sub>（OCTC）', eng(Math.abs(r.Av) * r.fOCTC, 'Hz')),
          r.fout < 10 * r.fin ? '<span class="warnline">输出极点离输入极点不远：只用密勒输入极点会高估带宽，OCTC 更稳妥。</span>' : '']),
      };
    },
  };

  L['lowfreq'] = {
    title: '低频响应：耦合与旁路电容', chapter: 10,
    desc: '低频时电容不能再看作短路。每个电容单独作用、其余电容短路，求它看到的电阻 R<sub>Ci</sub>，得 f<sub>i</sub> = 1/(2πR<sub>Ci</sub>C<sub>i</sub>)。f<sub>L</sub> ≈ Σf<sub>i</sub>（偏保守）；若有一个比其他高 4 倍以上，它就是主极点。射极旁路电容看到的电阻很小（≈ R<sub>E</sub> ∥ (r<sub>e</sub> + R<sub>B</sub>′/(β+1))），通常决定 f<sub>L</sub>。',
    controls: [
      { id: 'R1', label: '输入耦合 C1 看到的电阻 R_s + R_in', min: 1, max: 100, step: 1, value: 12, unit: 'kΩ' },
      { id: 'C1', label: 'C1', min: 0.1, max: 47, step: 0.1, value: 10, unit: 'µF' },
      { id: 'R2', label: '输出耦合 C2 看到的电阻 R_C + R_L', min: 1, max: 100, step: 1, value: 15, unit: 'kΩ' },
      { id: 'C2', label: 'C2', min: 0.1, max: 47, step: 0.1, value: 1, unit: 'µF' },
      { id: 'R3', label: '旁路 C_E 看到的电阻', min: 5, max: 1000, step: 5, value: 40, unit: 'Ω' },
      { id: 'C3', label: 'C_E', min: 1, max: 470, step: 1, value: 100, unit: 'µF' },
      { id: 'AmdB', label: '中频增益', min: 0, max: 60, step: 1, value: 40, unit: 'dB' },
    ],
    update(p) {
      const fs = [1 / (2 * Math.PI * p.R1 * 1e3 * p.C1 * 1e-6), 1 / (2 * Math.PI * p.R2 * 1e3 * p.C2 * 1e-6), 1 / (2 * Math.PI * p.R3 * p.C3 * 1e-6)];
      const fL = fs.reduce((a, b) => a + b, 0);
      const f = logspace(0.1, 1e5, 300);
      // 近似：三个高通因子相乘（把旁路电容也当作简单高通，忽略其零点）
      const mag = f.map(x => p.AmdB + fs.reduce((s, fp) => s + M.db(x / Math.hypot(x, fp)), 0));
      let f3 = NaN; for (let i = f.length - 1; i > 0; i--) if (mag[i - 1] < p.AmdB - 3 && mag[i] >= p.AmdB - 3) { f3 = f[i]; break; }
      const mx = Math.max(...fs);
      return {
        svg: plot({ xlog: true, xr: [0.1, 1e5], yr: [p.AmdB - 60, p.AmdB + 6], xlabel: 'f / Hz', ylabel: '|A| / dB', series: [{ x: f, y: mag, label: '三个高通因子' }],
          vlines: fs.map((x, i) => ({ x, label: ['C1', 'C2', 'CE'][i], color: COL[i + 1] })).concat([{ x: fL, label: 'Σf', color: '#b3261e' }]) }),
        out: lines([row('f<sub>C1</sub> / f<sub>C2</sub> / f<sub>CE</sub>', fs.map(x => eng(x, 'Hz')).join(' / ')), row('f<sub>L</sub> ≈ Σf<sub>i</sub>', eng(fL, 'Hz')),
          row('数值 −3 dB 点（模型）', eng(f3, 'Hz')), mx > 4 * (fL - mx) ? row('主极点', '最大的 f<sub>i</sub> 约等于 f<sub>L</sub>') : '<span class="warnline">没有明显主极点：用 Σf<sub>i</sub> 估计（偏大，即偏保守）。</span>',
          '<span class="muted">说明：旁路电容实际还带一个零点 1/(2πR<sub>E</sub>C<sub>E</sub>)，这里只看极点。</span>']),
      };
    },
  };

  /* ===== 第 11 章 反馈 ===== */
  L['fb-gain'] = {
    title: '负反馈：增益、灵敏度与带宽', chapter: 11,
    desc: 'A<sub>f</sub> = A/(1 + Aβ)。环路增益 T = Aβ ≫ 1 时 A<sub>f</sub> ≈ 1/β，几乎不受 A 影响；A 的相对变化被缩小 (1 + Aβ) 倍。单极点放大器加反馈后，带宽扩大 (1 + A<sub>0</sub>β) 倍，增益带宽积不变。',
    controls: [
      { id: 'A0dB', label: '开环增益 A₀', min: 20, max: 120, step: 1, value: 80, unit: 'dB' },
      { id: 'lgb', label: '反馈系数 β（对数）', min: -5, max: 0, step: 0.1, value: -2, map: v => Math.pow(10, v), digits: 4 },
      { id: 'fp', label: '开环极点 f_p（对数）', min: 0, max: 5, step: 0.1, value: 1, map: v => Math.pow(10, v), digits: 1, unit: 'Hz' },
      { id: 'dA', label: 'A 变化量 ΔA/A', min: -50, max: 50, step: 1, value: -20, unit: '%' },
    ],
    update(p) {
      const A0 = Math.pow(10, p.A0dB / 20), b = Math.pow(10, p.lgb), fp = Math.pow(10, p.fp);
      const r = M.fb(A0, b), bw = M.fbBW(A0, fp, b);
      const A2 = A0 * (1 + p.dA / 100), r2 = M.fb(A2, b);
      const f = logspace(0.1, 1e9, 300);
      const ol = f.map(x => M.db(A0 / Math.hypot(1, x / fp))), cl = f.map(x => M.db(bw.Af0 / Math.hypot(1, x / bw.fHf)));
      return {
        svg: plot({ xlog: true, xr: [0.1, 1e9], yr: [-20, p.A0dB + 10], xlabel: 'f / Hz', ylabel: '增益 / dB', series: [{ x: f, y: ol, label: '开环 A' }, { x: f, y: cl, label: '闭环 A_f', color: COL[1] }],
          vlines: [{ x: fp, label: 'f_p' }, { x: bw.fHf, label: 'f_Hf', color: COL[1] }] }),
        out: lines([row('环路增益 T = A₀β', `${fmt(r.T)}（${fmt(M.db(r.T))} dB）`), row('A<sub>f</sub> / 理想值 1/β', `${fmt(r.Af)} / ${fmt(1 / b)}`),
          row('反馈深度 1 + Aβ', fmt(r.D)), row(`A 变化 ${p.dA}% → A<sub>f</sub> 变化`, fmt(100 * (r2.Af - r.Af) / r.Af, 3) + '%（小量近似：' + fmt(p.dA / r.D, 3) + '%）'),
          row('闭环带宽 f<sub>Hf</sub> = f<sub>p</sub>(1 + A₀β)', eng(bw.fHf, 'Hz')), row('增益带宽积（开环 = 闭环）', eng(bw.GBW, 'Hz')),
          r.T < 10 ? '<span class="warnline">T &lt; 10：不是深度负反馈，A<sub>f</sub> ≈ 1/β 误差超过 9%。</span>' : '']),
      };
    },
  };

  L['fb-impedance'] = {
    title: '四种反馈组态对输入、输出电阻的影响', chapter: 11,
    desc: '输入端：串联混合（比较电压）使 R<sub>if</sub> = R<sub>i</sub>(1 + Aβ)；并联混合（比较电流）使 R<sub>if</sub> = R<sub>i</sub>/(1 + Aβ)。输出端：电压采样使 R<sub>of</sub> = R<sub>o</sub>/(1 + Aβ)；电流采样使 R<sub>of</sub> = R<sub>o</sub>(1 + Aβ)。这里 A、β 是拆环后按组态定义的量。',
    controls: [
      { id: 'topo', label: '组态（采样–混合）', type: 'select', value: 'series-shunt', options: [['series-shunt', '电压串联（串联–并联）'], ['shunt-shunt', '电压并联（并联–并联）'], ['series-series', '电流串联（串联–串联）'], ['shunt-series', '电流并联（并联–串联）']] },
      { id: 'Ri', label: '拆环后输入电阻 R_i', min: 0.1, max: 100, step: 0.1, value: 10, unit: 'kΩ' },
      { id: 'Ro', label: '拆环后输出电阻 R_o', min: 0.01, max: 100, step: 0.01, value: 2, unit: 'kΩ' },
      { id: 'Tdb', label: '环路增益 Aβ', min: 0, max: 80, step: 1, value: 40, unit: 'dB' },
    ],
    update(p) {
      const D = 1 + Math.pow(10, p.Tdb / 20);
      const r = M.fbImpedance(p.topo, p.Ri * 1e3, p.Ro * 1e3, D);
      const name = { 'series-shunt': ['电压', '串联', '电压放大器 A_v = v_o/v_i', '理想电压放大器'], 'shunt-shunt': ['电压', '并联', '互阻放大器 A_r = v_o/i_i', '理想互阻放大器'], 'series-series': ['电流', '串联', '互导放大器 A_g = i_o/v_i', '理想互导放大器'], 'shunt-series': ['电流', '并联', '电流放大器 A_i = i_o/i_i', '理想电流放大器'] }[p.topo];
      return {
        svg: '',
        out: lines([row('稳定的输出量', name[0] + (name[0] === '电压' ? '（输出电阻减小）' : '（输出电阻增大）')), row('输入端比较', name[1] === '串联' ? '电压（输入电阻增大）' : '电流（输入电阻减小）'),
          row('闭环等效为', name[2] + '，趋近' + name[3]), row('1 + Aβ', fmt(D)), row('R<sub>if</sub>', eng(r.Rif, 'Ω')), row('R<sub>of</sub>', eng(r.Rof, 'Ω'))]),
      };
    },
  };

  L['fb-stability'] = {
    title: '反馈稳定性：相位裕度与增益裕度', chapter: 11,
    desc: '环路增益 T(jf) = A₀β/[(1+jf/f<sub>1</sub>)(1+jf/f<sub>2</sub>)(1+jf/f<sub>3</sub>)]。|T| = 1 处相位离 −180° 的余量叫相位裕度 PM；相位到 −180° 处 |T| 低于 0 dB 的量叫增益裕度 GM。β 越大（反馈越深），越容易振荡。',
    controls: [
      { id: 'A0dB', label: '开环增益 A₀', min: 20, max: 120, step: 1, value: 80, unit: 'dB' },
      { id: 'bdB', label: '反馈系数 β', min: -80, max: 0, step: 1, value: -40, unit: 'dB' },
      { id: 'f1', label: 'f_1（对数）', min: 1, max: 6, step: 0.1, value: 3, map: v => Math.pow(10, v), digits: 0, unit: 'Hz' },
      { id: 'f2', label: 'f_2（对数）', min: 2, max: 8, step: 0.1, value: 6, map: v => Math.pow(10, v), digits: 0, unit: 'Hz' },
      { id: 'f3', label: 'f_3（对数）', min: 2, max: 9, step: 0.1, value: 7, map: v => Math.pow(10, v), digits: 0, unit: 'Hz' },
    ],
    update(p) {
      const T0 = Math.pow(10, (p.A0dB + p.bdB) / 20), poles = [p.f1, p.f2, p.f3].map(x => Math.pow(10, x));
      const r = M.loop(T0, poles);
      const f = logspace(10, 1e10, 400);
      const mag = f.map(x => M.db(M.cabs(r.T(x)))), ph = f.map(r.ph);
      // 幅度与相位画在一张图：相位按 1° = 0.5 dB 缩放到右侧不易读，改为两条曲线分别标注
      const svg = plot({ xlog: true, xr: [10, 1e10], yr: [-80, Math.max(20, p.A0dB + p.bdB + 10)], xlabel: 'f / Hz', ylabel: '|T| / dB', series: [{ x: f, y: mag, label: '|T|' }],
        vlines: [isFinite(r.fu) ? { x: r.fu, label: 'f_u', color: COL[1] } : null, isFinite(r.f180) ? { x: r.f180, label: 'f_180', color: COL[4] } : null].filter(Boolean), hlines: [{ y: 0, label: '0 dB' }] }) +
        plot({ xlog: true, xr: [10, 1e10], yr: [-280, 10], xlabel: 'f / Hz', ylabel: '∠T / °', series: [{ x: f, y: ph, color: COL[2], label: '∠T' }], hlines: [{ y: -180, label: '−180°', color: COL[4] }],
          vlines: isFinite(r.fu) ? [{ x: r.fu, label: 'f_u', color: COL[1] }] : [] });
      const stable = r.PM > 0;
      return {
        svg,
        out: lines([row('低频环路增益 A₀β', `${fmt(p.A0dB + p.bdB)} dB`), row('增益交点 f<sub>u</sub>', isFinite(r.fu) ? eng(r.fu, 'Hz') : '|T| 始终 &lt; 1'),
          row('相位裕度 PM', isFinite(r.PM) ? fmt(r.PM) + '°' : '—'), row('增益裕度 GM', isFinite(r.GM) ? fmt(r.GM) + ' dB' : '—'),
          stable ? (r.PM < 45 ? '<span class="warnline">稳定但 PM &lt; 45°：阶跃响应会有明显过冲。</span>' : '稳定，PM ≥ 45°。') : '<span class="warnline">PM ≤ 0：闭环不稳定（会振荡）。可减小 β、做主极点补偿（把 f<sub>1</sub> 移低）。</span>']),
      };
    },
  };

  /* ===== 第 12 章 功率放大器 ===== */
  L['pa-efficiency'] = {
    title: '甲类与乙类（OCL）功放的功率和效率', chapter: 12,
    desc: '双电源 ±V<sub>CC</sub>、负载 R<sub>L</sub>、正弦输出幅值 V<sub>om</sub>。乙类：P<sub>o</sub> = V<sub>om</sub>²/(2R<sub>L</sub>)，P<sub>V</sub> = 2V<sub>CC</sub>V<sub>om</sub>/(πR<sub>L</sub>)，η = πV<sub>om</sub>/(4V<sub>CC</sub>)，最大 78.5%。管耗最大出现在 V<sub>om</sub> = 2V<sub>CC</sub>/π，而不是满幅输出时。',
    controls: [
      { id: 'cls', label: '类型', type: 'select', value: 'B', options: [['B', '乙类互补推挽（OCL）'], ['A', '甲类射极跟随器（恒流源偏置）']] },
      { id: 'VCC', label: 'V_CC', min: 5, max: 30, step: 0.5, value: 12, unit: 'V' },
      { id: 'RL', label: 'R_L', min: 2, max: 32, step: 1, value: 8, unit: 'Ω' },
      { id: 'x', label: 'V_om / V_CC', min: 0, max: 1, step: 0.01, value: 0.8 },
    ],
    update(p) {
      const xs = lin(0, 1, 101), Vom = p.x * p.VCC;
      const f = p.cls === 'B' ? M.classB : M.classA;
      const cur = f(p.VCC, p.RL, Vom), curves = xs.map(x => f(p.VCC, p.RL, x * p.VCC));
      const s = [{ x: xs, y: curves.map(c => c.Po), label: 'P_o' }, { x: xs, y: curves.map(c => c.PV), label: 'P_V', color: COL[1] }, { x: xs, y: curves.map(c => c.PT), label: 'P_T(两管)', color: COL[4] }];
      const B = p.cls === 'B';
      return {
        svg: plot({ series: s, xr: [0, 1], yr: [0, Math.max(...curves.map(c => c.PV)) * 1.1], xlabel: 'V_om / V_CC', ylabel: '功率 / W', marks: [{ x: p.x, y: cur.Po, label: 'P_o' }],
          vlines: B ? [{ x: 2 / Math.PI, label: '2/π', color: COL[4] }] : [] }),
        out: lines([row('P<sub>o</sub> / P<sub>V</sub> / P<sub>T</sub>', `${fmt(cur.Po)} / ${fmt(cur.PV)} / ${fmt(cur.PT)} W`), row('效率 η', fmt(100 * cur.eta) + '%'),
          B ? row('最大输出 P<sub>om</sub> = V<sub>CC</sub>²/(2R<sub>L</sub>)', fmt(cur.PoMax) + ' W') : row('静态电流 I = V<sub>CC</sub>/R<sub>L</sub>（静态即耗电 2V<sub>CC</sub>I）', eng(cur.I, 'A')),
          B ? row('每管最大管耗 P<sub>T1max</sub> = V<sub>CC</sub>²/(π²R<sub>L</sub>) ≈ 0.2P<sub>om</sub>', fmt(cur.PTmax / 2) + ' W') : row('甲类最大效率（V<sub>om</sub> = V<sub>CC</sub>）', '25%'),
          '<span class="muted">理想化：忽略 V<sub>CE(sat)</sub>；实际 V<sub>om</sub> ≤ V<sub>CC</sub> − V<sub>CE(sat)</sub>。</span>']),
      };
    },
  };

  L['crossover'] = {
    title: '交越失真与甲乙类偏置', chapter: 12,
    desc: '乙类推挽管在 |v<sub>i</sub>| &lt; V<sub>BE(on)</sub> 时两管都不导通，输出出现“死区”。甲乙类给每管加预偏置 V<sub>bias</sub>（二极管或 V<sub>BE</sub> 倍增器），死区宽度变为 max(0, V<sub>BE(on)</sub> − V<sub>bias</sub>)。',
    controls: [
      { id: 'Vm', label: '输入幅值', min: 0.2, max: 5, step: 0.1, value: 2, unit: 'V' },
      { id: 'Von', label: 'V_BE(on)', min: 0.4, max: 0.8, step: 0.05, value: 0.6, unit: 'V' },
      { id: 'Vb', label: '每管预偏置 V_bias', min: 0, max: 0.8, step: 0.05, value: 0, unit: 'V' },
    ],
    update(p) {
      const t = lin(0, 2, 500), vi = t.map(x => p.Vm * Math.sin(2 * Math.PI * x)), vo = vi.map(v => M.pushPull(v, p.Von, p.Vb));
      const dead = Math.max(0, p.Von - p.Vb);
      // 基波以外成分的粗略量度：THD 数值计算（一个周期 DFT）
      const N = 250, a = []; for (let h = 1; h <= 9; h++) { let s = 0, c = 0; for (let i = 0; i < N; i++) { const th = 2 * Math.PI * i / N, v = M.pushPull(p.Vm * Math.sin(th), p.Von, p.Vb); s += v * Math.sin(h * th); c += v * Math.cos(h * th); } a.push(Math.hypot(s, c) * 2 / N); }
      const thd = a[0] > 0 ? Math.sqrt(a.slice(1).reduce((x, y) => x + y * y, 0)) / a[0] : NaN;
      return {
        svg: plot({ series: [{ x: t, y: vi, color: '#9aa7b8', dash: '4 3', label: 'v_i' }, { x: t, y: vo, label: 'v_o' }], xr: [0, 2], yr: [-p.Vm * 1.15, p.Vm * 1.15], xlabel: 't / T', ylabel: 'v / V', hlines: dead > 0 ? [{ y: dead, color: COL[4] }, { y: -dead, color: COL[4] }] : [] }),
        out: lines([row('死区半宽', fmt(dead) + ' V'), row('THD（数值，前 9 次谐波）', isFinite(thd) ? fmt(100 * thd) + '%' : '无输出'),
          dead === 0 ? '死区消失：工作在甲乙类，静态时两管都有小电流。' : '<span class="warnline">存在交越失真；小信号时失真占比更大。</span>',
          '<span class="muted">模型只表示死区，不含 V<sub>BE</sub> 的指数特性和热漂移。</span>']),
      };
    },
  };
})();
