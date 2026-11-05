'use strict';

const assert = require('assert');
const M = require('../src/models.js');

function near(actual, expected, relTol = 1e-4, msg = '') {
  const scale = Math.max(Math.abs(expected), 1e-18);
  const diff = Math.abs(actual - expected);
  assert.ok(diff <= relTol * scale, `${msg} expected ${expected}, got ${actual} (diff=${diff})`);
}

// 1. Dipole far-field relation E_axis_far == 2 * E_perp_far
{
  const res = M.calcDipoleField({ q: 2e-9, l: 0.01, r: 0.5 });
  near(res.E_axis_far, 2 * res.E_perp_far, 1e-9, 'Dipole axial far field = 2 * perp far field');
  assert.ok(res.relErrAxis < 0.001, 'At r = 50 l, far-field approximation error < 0.1%');
}

// 2. Charged ring axial field peaks at x = R / sqrt(2) and vanishes at x = 0
{
  const R = 0.06;
  const at0 = M.calcRingDiskSphere({ mode: 'ring', Q: 1e-8, R, x: 0 });
  assert.strictEqual(at0.E, 0);
  const atPeak = M.calcRingDiskSphere({ mode: 'ring', Q: 1e-8, R, x: R / Math.sqrt(2) });
  const left = M.calcRingDiskSphere({ mode: 'ring', Q: 1e-8, R, x: R / Math.sqrt(2) - 0.005 });
  const right = M.calcRingDiskSphere({ mode: 'ring', Q: 1e-8, R, x: R / Math.sqrt(2) + 0.005 });
  assert.ok(atPeak.E > left.E && atPeak.E > right.E, 'Ring axial field maximum at R/sqrt(2)');
}

// 3. Conductor plates (例10.4): charge conservation & grounding
{
  const iso = M.calcConductorPlates({ QA: 3e-8, QB: 1e-8, S: 0.01, d: 0.005, condition: 'isolated' });
  near((iso.sigma1 + iso.sigma2) * 0.01, 3e-8, 1e-9, 'Plate A total charge');
  near((iso.sigma3 + iso.sigma4) * 0.01, 1e-8, 1e-9, 'Plate B total charge');
  const gnd = M.calcConductorPlates({ QA: 3e-8, QB: 1e-8, S: 0.01, d: 0.005, condition: 'groundB' });
  assert.strictEqual(gnd.sigma1, 0);
  assert.strictEqual(gnd.sigma4, 0);
  near(gnd.sigma2 + gnd.sigma3, 0, 1e-12, 'Facing surfaces equal and opposite when B grounded');
}

// 4. Dielectric half-filled capacitor (例10.9): parallel vs series
{
  const par = M.calcDielectricCap({ geom: 'parallel', source: 'constQ', er: 3, frac: 0.5, S: 0.02, d: 0.002, U0: 100 });
  near(par.E1, par.E2, 1e-9, 'Parallel dielectric enforces E1 = E2');
  near(par.D1 / par.D2, 3, 1e-9, 'Parallel dielectric D1 / D2 = er');
  const ser = M.calcDielectricCap({ geom: 'series', source: 'constQ', er: 3, frac: 0.5, S: 0.02, d: 0.002, U0: 100 });
  near(ser.D1, ser.D2, 1e-9, 'Series dielectric enforces D1 = D2');
  near(ser.E2 / ser.E1, 3, 1e-9, 'Series dielectric E2 / E1 = er');
}

// 5. Unbalanced Wheatstone bridge (例11.3 on PDF p261-262: U=13V, R1=1, R2=1, R3=1, R4=2, R5=1 -> Itotal=11A, Req=13/11 Ohm)
{
  const br = M.calcBridgeCircuit({ U: 13, R1: 1, R2: 1, R3: 1, R4: 2, R5: 1 });
  near(br.Itotal, 11, 1e-9, '例11.3 total current = 11 A');
  near(br.Req, 13 / 11, 1e-9, '例11.3 equivalent resistance = 13/11 Ohm');
  near(br.I1, 6, 1e-9, '例11.3 I1 = 6 A');
  near(br.I2, 5, 1e-9, '例11.3 I2 = 5 A');
  near(br.I5, -1, 1e-9, '例11.3 bridge branch current I5 = -1 A');
}

// 6. RC transient at t = tau
{
  const rc = M.calcRCTransient({ E: 10, R: 1000, C: 1e-6, t: 0.001, mode: 'charge' });
  near(rc.uC, 10 * (1 - Math.exp(-1)), 1e-9, 'RC charge at t=tau');
}

// 7. Biot-Savart & 8. Ampere + 9. Magnetic Media (例13.1: n=1000, I=2, ur=250) + 11. Vortex/Motional + 12. Mutual Inductance (例14.12)
{
  const med = M.calcMagneticMedia({ n: 1000, I: 2, ur: 250 });
  near(med.H, 2000, 1e-9);
  near(med.M, 4.98e5, 1e-6, '例13.1 M = 4.98e5 A/m');
  near(med.B, 0.6283185, 1e-5, '例13.1 B = 0.628 T');

  const mv = M.calcMotionalVortex({ R: 0.1, dBdt: 0.5, B: 0.4, v: 1.5, r: 0.1 });
  near(mv.Ei_max, 0.5 * 0.1 * 0.5, 1e-9, 'Max vortex E at r=R');

  const rl = M.calcRLMutual({ R1: 0.05, R2: 0.03, N1: 400, N2: 300, l: 0.5 });
  near(rl.M, (rl.R2 / rl.R1) * Math.sqrt(rl.L1 * rl.L2), 1e-9, '例14.12 M = (R2/R1)*sqrt(L1*L2)');
  assert.ok(rl.M < rl.M_wrong, 'True M uses inner radius R2, smaller than wrong formula');
}

console.log('ALL 12 PHYSICS MODELS PASSED UNIT TESTS.');
