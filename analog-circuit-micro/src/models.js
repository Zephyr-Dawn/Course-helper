/* 纯数值模型（SI 单位）。浏览器中挂到 window.M，Node 中 module.exports，供 tests/models.test.cjs 校验。 */
(function (root) {
  'use strict';
  const k = 1.380649e-23, q = 1.602176634e-19;
  const M = {};
  M.VT = T => k * T / q;                                   // 热电压 V
  M.par = function () { let s = 0; for (const x of arguments) { if (x === Infinity) continue; if (!(x > 0)) return 0; s += 1 / x; } return s === 0 ? Infinity : 1 / s; };

  /* ---------- 二极管 ---------- */
  M.diodeI = (v, Is, n, VT) => Is * (Math.exp(v / (n * VT)) - 1);
  M.diodeV = (i, Is, n, VT) => n * VT * Math.log(i / Is + 1);
  // 串联 Vs-R-D：解 Vs = I R + n VT ln(I/Is+1)，二分法（单调）
  M.diodeLoad = (Vs, R, Is, n, VT) => {
    if (Vs <= 0) { // 反偏：I≈-Is
      return { I: -Is * (1 - Math.exp(Vs / (n * VT))) , V: Vs };
    }
    let lo = 0, hi = Vs / R;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; const f = m * R + M.diodeV(m, Is, n, VT) - Vs; if (f > 0) hi = m; else lo = m; }
    const I = (lo + hi) / 2;
    return { I, V: Vs - I * R };
  };
  // 恒压降模型
  M.diodeCVD = (Vs, R, Von) => (Vs > Von ? { I: (Vs - Von) / R, V: Von, on: true } : { I: 0, V: Vs, on: false });

  /* 整流 + 电容滤波：逐点时间仿真（理想二极管 + 恒压降 Von，变压器副边峰值 Vp） */
  M.rectifier = ({ type, Vp, f, RL, C, Von, cycles = 3, N = 1200 }) => {
    const T = 1 / f, dt = cycles * T / N;
    const drop = type === 'bridge' ? 2 * Von : Von;
    let vc = 0; const ts = [], vin = [], vo = [];
    for (let i = 0; i <= N; i++) {
      const t = i * dt, s = Vp * Math.sin(2 * Math.PI * f * t);
      const src = type === 'half' ? s - drop : Math.abs(s) - drop; // 全波/桥式取绝对值
      let v;
      if (!(C > 0)) v = Math.max(0, src);
      else {
        // 电容放电 dt 后与源比较：源高则二极管导通，跟随源
        const vd = vc * Math.exp(-dt / (RL * C));
        v = Math.max(vd, src, 0); vc = v;
      }
      ts.push(t); vin.push(s); vo.push(v);
    }
    const tail = vo.slice(Math.floor(N / cycles));
    const vmax = Math.max(...tail), vmin = Math.min(...tail);
    const fr = type === 'half' ? f : 2 * f;
    const VpOut = Vp - drop;
    return { ts, vin, vo, ripple: vmax - vmin, vmax, vmin, ripApprox: C > 0 ? VpOut / (fr * RL * C) : NaN,
      vavg: tail.reduce((a, b) => a + b, 0) / tail.length, PIV: type === 'half' ? (C > 0 ? 2 * Vp - Von : Vp) : type === 'center' ? 2 * Vp - Von : Vp - Von, fr };
  };

  /* 限幅与钳位（理想二极管 + Von） */
  M.shaper = (mode, vin, Vref, Von, state) => {
    switch (mode) {
      case 'upper': return Math.min(vin, Vref + Von);                    // 并联上限幅
      case 'lower': return Math.max(vin, -(Vref + Von));                 // 并联下限幅
      case 'double': return Math.max(Math.min(vin, Vref + Von), -(Vref + Von));
      case 'series': return vin > Von ? vin - Von : 0;                   // 串联（半波）
      default: return vin;
    }
  };
  // 正钳位：电容充到 -(min(vin)) - Von 后保持（理想、RC>>T）
  M.clampShift = (Vp, Von, positive) => positive ? Vp - Von : -(Vp - Von);

  /* 齐纳稳压：Vs-Rs-(Dz∥RL)，Dz 模型 Vz0 + rz·Iz（Iz≥0），否则开路 */
  M.zener = (Vs, Rs, RL, Vz0, rz) => {
    const Vopen = Vs * RL / (Rs + RL);
    if (Vopen <= Vz0) return { Vo: Vopen, Iz: 0, Is: Vs / (Rs + RL), IL: Vopen / RL, on: false };
    // 节点：(Vs-V)/Rs = (V-Vz0)/rz + V/RL
    const G = 1 / Rs + 1 / rz + 1 / RL;
    const V = (Vs / Rs + Vz0 / rz) / G;
    return { Vo: V, Iz: (V - Vz0) / rz, Is: (Vs - V) / Rs, IL: V / RL, on: true };
  };

  /* ---------- BJT ---------- */
  M.bjtIc = (IB, vce, beta, VA, VCEsat = 0.2) => {
    const act = beta * IB * (1 + vce / VA);
    // 饱和区平滑过渡：ic = act·(1-exp(-vce/Vk))，Vk 取 VCEsat/3，仅用于画图
    return act * (1 - Math.exp(-vce / (VCEsat / 3)));
  };
  // 分压式偏置（戴维南等效），VBE 恒定；返回 Q 点与工作区
  M.bjtDivider = ({ VCC, R1, R2, RC, RE, beta, VBE = 0.7, VCEsat = 0.2 }) => {
    const VBB = VCC * R2 / (R1 + R2), RB = M.par(R1, R2);
    if (VBB <= VBE) return { region: '截止', IB: 0, IC: 0, IE: 0, VCE: VCC, VBB, RB };
    let IB = (VBB - VBE) / (RB + (beta + 1) * RE);
    let IC = beta * IB, IE = (beta + 1) * IB;
    let VCE = VCC - IC * RC - IE * RE;
    if (VCE >= VCEsat) return { region: '放大', IB, IC, IE, VCE, VBB, RB };
    // 饱和：VCE = VCEsat，解 IB、IC（两回路），β 不再约束
    // VBB = IB RB + VBE + (IB+IC) RE ; VCC = IC RC + VCEsat + (IB+IC) RE
    const a11 = RB + RE, a12 = RE, b1 = VBB - VBE, a21 = RE, a22 = RC + RE, b2 = VCC - VCEsat;
    const det = a11 * a22 - a12 * a21;
    IB = (b1 * a22 - a12 * b2) / det; IC = (a11 * b2 - a21 * b1) / det;
    return { region: '饱和', IB, IC, IE: IB + IC, VCE: VCEsat, VBB, RB, betaForced: IC / IB };
  };
  // 三种组态小信号（混合 π，含 ro 选项）。返回 Av(vo/vi)、Avs(vo/vs)、Rin、Rout
  M.bjtAmp = ({ cfg, IC, beta, VT = 0.025, RC, RE = 0, RL = Infinity, RS = 0, RB = Infinity, VA = Infinity }) => {
    const gm = IC / VT, rpi = beta / gm, ro = VA === Infinity ? Infinity : VA / IC;
    let Av, Rin, Rout;
    const RLp = M.par(RC, RL, ro);
    if (cfg === 'CE') {
      if (RE === 0) { Av = -gm * RLp; Rin = M.par(RB, rpi); Rout = M.par(RC, ro); }
      else { const Rb = rpi + (beta + 1) * RE; Av = -beta * M.par(RC, RL) / Rb; Rin = M.par(RB, Rb); Rout = RC; } // 有 RE 时忽略 ro
    } else if (cfg === 'CC') {
      const REp = M.par(RE, RL, ro);
      Av = (beta + 1) * REp / (rpi + (beta + 1) * REp);
      Rin = M.par(RB, rpi + (beta + 1) * REp);
      Rout = M.par(RE, (rpi + M.par(RS, RB)) / (beta + 1));
    } else { // CB
      const re = rpi / (beta + 1);
      Av = gm * M.par(RC, RL);
      Rin = M.par(RE, re); Rout = RC;
    }
    const Avs = Av * Rin / (Rin + RS);
    return { gm, rpi, ro, Av, Avs, Rin, Rout };
  };

  /* ---------- MOSFET（平方律 + λ） ---------- */
  M.mosId = (vgs, vds, k, Vth, lam) => { // k = μnCox W/L
    const vov = vgs - Vth;
    if (vov <= 0) return 0;
    if (vds < vov) return k * (vov * vds - vds * vds / 2) * (1 + lam * vds);
    return 0.5 * k * vov * vov * (1 + lam * vds);
  };
  M.mosRegion = (vgs, vds, Vth) => vgs <= Vth ? '截止' : vds < vgs - Vth ? '三极管区（线性区）' : '饱和区';
  M.mosAmp = ({ cfg, ID, Vov, lam = 0, RD, RS = 0, RL = Infinity, Rsig = 0, RG = Infinity }) => {
    const gm = 2 * ID / Vov, ro = lam > 0 ? 1 / (lam * ID) : Infinity;
    let Av, Rin, Rout;
    if (cfg === 'CS') {
      Av = RS === 0 ? -gm * M.par(RD, RL, ro) : -gm * M.par(RD, RL) / (1 + gm * RS);
      Rin = RG; Rout = RS === 0 ? M.par(RD, ro) : RD;
    } else if (cfg === 'CD') {
      const RSp = M.par(RS, RL, ro);
      Av = gm * RSp / (1 + gm * RSp); Rin = RG; Rout = M.par(RS, 1 / gm, ro);
    } else {
      Av = gm * M.par(RD, RL); Rin = M.par(RS, 1 / gm); Rout = RD;
    }
    const Avs = Rin === Infinity ? Av : Av * Rin / (Rin + Rsig);
    return { gm, ro, Av, Avs, Rin, Rout };
  };

  /* ---------- 频率响应 ---------- */
  // 复数
  const C = (re, im = 0) => ({ re, im });
  M.cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  M.cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  M.cabs = a => Math.hypot(a.re, a.im);
  M.carg = a => Math.atan2(a.im, a.re);
  // H(jω) = K · Π(1 + jf/fz) / Π(1 + jf/fp)，零点可为左半平面(lhp)或右半平面(rhp)
  M.bodeH = (f, K, poles, zeros) => {
    let h = C(K);
    for (const z of zeros) h = M.cmul(h, C(1, (z.rhp ? -1 : 1) * f / z.f));
    for (const p of poles) h = M.cdiv(h, C(1, f / p));
    return h;
  };
  M.db = x => 20 * Math.log10(x);
  // 渐近线：每个极点 -20 dB/dec，零点 +20 dB/dec
  M.bodeAsym = (f, K, poles, zeros) => {
    let d = M.db(Math.abs(K));
    for (const p of poles) if (f > p) d -= 20 * Math.log10(f / p);
    for (const z of zeros) if (f > z.f) d += 20 * Math.log10(f / z.f);
    return d;
  };
  // 共源/共射高频：Miller 近似与开路时间常数（OCTC）
  M.millerCS = ({ gm, Rsig, RLp, Cgs, Cgd, CL = 0 }) => {
    const Av = -gm * RLp;
    const Cin = Cgs + Cgd * (1 - Av);
    const fin = 1 / (2 * Math.PI * Rsig * Cin);
    const fout = 1 / (2 * Math.PI * RLp * (Cgd * (1 - 1 / Av) + CL));
    const tau = Rsig * Cgs + Cgd * (Rsig * (1 + gm * RLp) + RLp) + CL * RLp;
    // 精确两极点（忽略零点）：分母 1 + b1 s + b2 s^2
    const b1 = tau, b2 = Rsig * RLp * (Cgs * Cgd + Cgs * CL + Cgd * CL);
    const disc = b1 * b1 - 4 * b2;
    const p1 = disc > 0 ? (b1 - Math.sqrt(disc)) / (2 * b2) : NaN;
    return { Av, Cin, fin, fout, fOCTC: 1 / (2 * Math.PI * tau), fz: gm / (2 * Math.PI * Cgd), fp1exact: disc > 0 ? p1 / (2 * Math.PI) : NaN };
  };
  // 低频：各电容短路时间常数（SCTC）f_L ≈ Σ 1/(2πRC)
  M.sctc = list => list.reduce((s, x) => s + 1 / (2 * Math.PI * x.R * x.C), 0);

  /* ---------- 反馈 ---------- */
  M.fb = (A, beta) => ({ T: A * beta, Af: A / (1 + A * beta), D: 1 + A * beta });
  M.fbSens = (A, beta) => 1 / (1 + A * beta);      // (dAf/Af)/(dA/A)
  // 单极点 A(s)=A0/(1+s/ωp)：闭环 f_Hf = fp(1+A0β)
  M.fbBW = (A0, fp, beta) => ({ Af0: A0 / (1 + A0 * beta), fHf: fp * (1 + A0 * beta), GBW: A0 * fp });
  // 输入输出电阻：串联 ×D，并联 ÷D；电压采样输出 ÷D，电流采样 ×D
  M.fbImpedance = (topo, Ri, Ro, D) => {
    const series = topo === 'series-shunt' || topo === 'series-series';
    const vsamp = topo === 'series-shunt' || topo === 'shunt-shunt';
    return { Rif: series ? Ri * D : Ri / D, Rof: vsamp ? Ro / D : Ro * D };
  };
  // 环路增益 T(jf) = A0β / Π(1+jf/fpi)，求相位裕度、增益裕度
  M.loop = (A0beta, poles) => {
    const T = f => { let h = C(A0beta); for (const p of poles) h = M.cdiv(h, C(1, f / p)); return h; };
    const ph = f => poles.reduce((s, p) => s - Math.atan(f / p), 0) * 180 / Math.PI;
    let lo = 1e-3, hi = 1e12, fu = NaN, f180 = NaN;
    if (A0beta > 1) { for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); if (M.cabs(T(m)) > 1) lo = m; else hi = m; } fu = Math.sqrt(lo * hi); }
    if (poles.length >= 3) { lo = 1e-3; hi = 1e12; for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); if (ph(m) > -180) lo = m; else hi = m; } f180 = Math.sqrt(lo * hi); }
    const PM = isNaN(fu) ? Infinity : 180 + ph(fu);
    const GM = isNaN(f180) ? Infinity : -M.db(M.cabs(T(f180)));
    return { T, ph, fu, f180, PM, GM };
  };

  /* ---------- 功放 ---------- */
  // 乙类互补推挽（双电源 ±VCC），输出幅值 Vom
  M.classB = (VCC, RL, Vom) => {
    const Po = Vom * Vom / (2 * RL), PV = 2 * VCC * Vom / (Math.PI * RL), PT = PV - Po;
    return { Po, PV, PT, PT1: PT / 2, eta: PV > 0 ? Po / PV : 0, PoMax: VCC * VCC / (2 * RL), PTmax: 2 * VCC * VCC / (Math.PI * Math.PI * RL), VomAtPTmax: 2 * VCC / Math.PI };
  };
  // 甲类（射极跟随器，恒流源偏置 I = VCC/RL，双电源）
  M.classA = (VCC, RL, Vom) => {
    const I = VCC / RL, PV = 2 * VCC * I, Po = Vom * Vom / (2 * RL);
    return { Po, PV, PT: PV - Po, eta: Po / PV, I };
  };
  // 交越失真：输出 = sign(v)·max(|v| - Von + Vbias, 0)，Vbias 为每管预偏置（甲乙类）
  M.pushPull = (vin, Von, Vbias) => {
    const dead = Math.max(0, Von - Vbias);
    if (vin > dead) return vin - dead;
    if (vin < -dead) return vin + dead;
    return 0;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.M = M;
})(typeof window !== 'undefined' ? window : this);
