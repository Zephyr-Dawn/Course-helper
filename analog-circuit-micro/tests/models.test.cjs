// node tests/models.test.cjs — numeric checks of src/models.js against hand results and reviewed exercises
const M = require('../src/models.js');
let fail = 0;
const near = (name, got, want, tol = 0.01) => {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  if (!ok) fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + `: ${got} vs ${want}`);
};

// 热电压与二极管
near('VT(300K) ≈ 25.85 mV', M.VT(300), 0.02585, 0.002);
near('decade voltage n=1 ≈ 59.5 mV', M.VT(300) * Math.LN10, 0.0595, 0.01);
const dl = M.diodeLoad(5, 1000, 1e-14, 1, 0.02585);
near('loadline KVL holds', dl.I * 1000 + dl.V, 5, 1e-6);
near('loadline diode eq holds', M.diodeI(dl.V, 1e-14, 1, 0.02585), dl.I, 1e-4);
// 齐纳
const z = M.zener(15, 300, 1000, 6.8, 5);
near('zener KCL', z.Is, z.Iz + z.IL, 1e-9);
// 整流：桥式无电容平均值 ≈ 2(Vp-2Von)/π
const rb = M.rectifier({ type: 'bridge', Vp: 12, f: 50, RL: 1000, C: 0, Von: 0.7, N: 6000 });
// 精确平均：(2/π)[Vp cosθ0 − Vd(π/2 − θ0)]，θ0 = asin(Vd/Vp)，Vd = 2Von
const th0 = Math.asin(1.4 / 12);
near('bridge avg (C=0) exact', rb.vavg, (2 / Math.PI) * (12 * Math.cos(th0) - 1.4 * (Math.PI / 2 - th0)), 0.005);
const rc = M.rectifier({ type: 'half', Vp: 12, f: 50, RL: 1000, C: 1000e-6, Von: 0.7, N: 6000 });
near('half-wave ripple ≈ Vp/(fRC)', rc.ripple, (12 - 0.7) / (50 * 1000 * 1000e-6), 0.1);

// BJT 分压偏置：EC2024 CH07-KP3-10 戴维南精确解 IC ≈ 0.82 mA, VCE ≈ 7.0 V
const q = M.bjtDivider({ VCC: 12, R1: 120e3, R2: 39e3, RC: 3.9e3, RE: 2.1e3, beta: 50 });
near('CH07-KP3-10 IC', q.IC, 0.821e-3, 0.01);
near('CH07-KP3-10 VCE', q.VCE, 7.04, 0.01);
// 饱和判断
const s = M.bjtDivider({ VCC: 12, R1: 10e3, R2: 10e3, RC: 10e3, RE: 100, beta: 100 });
console.log((s.region === '饱和' ? 'PASS' : 'FAIL') + ' saturation detected'); if (s.region !== '饱和') fail++;
// CE: Av = -gm RC||RL
const ce = M.bjtAmp({ cfg: 'CE', IC: 1e-3, beta: 100, VT: 0.025, RC: 5e3, RL: 5e3 });
near('CE gain', ce.Av, -0.04 * 2500);
const cc = M.bjtAmp({ cfg: 'CC', IC: 1e-3, beta: 100, VT: 0.025, RC: 0, RE: 1e3, RL: Infinity });
near('CC gain ≈ 0.976', cc.Av, 101e3 / (2500 + 101e3), 1e-6);

// MOSFET
near('mos sat current', M.mosId(1.5, 2, 2e-3, 0.7, 0), 0.5 * 2e-3 * 0.64);
near('mos continuity at edge', M.mosId(1.5, 0.8 - 1e-9, 2e-3, 0.7, 0), M.mosId(1.5, 0.8, 2e-3, 0.7, 0), 1e-6);
const cs = M.mosAmp({ cfg: 'CS', ID: 0.5e-3, Vov: 0.25, RD: 10e3, RL: 10e3 });
near('CS gain = -gm RD||RL', cs.Av, -4e-3 * 5e3);

// 频响
near('single pole -3dB', M.db(M.cabs(M.bodeH(1000, 1, [1000], []))), -3.0103, 0.001);
const mil = M.millerCS({ gm: 4e-3, Rsig: 10e3, RLp: 5e3, Cgs: 20e-12, Cgd: 5e-12 });
near('Miller Cin = Cgs + Cgd(1+gmRL)', mil.Cin, 20e-12 + 5e-12 * 21, 1e-9);
console.log((mil.fOCTC < mil.fin ? 'PASS' : 'FAIL') + ' OCTC more conservative than Miller input pole'); if (!(mil.fOCTC < mil.fin)) fail++;

// 反馈
near('Af', M.fb(1e4, 0.01).Af, 1e4 / 101);
near('bandwidth x(1+A0β)', M.fbBW(1e4, 10, 0.01).fHf, 10 * 101);
const imp = M.fbImpedance('series-shunt', 10e3, 2e3, 101);
near('series input x D', imp.Rif, 1.01e6); near('voltage sampling output / D', imp.Rof, 2e3 / 101);
// 三极点：A0=1e5, F → 讲义 p41：极点 1e5/1e6/1e7 Hz，20lg(1/F)=85 dB 时稳定
const lp = M.loop(1e5 / Math.pow(10, 85 / 20), [1e5, 1e6, 1e7]);
near('85 dB case PM ≈ 72° (讲义 p41)', lp.PM, 72.4, 0.01);
// 临界：|A(f180)| ≈ 58.3 dB（反馈核对报告的精确值）
const crit = M.loop(1e5, [1e5, 1e6, 1e7]);
near('|A(f180)| dB', M.db(M.cabs(crit.T(crit.f180))), 58.3, 0.005);

// 功放
const b = M.classB(12, 8, 12);
near('class B max efficiency π/4', b.eta, Math.PI / 4, 1e-9);
near('class B PT1max = VCC²/(π²RL)', b.PTmax / 2, 144 / (Math.PI ** 2 * 8), 1e-9);
// CH12-KP2-04 核对结论：VCC²/(π²RL) ≈ 6.485 W 时 VCC²/RL = 64 → 例 VCC=16, RL=4
near('CH12-KP2-04 6.485 W', M.classB(16, 4, 16).PTmax / 2, 6.485, 0.001);
near('class A max efficiency 25%', M.classA(12, 8, 12).eta, 0.25, 1e-9);
near('push-pull dead zone', M.pushPull(0.5, 0.6, 0), 0);

console.log(fail ? `${fail} FAILED` : 'ALL PASS');
process.exit(fail ? 1 : 0);
