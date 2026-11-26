/* eslint-disable no-var */
/**
 * Interactive Physics Labs UI & SVG Renderer for 大学物理甲-II (Chapters 9–14).
 * Depends on window.PhysicsModels (from models.js).
 */
(function () {
  'use strict';

  var M = window.PhysicsModels;

  function fmt(val, unit, digits) {
    var d = digits !== undefined ? digits : 3;
    if (!isFinite(val)) return '—';
    var abs = Math.abs(val);
    if (abs === 0) return '0 ' + (unit || '');
    if (abs >= 1e6) return (val / 1e6).toFixed(d) + ' M' + (unit || '');
    if (abs >= 1e3) return (val / 1e3).toFixed(d) + ' k' + (unit || '');
    if (abs >= 1) return val.toFixed(d) + ' ' + (unit || '');
    if (abs >= 1e-3) return (val * 1e3).toFixed(d) + ' m' + (unit || '');
    if (abs >= 1e-6) return (val * 1e6).toFixed(d) + ' μ' + (unit || '');
    if (abs >= 1e-9) return (val * 1e9).toFixed(d) + ' n' + (unit || '');
    return val.toExponential(2) + ' ' + (unit || '');
  }

  function svgCurvePlot(opts) {
    var w = 440, h = 210, padL = 48, padR = 18, padT = 20, padB = 34;
    var pw = w - padL - padR, ph = h - padT - padB;
    var xs = opts.xs, ys1 = opts.ys1, ys2 = opts.ys2;
    var yMin = opts.yMin !== undefined ? opts.yMin : Math.min.apply(null, ys1.concat(ys2 || [0]));
    var yMax = opts.yMax !== undefined ? opts.yMax : Math.max.apply(null, ys1.concat(ys2 || [1]));
    if (Math.abs(yMax - yMin) < 1e-18) { yMax += 1; yMin -= 1; }
    var xMin = xs[0], xMax = xs[xs.length - 1];
    function sx(x) { return padL + ((x - xMin) / (xMax - xMin || 1)) * pw; }
    function sy(y) { return padT + ph - ((y - yMin) / (yMax - yMin || 1)) * ph; }
    var pts1 = xs.map(function (x, i) { return sx(x).toFixed(1) + ',' + sy(ys1[i]).toFixed(1); }).join(' ');
    var pts2 = ys2 ? xs.map(function (x, i) { return sx(x).toFixed(1) + ',' + sy(ys2[i]).toFixed(1); }).join(' ') : '';
    var yZero = yMin <= 0 && yMax >= 0 ? sy(0) : sy(yMin);
    var curX = opts.markerX !== undefined ? sx(opts.markerX) : null;
    var curY = opts.markerY !== undefined ? sy(opts.markerY) : null;
    return (
      '<svg viewBox="0 0 ' + w + ' ' + h + '" class="lab-svg" role="img" aria-label="' + (opts.title || '物理曲线') + '">' +
      '<rect x="' + padL + '" y="' + padT + '" width="' + pw + '" height="' + ph + '" fill="var(--bg-elev)" rx="6" stroke="var(--border)" />' +
      '<line x1="' + padL + '" y1="' + yZero.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + yZero.toFixed(1) + '" stroke="var(--text-muted)" stroke-dasharray="3,3" stroke-width="1" />' +
      (opts.vLineX !== undefined ? '<line x1="' + sx(opts.vLineX).toFixed(1) + '" y1="' + padT + '" x2="' + sx(opts.vLineX).toFixed(1) + '" y2="' + (h - padB) + '" stroke="var(--warn)" stroke-dasharray="4,3" stroke-width="1.4" />' : '') +
      (pts2 ? '<polyline fill="none" stroke="var(--accent-2, #d97706)" stroke-width="2" stroke-dasharray="5,3" points="' + pts2 + '" />' : '') +
      '<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="' + pts1 + '" />' +
      (curX !== null && curY !== null ? '<circle cx="' + curX.toFixed(1) + '" cy="' + curY.toFixed(1) + '" r="5" fill="var(--accent)" stroke="#fff" stroke-width="1.8" />' : '') +
      '<text x="' + (padL + 6) + '" y="' + (padT + 14) + '" font-size="11" fill="var(--text-secondary)">' + (opts.yLabel || '') + '</text>' +
      '<text x="' + (w - padR - 4) + '" y="' + (h - 8) + '" text-anchor="end" font-size="11" fill="var(--text-secondary)">' + (opts.xLabel || '') + '</text>' +
      '</svg>'
    );
  }

  var LAB_SPECS = [
    {
      id: 'dipole-field',
      ch: 'ch09',
      title: '实验 9A · 电偶极子轴线与中垂线场强/电势远场对比',
      desc: '调节电偶极子电荷量 q、间距 l 与观测距离 r，对比精确叠加解与远场偶极近似（1/r³ 衰减及 E_轴 = 2E_中垂）。',
      controls: [
        { key: 'q_nC', label: '电荷量 q (nC)', min: 0.5, max: 10, step: 0.5, def: 2.0 },
        { key: 'l_cm', label: '偶极间距 l (cm)', min: 1.0, max: 6.0, step: 0.5, def: 2.0 },
        { key: 'r_cm', label: '观测距离 r (cm)', min: 4.0, max: 30.0, step: 0.5, def: 10.0 }
      ],
      compute: function (st) {
        var q = st.q_nC * 1e-9, l = st.l_cm * 0.01, r = Math.max(st.r_cm * 0.01, l * 0.7);
        var res = M.calcDipoleField({ q: q, l: l, r: r });
        var xs = [], ysExact = [], ysFar = [];
        for (var i = 0; i <= 40; i++) {
          var rk = l * 0.8 + (0.3 - l * 0.8) * (i / 40);
          var pt = M.calcDipoleField({ q: q, l: l, r: rk });
          xs.push(rk * 100);
          ysExact.push(pt.E_axis_exact);
          ysFar.push(pt.E_axis_far);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysExact, ys2: ysFar, markerX: r * 100, markerY: res.E_axis_exact, xLabel: '距离 r (cm)', yLabel: '实线:精确E_轴 / 虚线:远场近似' }),
          metrics: [
            { label: '电偶极矩 p = ql', val: fmt(res.p, 'C·m') },
            { label: '轴线精确场强 E_轴', val: fmt(res.E_axis_exact, 'V/m') },
            { label: '中垂线精确场强 E_⊥', val: fmt(res.E_perp_exact, 'V/m') },
            { label: '远场近似相对误差', val: (res.relErrAxis * 100).toFixed(2) + '% (r/l=' + res.ratio.toFixed(1) + ')' }
          ]
        };
      }
    },
    {
      id: 'ring-disk-gauss',
      ch: 'ch09',
      title: '实验 9B · 带电圆环/圆盘轴线场强与球壳/球体高斯分布',
      desc: '切换均匀带电细圆环（在 x=R/√2 处取极大值）、薄圆盘、球壳与实心球体，观察场强 E(r) 与电势 U(r) 的连续性与突变。',
      modes: [
        { val: 'ring', label: '细圆环轴线' },
        { val: 'disk', label: '薄圆盘轴线' },
        { val: 'shell', label: '均匀球壳径向' },
        { val: 'sphere', label: '均匀实心球径向' }
      ],
      controls: [
        { key: 'Q_nC', label: '总电量 Q (nC)', min: 1, max: 20, step: 1, def: 10 },
        { key: 'R_cm', label: '半径 R (cm)', min: 2, max: 10, step: 0.5, def: 5 },
        { key: 'x_cm', label: '位置 r 或 x (cm)', min: 0, max: 20, step: 0.25, def: 3.5 }
      ],
      compute: function (st) {
        var mode = st.mode || 'ring', Q = st.Q_nC * 1e-9, R = st.R_cm * 0.01, x = st.x_cm * 0.01;
        var res = M.calcRingDiskSphere({ mode: mode, Q: Q, R: R, x: x });
        var xs = [], ysE = [];
        for (var i = 0; i <= 50; i++) {
          var rk = 0.2 * (i / 50);
          xs.push(rk * 100);
          ysE.push(M.calcRingDiskSphere({ mode: mode, Q: Q, R: R, x: rk }).E);
        }
        var vLine = mode === 'ring' ? (res.xPeak * 100) : (R * 100);
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysE, markerX: x * 100, markerY: res.E, vLineX: vLine, xLabel: '位置 x 或 r (cm)', yLabel: '电场强度 E (V/m)' }),
          metrics: [
            { label: '当前位置场强 E', val: fmt(res.E, 'V/m') },
            { label: '当前位置电势 U', val: fmt(res.U, 'V') },
            { label: '特征半径 R', val: st.R_cm.toFixed(1) + ' cm' },
            { label: '圆环场强极值位置 R/√2', val: (res.xPeak * 100).toFixed(2) + ' cm' }
          ]
        };
      }
    },
    {
      id: 'conductor-plates',
      ch: 'ch10',
      title: '实验 10A · 平行金属板静电感应与接地/短接电荷重分布（例10.4）',
      desc: '调节两导体板带电量 Q_A、Q_B，切换孤立、B板接地、两板短接三种状态，实时观察四个表面电荷面密度 σ₁~σ₄ 与板间场强。',
      modes: [
        { val: 'isolated', label: '两板孤立' },
        { val: 'groundB', label: 'B板外侧接地' },
        { val: 'shortAB', label: 'A、B两板导线短接' }
      ],
      controls: [
        { key: 'QA_nC', label: 'A板初始电量 Q_A (nC)', min: -40, max: 60, step: 5, def: 30 },
        { key: 'QB_nC', label: 'B板初始电量 Q_B (nC)', min: -40, max: 60, step: 5, def: 10 },
        { key: 'd_mm', label: '板间距离 d (mm)', min: 2, max: 20, step: 1, def: 5 }
      ],
      compute: function (st) {
        var res = M.calcConductorPlates({ QA: st.QA_nC * 1e-9, QB: st.QB_nC * 1e-9, S: 0.01, d: st.d_mm * 1e-3, condition: st.mode || 'isolated' });
        var svg = '<svg viewBox="0 0 440 180" class="lab-svg">' +
          '<rect x="115" y="25" width="42" height="130" rx="4" fill="var(--bg-elev)" stroke="var(--accent)" stroke-width="2"/>' +
          '<rect x="275" y="25" width="42" height="130" rx="4" fill="var(--bg-elev)" stroke="var(--accent)" stroke-width="2"/>' +
          '<text x="136" y="92" text-anchor="middle" font-weight="700" fill="var(--text)">板 A</text>' +
          '<text x="296" y="92" text-anchor="middle" font-weight="700" fill="var(--text)">板 B</text>' +
          '<text x="72" y="55" text-anchor="middle" font-size="11" fill="var(--text-secondary)">σ₁=' + fmt(res.sigma1, 'C/m²', 2) + '</text>' +
          '<text x="200" y="45" text-anchor="middle" font-size="11" fill="var(--accent)">σ₂=' + fmt(res.sigma2, 'C/m²', 2) + '</text>' +
          '<text x="232" y="142" text-anchor="middle" font-size="11" fill="var(--accent)">σ₃=' + fmt(res.sigma3, 'C/m²', 2) + '</text>' +
          '<text x="368" y="55" text-anchor="middle" font-size="11" fill="var(--text-secondary)">σ₄=' + fmt(res.sigma4, 'C/m²', 2) + '</text>' +
          '<text x="216" y="96" text-anchor="middle" font-size="12" font-weight="600" fill="var(--warn)">E_II = ' + fmt(res.E_mid, 'V/m', 2) + '</text>' +
          '</svg>';
        return {
          svg: svg,
          metrics: [
            { label: '外表面面密度 σ₁ = σ₄', val: fmt(res.sigma1, 'C/m²') },
            { label: '内表面面密度 σ₂ = -σ₃', val: fmt(res.sigma2, 'C/m²') },
            { label: '板间匀强电场 E_II', val: fmt(res.E_mid, 'V/m') },
            { label: '板间电势差 U_AB', val: fmt(res.U_AB, 'V') }
          ]
        };
      }
    },
    {
      id: 'dielectric-cap',
      ch: 'ch10',
      title: '实验 10B · 电介质电容器（并联分块例10.9 vs 串联分层）与恒Q/恒U对比',
      desc: '对比介质与空气并排并联（强制 E₁=E₂、自由电荷按 ε_r 重分布）与上下串联分层（强制 D₁=D₂），并观察恒电量 Q 与恒电压 U 下的储能变化。',
      modes: [
        { val: 'parallel', label: '并排填充(例10.9: E₁=E₂)' },
        { val: 'series', label: '分层填充(串联: D₁=D₂)' }
      ],
      controls: [
        { key: 'er', label: '相对介电常数 ε_r', min: 1.5, max: 8.0, step: 0.5, def: 4.0 },
        { key: 'frac', label: '介质占比 α', min: 0.1, max: 0.9, step: 0.05, def: 0.5 },
        { key: 'constU', label: '电源模式 (0=恒Q断电, 1=恒U接电源)', min: 0, max: 1, step: 1, def: 0 }
      ],
      compute: function (st) {
        var geom = st.mode || 'parallel', src = st.constU > 0.5 ? 'constU' : 'constQ';
        var res = M.calcDielectricCap({ geom: geom, source: src, er: st.er, frac: st.frac, S: 0.02, d: 0.002, U0: 100 });
        var xs = [], ysC = [];
        for (var i = 0; i <= 30; i++) {
          var fk = 0.05 + 0.9 * (i / 30);
          xs.push(fk);
          ysC.push(M.calcDielectricCap({ geom: geom, source: src, er: st.er, frac: fk, S: 0.02, d: 0.002, U0: 100 }).C * 1e12);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysC, markerX: st.frac, markerY: res.C * 1e12, xLabel: '介质填充比例 α', yLabel: '等效电容 C (pF)' }),
          metrics: [
            { label: '等效电容 C (C₀=' + fmt(res.C0, 'F', 1) + ')', val: fmt(res.C, 'F') },
            { label: '介质区/真空区场强 E₁ / E₂', val: fmt(res.E1, 'V/m', 1) + ' / ' + fmt(res.E2, 'V/m', 1) },
            { label: '介质区/真空区电位移 D₁ / D₂', val: fmt(res.D1, 'C/m²', 2) + ' / ' + fmt(res.D2, 'C/m²', 2) },
            { label: '极化电荷 σ\' 与静电能 W_e', val: fmt(res.sigma_bound1, 'C/m²', 2) + ' | ' + fmt(res.We, 'J', 2) }
          ]
        };
      }
    },
    {
      id: 'bridge-circuit',
      ch: 'ch11',
      title: '实验 11A · 非平衡惠斯通电桥支路电流与等效电阻（例11.3）',
      desc: '默认参数即课件 p261 例11.3（U=13V, R₁=R₂=R₃=R₅=1Ω, R₄=2Ω, I_总=11A, R_eq=13/11Ω）。调节各桥臂电阻观察检流支路电流 I₅ 与平衡条件 R₁R₄=R₂R₃。',
      controls: [
        { key: 'U', label: '电源电压 U (V)', min: 2, max: 26, step: 1, def: 13 },
        { key: 'R2', label: '左下桥臂 R₂ (Ω)', min: 0.5, max: 4.0, step: 0.25, def: 1.0 },
        { key: 'R4', label: '右下桥臂 R₄ (Ω)', min: 0.5, max: 4.0, step: 0.25, def: 2.0 },
        { key: 'R5', label: '桥支路电阻 R₅ (Ω)', min: 0.5, max: 5.0, step: 0.25, def: 1.0 }
      ],
      compute: function (st) {
        var res = M.calcBridgeCircuit({ U: st.U, R1: 1, R2: st.R2, R3: 1, R4: st.R4, R5: st.R5 });
        var xs = [], ysI5 = [];
        for (var i = 0; i <= 35; i++) {
          var r4k = 0.5 + 3.5 * (i / 35);
          xs.push(r4k);
          ysI5.push(M.calcBridgeCircuit({ U: st.U, R1: 1, R2: st.R2, R3: 1, R4: r4k, R5: st.R5 }).I5);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysI5, markerX: st.R4, markerY: res.I5, vLineX: st.R2, xLabel: '右下桥臂电阻 R₄ (Ω)', yLabel: '桥支路电流 I₅ (A)' }),
          metrics: [
            { label: '左臂电流 I₁ / I₂', val: res.I1.toFixed(2) + ' A / ' + res.I2.toFixed(2) + ' A' },
            { label: '桥支路电流 I₅ (a→b)', val: res.I5.toFixed(3) + ' A (V_ab=' + res.VBC.toFixed(2) + ' V)' },
            { label: '干路总电流 I_总', val: res.Itotal.toFixed(3) + ' A' },
            { label: '网络等效电阻 R_eq', val: res.Req.toFixed(4) + ' Ω' }
          ]
        };
      }
    },
    {
      id: 'rc-transient',
      ch: 'ch11',
      title: '实验 11B · RC 电路充放电暂态响应与时间常数 τ = RC',
      desc: '观察电容电压 u_C(t) 与电流 i(t) 的指数弛豫规律，验证 t = τ 时充电达 63.2% E、放电剩 36.8% E。',
      modes: [
        { val: 'charge', label: 'RC 充电过程' },
        { val: 'discharge', label: 'RC 放电过程' }
      ],
      controls: [
        { key: 'R_k', label: '电阻 R (kΩ)', min: 0.5, max: 5.0, step: 0.25, def: 2.0 },
        { key: 'C_uF', label: '电容 C (μF)', min: 0.5, max: 4.0, step: 0.25, def: 1.0 },
        { key: 't_ms', label: '观测时刻 t (ms)', min: 0, max: 12.0, step: 0.2, def: 2.0 }
      ],
      compute: function (st) {
        var mode = st.mode || 'charge', R = st.R_k * 1e3, C = st.C_uF * 1e-6, t = st.t_ms * 1e-3;
        var res = M.calcRCTransient({ E: 10, R: R, C: C, t: t, mode: mode });
        var xs = [], ysU = [];
        for (var i = 0; i <= 48; i++) {
          var tk = 0.012 * (i / 48);
          xs.push(tk * 1e3);
          ysU.push(M.calcRCTransient({ E: 10, R: R, C: C, t: tk, mode: mode }).uC);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysU, markerX: st.t_ms, markerY: res.uC, vLineX: res.tau * 1e3, yMin: 0, yMax: 10.5, xLabel: '时间 t (ms) [虚线: τ=RC]', yLabel: '电容电压 u_C (V)' }),
          metrics: [
            { label: '时间常数 τ = RC', val: (res.tau * 1e3).toFixed(2) + ' ms' },
            { label: '当前电容电压 u_C(t)', val: res.uC.toFixed(2) + ' V' },
            { label: '当前支路电流 i(t)', val: fmt(res.i, 'A') },
            { label: '电容储能 W_C(t)', val: fmt(res.WC, 'J') }
          ]
        };
      }
    },
    {
      id: 'biot-savart',
      ch: 'ch12',
      title: '实验 12A · 毕奥-萨伐尔定律：圆线圈、亥姆霍兹双线圈与有限长螺线管轴线磁场',
      desc: '对比单圆线圈、双共轴线圈（d=R 时中心二阶导为零，形成亥姆霍兹匀强区）与有限长螺线管的轴线 B(x) 分布。',
      modes: [
        { val: 'loop', label: '单圆线圈' },
        { val: 'helmholtz', label: '双共轴线圈(亥姆霍兹)' },
        { val: 'solenoid', label: '有限长螺线管' }
      ],
      controls: [
        { key: 'I', label: '电流 I (A)', min: 0.5, max: 10.0, step: 0.5, def: 2.0 },
        { key: 'R_cm', label: '半径 R (cm)', min: 2.0, max: 10.0, step: 0.5, def: 5.0 },
        { key: 'L_cm', label: '间距 d 或管长 L (cm)', min: 2.0, max: 16.0, step: 0.5, def: 5.0 },
        { key: 'x_cm', label: '轴向位置 x (cm)', min: -12.0, max: 12.0, step: 0.5, def: 0.0 }
      ],
      compute: function (st) {
        var mode = st.mode || 'loop', R = st.R_cm * 0.01, L = st.L_cm * 0.01, x = st.x_cm * 0.01;
        var res = M.calcBiotSavart({ mode: mode, I: st.I, R: R, N: 100, L: L, x: x });
        var xs = [], ysB = [];
        for (var i = 0; i <= 48; i++) {
          var xk = -0.12 + 0.24 * (i / 48);
          xs.push(xk * 100);
          ysB.push(M.calcBiotSavart({ mode: mode, I: st.I, R: R, N: 100, L: L, x: xk }).B * 1e3);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysB, markerX: st.x_cm, markerY: res.B * 1e3, yMin: 0, xLabel: '轴向坐标 x (cm)', yLabel: '磁感应强度 B (mT)' }),
          metrics: [
            { label: '中心场强 B(0)', val: fmt(res.B0, 'T') },
            { label: '当前点场强 B(x)', val: fmt(res.B, 'T') },
            { label: '均匀度 B(x)/B(0)', val: ((res.B / Math.max(res.B0, 1e-18)) * 100).toFixed(1) + '%' },
            { label: '几何比值 L/R', val: (L / R).toFixed(2) + (mode === 'helmholtz' && Math.abs(L - R) < 1e-4 ? ' (最佳匀强 d=R)' : '') }
          ]
        };
      }
    },
    {
      id: 'ampere-cyclotron',
      ch: 'ch12',
      title: '实验 12B · 安培环路定律径向分布（圆柱/无限大厚板例12.4）与回旋运动',
      desc: '对比圆柱载流导体（内部 ∝ r，外部 ∝ 1/r）与无限大均匀载流厚板（内部 ∝ x，外部恒定）的磁场分布，以及带电粒子在磁场中的螺旋运动。',
      modes: [
        { val: 'cylinder', label: '圆柱形载流导体' },
        { val: 'slab', label: '无限大均匀载流厚板(例12.4)' },
        { val: 'cyclotron', label: '带电粒子螺旋回旋' }
      ],
      controls: [
        { key: 'I', label: '总电流 I (A)', min: 2, max: 40, step: 2, def: 15 },
        { key: 'R_cm', label: '半径 R 或半厚 d/2 (cm)', min: 1.5, max: 8.0, step: 0.5, def: 4.0 },
        { key: 'r_cm', label: '径向距离 r (cm)', min: 0, max: 15.0, step: 0.25, def: 2.5 }
      ],
      compute: function (st) {
        var mode = st.mode || 'cylinder', R = st.R_cm * 0.01, r = st.r_cm * 0.01;
        var res = M.calcAmpereCyclotron({ mode: mode, I: st.I, R: R, r: r, B: 0.01, v0: 3e6, pitchDeg: 60 });
        var xs = [], ysB = [];
        for (var i = 0; i <= 45; i++) {
          var rk = 0.15 * (i / 45);
          xs.push(rk * 100);
          ysB.push(M.calcAmpereCyclotron({ mode: mode === 'cyclotron' ? 'cylinder' : mode, I: st.I, R: R, r: rk }).B * 1e6);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysB, markerX: st.r_cm, markerY: (res.B || 0) * 1e6, vLineX: st.R_cm, yMin: 0, xLabel: '距离 r (cm) [虚线: 导体边界 R]', yLabel: '磁感应强度 B (μT)' }),
          metrics: mode === 'cyclotron' ? [
            { label: '回旋半径 R = mv_⊥/(qB)', val: fmt(res.R_cyc, 'm') },
            { label: '回旋周期 T = 2πm/(qB)', val: fmt(res.T_cyc, 's') },
            { label: '螺距 h = v_∥ T', val: fmt(res.h_pitch, 'm') },
            { label: '垂直/平行分速度', val: fmt(res.vPerp, 'm/s', 2) + ' / ' + fmt(res.vPara, 'm/s', 2) }
          ] : [
            { label: '当前点磁感应强度 B(r)', val: fmt(res.B, 'T') },
            { label: '表面最大磁场 B(R)', val: fmt(res.Bpeak, 'T') },
            { label: '区域判别', val: r <= R ? '导体内部 (线性增长)' : (mode === 'slab' ? '厚板外部 (匀强恒定)' : '圆柱外部 (1/r衰减)') },
            { label: '比值 r / R', val: (r / R).toFixed(2) }
          ]
        };
      }
    },
    {
      id: 'media-boundary',
      ch: 'ch13',
      title: '实验 13A · 磁介质螺线管与同轴电缆中的 H、M、B 与磁化面电流（例13.1/13.2）',
      desc: '默认参数即课件 p384 例13.1（n=10 cm⁻¹=1000 m⁻¹, I=2A, μ_r=250）。观察磁场强度 H 仅由传导电流决定，而磁化强度 M 与附加磁场 B\' 随 μ_r 成倍放大。',
      controls: [
        { key: 'n', label: '单位长度匝数 n (匝/m)', min: 200, max: 2000, step: 100, def: 1000 },
        { key: 'I', label: '传导电流 I (A)', min: 0.5, max: 5.0, step: 0.25, def: 2.0 },
        { key: 'ur', label: '相对磁导率 μ_r', min: 1, max: 500, step: 1, def: 250 }
      ],
      compute: function (st) {
        var res = M.calcMagneticMedia({ n: st.n, I: st.I, ur: st.ur });
        var xs = [], ysB = [];
        for (var i = 0; i <= 40; i++) {
          var uk = 1 + 499 * (i / 40);
          xs.push(uk);
          ysB.push(M.calcMagneticMedia({ n: st.n, I: st.I, ur: uk }).B);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysB, markerX: st.ur, markerY: res.B, yMin: 0, xLabel: '相对磁导率 μ_r', yLabel: '总磁感应强度 B (T)' }),
          metrics: [
            { label: '磁场强度 H = nI', val: fmt(res.H, 'A/m') },
            { label: '磁化强度 M = (μ_r-1)H', val: fmt(res.M, 'A/m') },
            { label: '真空磁场 B₀ vs 磁化场 B\'', val: fmt(res.B0, 'T', 2) + ' / ' + fmt(res.Bprime, 'T', 3) },
            { label: '总磁感应强度 B = μ₀μ_r H', val: fmt(res.B, 'T', 3) + ' (j_m=' + fmt(res.jm, 'A/m', 2) + ')' }
          ]
        };
      }
    },
    {
      id: 'ferro-hysteresis',
      ch: 'ch13',
      title: '实验 13B · 铁磁质起始磁化曲线与磁滞回线 B(H)（例13.3）',
      desc: '调节矫顽力 H_c、饱和磁感应强度 B_s 与外加磁场 H，观察剩磁 B_r、非线性磁导率 μ_r(H) 及软磁/硬磁材料的磁滞损耗面积。',
      controls: [
        { key: 'Hc', label: '矫顽力 H_c (A/m)', min: 20, max: 400, step: 10, def: 160 },
        { key: 'Bs', label: '饱和磁感应强度 B_s (T)', min: 0.4, max: 2.0, step: 0.1, def: 1.4 },
        { key: 'H', label: '当前外磁场强度 H (A/m)', min: -800, max: 800, step: 20, def: 200 }
      ],
      compute: function (st) {
        var res = M.calcFerroHysteresis({ Hs: 800, Hc: st.Hc, Bs: st.Bs, H: st.H });
        var xs = [], ysUp = [], ysLow = [];
        for (var i = 0; i <= 48; i++) {
          var hk = -800 + 1600 * (i / 48);
          var pt = M.calcFerroHysteresis({ Hs: 800, Hc: st.Hc, Bs: st.Bs, H: hk });
          xs.push(hk);
          ysUp.push(pt.B_upper);
          ysLow.push(pt.B_lower);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysUp, ys2: ysLow, markerX: st.H, markerY: res.B_init, yMin: -2.1, yMax: 2.1, xLabel: '磁场强度 H (A/m)', yLabel: '磁滞回线上/下支 B (T)' }),
          metrics: [
            { label: '剩磁 B_r (H=0)', val: res.Br.toFixed(2) + ' T' },
            { label: '矫顽力 H_c (B=0)', val: st.Hc.toFixed(0) + ' A/m' },
            { label: '当前等效相对磁导率 μ_r', val: res.ur_eff.toFixed(0) },
            { label: '单周期磁滞损耗密度', val: fmt(res.loopArea, 'J/m³') }
          ]
        };
      }
    },
    {
      id: 'motional-vortex',
      ch: 'ch14',
      title: '实验 14A · 圆柱形时变磁场感生电场 E_i(r) 与运动导体棒电动势（例14.6/14.7/14.9）',
      desc: '验证圆柱形匀强磁场区域内外感生电场 E_i(r) 的分段规律（内部 ∝ r、外部 ∝ 1/r），并对比例14.9 中棒长 2R 运动时的感生电动势与动生电动势。',
      controls: [
        { key: 'R_cm', label: '磁场区半径 R (cm)', min: 4.0, max: 20.0, step: 1.0, def: 10.0 },
        { key: 'dBdt', label: '磁场变化率 dB/dt (T/s)', min: 0.1, max: 2.0, step: 0.1, def: 0.5 },
        { key: 'v', label: '导体棒平动速度 v (m/s)', min: 0.0, max: 5.0, step: 0.25, def: 1.5 },
        { key: 'r_cm', label: '探测点径向距离 r (cm)', min: 0.0, max: 30.0, step: 0.5, def: 8.0 }
      ],
      compute: function (st) {
        var R = st.R_cm * 0.01, r = st.r_cm * 0.01;
        var res = M.calcMotionalVortex({ R: R, dBdt: st.dBdt, B: 0.4, v: st.v, r: r });
        var xs = [], ysE = [];
        for (var i = 0; i <= 45; i++) {
          var rk = 0.3 * (i / 45);
          xs.push(rk * 100);
          ysE.push(M.calcMotionalVortex({ R: R, dBdt: st.dBdt, B: 0.4, v: st.v, r: rk }).Ei * 1e3);
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysE, markerX: st.r_cm, markerY: res.Ei * 1e3, vLineX: st.R_cm, yMin: 0, xLabel: '径向距离 r (cm) [虚线: 磁场边界 R]', yLabel: '感生电场 E_i(r) (mV/m)' }),
          metrics: [
            { label: '当前点感生电场 E_i(r)', val: fmt(res.Ei, 'V/m') },
            { label: '边界最大感生场 E_i(R)', val: fmt(res.Ei_max, 'V/m') },
            { label: '例14.9 全棒感生电动势 ε_i1', val: fmt(res.eps_vortex_ac, 'V') },
            { label: '例14.9 动生电动势 ε_i2 (仅ab段)', val: fmt(res.eps_motional_ab, 'V') + ' | 总ε=' + fmt(res.eps_total_ac, 'V') }
          ]
        };
      }
    },
    {
      id: 'rl-mutual',
      ch: 'ch14',
      title: '实验 14B · 不等半径共轴螺线管互感系数（例14.12 陷阱）与 RL 暂态响应',
      desc: '检验课件 p491 例14.12 经典陷阱：当 R₁ > R₂ 时，磁通量受限于内管截面积 πR₂²，真实互感 M = (R₂/R₁)√(L₁L₂)，而非错误的 (R₁/R₂)√(L₁L₂)。',
      controls: [
        { key: 'R1_cm', label: '外螺线管半径 R₁ (cm)', min: 3.0, max: 10.0, step: 0.5, def: 5.0 },
        { key: 'R2_cm', label: '内螺线管半径 R₂ (cm)', min: 1.0, max: 5.0, step: 0.5, def: 3.0 },
        { key: 'N1', label: '外管匝数 N₁', min: 100, max: 800, step: 50, def: 400 },
        { key: 'N2', label: '内管匝数 N₂', min: 100, max: 800, step: 50, def: 300 }
      ],
      compute: function (st) {
        var R1 = st.R1_cm * 0.01, R2 = Math.min(R1, st.R2_cm * 0.01);
        var res = M.calcRLMutual({ R1: R1, R2: R2, N1: st.N1, N2: st.N2, l: 0.5, R_res: 10, I0: 2.0, t: 0.0005 });
        var xs = [], ysM = [], ysWrong = [];
        for (var i = 0; i <= 36; i++) {
          var r2k = 0.005 + (R1 - 0.005) * (i / 36);
          var pt = M.calcRLMutual({ R1: R1, R2: r2k, N1: st.N1, N2: st.N2, l: 0.5 });
          xs.push(r2k * 100);
          ysM.push(pt.M * 1e3);
          ysWrong.push(Math.min(pt.M_wrong * 1e3, pt.L1 * 3e3));
        }
        return {
          svg: svgCurvePlot({ xs: xs, ys1: ysM, ys2: ysWrong, markerX: R2 * 100, markerY: res.M * 1e3, yMin: 0, xLabel: '内管半径 R₂ (cm)', yLabel: '实线:真实互感 M / 虚线:误用外管面积(mH)' }),
          metrics: [
            { label: '自感系数 L₁ / L₂', val: fmt(res.L1, 'H', 2) + ' / ' + fmt(res.L2, 'H', 2) },
            { label: '真实互感 M = (R₂/R₁)√(L₁L₂)', val: fmt(res.M, 'H', 3) },
            { label: '耦合系数 K = R₂ / R₁', val: res.kCoupling.toFixed(3) },
            { label: '误用外管面积算出的伪互感', val: fmt(res.M_wrong, 'H', 3) + ' (错误偏大!)' }
          ]
        };
      }
    }
  ];

  var LAB_MAP = {};
  LAB_SPECS.forEach(function (sp) { LAB_MAP[sp.id] = sp; });

  function mountSingleLab(container, spec) {
    if (!container || !spec) return;
    var state = {};
    if (spec.modes && spec.modes.length) state.mode = spec.modes[0].val;
    spec.controls.forEach(function (c) { state[c.key] = c.def; });

    var modesHtml = '';
    if (spec.modes && spec.modes.length) {
      modesHtml = '<div class="lab-modes">' + spec.modes.map(function (m, idx) {
        return '<button type="button" class="lab-mode-btn' + (idx === 0 ? ' active' : '') + '" data-mode="' + m.val + '">' + m.label + '</button>';
      }).join('') + '</div>';
    }

    var ctrlsHtml = spec.controls.map(function (c) {
      return (
        '<label class="lab-ctrl">' +
        '<span class="lab-ctrl-head"><span>' + c.label + '</span><strong class="lab-ctrl-val" data-val-for="' + c.key + '">' + c.def + '</strong></span>' +
        '<input type="range" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + c.def + '" data-key="' + c.key + '" />' +
        '</label>'
      );
    }).join('');

    container.innerHTML =
      '<section class="lab-card" data-lab-id="' + spec.id + '">' +
      '<div class="lab-header">' +
      '<div><span class="lab-badge">互动物理实验</span><h4 class="lab-title">' + spec.title + '</h4></div>' +
      '<button type="button" class="btn-ghost lab-reset-btn">重置参数</button>' +
      '</div>' +
      '<p class="lab-desc">' + spec.desc + '</p>' +
      modesHtml +
      '<div class="lab-grid">' +
      '<div class="lab-controls">' + ctrlsHtml + '</div>' +
      '<div class="lab-stage"><div class="lab-svg-wrap"></div><div class="lab-metrics"></div></div>' +
      '</div>' +
      '</section>';

    var svgWrap = container.querySelector('.lab-svg-wrap');
    var metricsWrap = container.querySelector('.lab-metrics');

    function update() {
      var out = spec.compute(state);
      svgWrap.innerHTML = out.svg;
      metricsWrap.innerHTML = out.metrics.map(function (m) {
        return '<div class="lab-metric"><span class="lab-metric-label">' + m.label + '</span><strong class="lab-metric-val">' + m.val + '</strong></div>';
      }).join('');
    }

    container.querySelectorAll('input[type="range"]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-key');
        state[k] = parseFloat(inp.value);
        var valEl = container.querySelector('[data-val-for="' + k + '"]');
        if (valEl) valEl.textContent = inp.value;
        update();
      });
    });

    container.querySelectorAll('.lab-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.lab-mode-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.mode = btn.getAttribute('data-mode');
        update();
      });
    });

    var resetBtn = container.querySelector('.lab-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        mountSingleLab(container, spec);
      });
    }

    update();
  }

  function mountAllLabs(rootEl) {
    var scope = rootEl || document;
    scope.querySelectorAll('.lab-mount[data-lab]').forEach(function (el) {
      var id = el.getAttribute('data-lab');
      if (LAB_MAP[id]) mountSingleLab(el, LAB_MAP[id]);
    });
  }

  window.LAB_SPECS = LAB_SPECS;
  window.LAB_MAP = LAB_MAP;
  window.mountSingleLab = mountSingleLab;
  window.mountAllLabs = mountAllLabs;
})();
