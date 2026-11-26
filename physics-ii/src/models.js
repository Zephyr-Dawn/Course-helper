/* eslint-disable no-var */
/**
 * Pure physics simulation models for 大学物理甲-II (Chapters 9–14).
 * Works in both browser (window.PhysicsModels) and Node.js (module.exports).
 * All internal calculations use SI units.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PhysicsModels = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EPS0 = 8.8541878128e-12; // F/m
  var MU0 = 4 * Math.PI * 1e-7; // H/m
  var K_E = 1 / (4 * Math.PI * EPS0); // ~8.98755e9 N*m^2/C^2
  var Q_E = 1.602176634e-19; // C

  /**
   * 1. Ch09 Lab 1: Electric dipole & two-point-charge field/potential along axis and perpendicular bisector.
   * q in C (default > 0), l in m (separation between -q at -l/2 and +q at +l/2), r in m (r > l/2).
   */
  function calcDipoleField(params) {
    var q = Number(params.q || 1e-9);
    var l = Number(params.l || 0.02);
    var r = Number(params.r || 0.1);
    var p = q * l;
    var half = l / 2;
    var rSafe = Math.max(r, half * 1.08);
    // Exact axial field at x = +rSafe (charges at -l/2 and +l/2)
    var E_axis_exact = K_E * q * (1 / Math.pow(rSafe - half, 2) - 1 / Math.pow(rSafe + half, 2));
    var E_axis_far = (1 / (4 * Math.PI * EPS0)) * (2 * p / Math.pow(rSafe, 3));
    var U_axis_exact = K_E * q * (1 / (rSafe - half) - 1 / (rSafe + half));
    var U_axis_far = (1 / (4 * Math.PI * EPS0)) * (p / Math.pow(rSafe, 2));
    // Exact perpendicular bisector field magnitude at y = rSafe (directed along -x)
    var distSq = rSafe * rSafe + half * half;
    var E_perp_exact = (1 / (4 * Math.PI * EPS0)) * (p / Math.pow(distSq, 1.5));
    var E_perp_far = (1 / (4 * Math.PI * EPS0)) * (p / Math.pow(rSafe, 3));
    var relErrAxis = Math.abs(E_axis_exact - E_axis_far) / Math.max(Math.abs(E_axis_exact), 1e-30);
    return {
      p: p,
      ratio: rSafe / l,
      E_axis_exact: E_axis_exact,
      E_axis_far: E_axis_far,
      U_axis_exact: U_axis_exact,
      U_axis_far: U_axis_far,
      E_perp_exact: E_perp_exact,
      E_perp_far: E_perp_far,
      U_perp: 0,
      relErrAxis: relErrAxis
    };
  }

  /**
   * 2. Ch09 Lab 2: Charged ring/disk on-axis & spherical shell/solid sphere Gauss law radial distribution.
   */
  function calcRingDiskSphere(params) {
    var mode = params.mode || 'ring'; // 'ring' | 'disk' | 'shell' | 'sphere'
    var Q = Number(params.Q || 1e-8); // C
    var R = Number(params.R || 0.05); // m
    var x = Number(params.x !== undefined ? params.x : 0.035); // m (axial distance or radial distance >= 0)
    var r = Math.max(0, x);
    var E = 0;
    var U = 0;
    var xPeak = R / Math.sqrt(2);
    if (mode === 'ring') {
      var denom = Math.pow(R * R + r * r, 1.5);
      E = K_E * Q * r / denom;
      U = K_E * Q / Math.sqrt(R * R + r * r);
    } else if (mode === 'disk') {
      var sigma = Q / (Math.PI * R * R);
      E = (sigma / (2 * EPS0)) * (1 - r / Math.sqrt(R * R + r * r));
      U = (sigma / (2 * EPS0)) * (Math.sqrt(R * R + r * r) - r);
    } else if (mode === 'shell') {
      E = r < R ? 0 : K_E * Q / (r * r);
      U = r <= R ? K_E * Q / R : K_E * Q / r;
    } else {
      // uniformly charged solid sphere
      E = r <= R ? K_E * Q * r / Math.pow(R, 3) : K_E * Q / (r * r);
      U = r <= R ? (K_E * Q / (2 * R)) * (3 - (r * r) / (R * R)) : K_E * Q / r;
    }
    return { mode: mode, Q: Q, R: R, r: r, E: E, U: U, xPeak: xPeak };
  }

  /**
   * 3. Ch10 Lab 3: Parallel conducting plates A & B charge redistribution (例10.4).
   * S in m^2, d in m, QA and QB in C.
   * condition: 'isolated' | 'groundB' | 'shortAB'
   */
  function calcConductorPlates(params) {
    var QA = Number(params.QA !== undefined ? params.QA : 3e-8);
    var QB = Number(params.QB !== undefined ? params.QB : 1e-8);
    var S = Number(params.S || 0.01);
    var d = Number(params.d || 0.005);
    var cond = params.condition || 'isolated';
    var qA = QA;
    var qB = QB;
    if (cond === 'groundB') {
      // Plate B grounded: outer surfaces have zero charge (sigma1 = sigma4 = 0), qB = -qA
      qB = -qA;
    } else if (cond === 'shortAB') {
      // A and B connected by wire: inner facing surfaces have zero charge, total charge shared equally
      qA = (QA + QB) / 2;
      qB = (QA + QB) / 2;
    }
    var sigma1 = (qA + qB) / (2 * S);
    var sigma2 = (qA - qB) / (2 * S);
    var sigma3 = -sigma2;
    var sigma4 = sigma1;
    if (cond === 'groundB') {
      sigma1 = 0;
      sigma2 = qA / S;
      sigma3 = -qA / S;
      sigma4 = 0;
    }
    var E_left = -sigma1 / EPS0; // directed left if sigma1 > 0
    var E_mid = sigma2 / EPS0;   // directed from A to B
    var E_right = sigma4 / EPS0; // directed right
    var U_AB = E_mid * d;
    return {
      qA: qA,
      qB: qB,
      sigma1: sigma1,
      sigma2: sigma2,
      sigma3: sigma3,
      sigma4: sigma4,
      E_left: E_left,
      E_mid: E_mid,
      E_right: E_right,
      U_AB: U_AB
    };
  }

  /**
   * 4. Ch10 Lab 4: Parallel-plate capacitor with dielectric (series stratification vs parallel half-filling,
   * constant Q vs constant U, corresponding to 例10.7, 例10.8, 例10.9).
   */
  function calcDielectricCap(params) {
    var geom = params.geom || 'parallel'; // 'parallel' (side-by-side 例10.9) | 'series' (layered)
    var source = params.source || 'constQ'; // 'constQ' | 'constU'
    var er = Math.max(1, Number(params.er || 4));
    var frac = Math.min(0.95, Math.max(0.05, Number(params.frac || 0.5))); // area or thickness fraction of dielectric
    var S = Number(params.S || 0.02); // m^2
    var d = Number(params.d || 0.002); // m
    var U0 = Number(params.U0 || 100); // V
    var C0 = EPS0 * S / d;
    var Q0 = C0 * U0;
    var C = C0;
    if (geom === 'parallel') {
      C = C0 * (er * frac + (1 - frac));
    } else {
      C = C0 / (frac / er + (1 - frac));
    }
    var Q = source === 'constQ' ? Q0 : C * U0;
    var U = source === 'constU' ? U0 : Q / C;
    var D1, D2, E1, E2, P1, sigma_free1, sigma_free2, sigma_bound1;
    if (geom === 'parallel') {
      // Equipotential plates enforce E1 = E2 = U / d
      E1 = U / d;
      E2 = U / d;
      D1 = EPS0 * er * E1;
      D2 = EPS0 * E2;
      sigma_free1 = D1;
      sigma_free2 = D2;
      P1 = EPS0 * (er - 1) * E1;
      sigma_bound1 = P1;
    } else {
      // Series layers enforce D1 = D2 = Q / S
      D1 = Q / S;
      D2 = Q / S;
      E1 = D1 / (EPS0 * er);
      E2 = D2 / EPS0;
      sigma_free1 = D1;
      sigma_free2 = D2;
      P1 = EPS0 * (er - 1) * E1;
      sigma_bound1 = P1;
    }
    var We = 0.5 * Q * U;
    var We0 = 0.5 * Q0 * U0;
    return {
      C0: C0, C: C, Q: Q, U: U,
      D1: D1, D2: D2, E1: E1, E2: E2,
      P1: P1, sigma_free1: sigma_free1, sigma_free2: sigma_free2, sigma_bound1: sigma_bound1,
      We: We, We0: We0
    };
  }

  /**
   * 5. Ch11 Lab 5: Unbalanced Wheatstone bridge (例11.3) & Kirchhoff current/voltage solver.
   * Bridge resistors: R1 (top-left), R2 (bottom-left), R3 (top-right), R4 (bottom-right), R5 (middle bridge).
   */
  function calcBridgeCircuit(params) {
    var U = Number(params.U || 13);
    var R1 = Math.max(0.05, Number(params.R1 || 1));
    var R2 = Math.max(0.05, Number(params.R2 || 1));
    var R3 = Math.max(0.05, Number(params.R3 || 1));
    var R4 = Math.max(0.05, Number(params.R4 || 2));
    var R5 = Math.max(0.05, Number(params.R5 || 1));
    // Delta-Y or node voltage at node B (between R1, R3, R5) and node C (between R2, R4, R5)
    // Let right terminal D be 0 V, left terminal A be U V.
    // KCL at node B: (VB - U)/R1 + VB/R3 + (VB - VC)/R5 = 0
    // KCL at node C: (VC - U)/R2 + VC/R4 + (VC - VB)/R5 = 0
    var g11 = 1 / R1 + 1 / R3 + 1 / R5;
    var g12 = -1 / R5;
    var g22 = 1 / R2 + 1 / R4 + 1 / R5;
    var b1 = U / R1;
    var b2 = U / R2;
    var det = g11 * g22 - g12 * g12;
    var VB = (b1 * g22 - b2 * g12) / det;
    var VC = (g11 * b2 - g12 * b1) / det;
    var I1 = (U - VB) / R1;
    var I2 = (U - VC) / R2;
    var I3 = VB / R3;
    var I4 = VC / R4;
    var I5 = (VB - VC) / R5; // from B to C
    var Itotal = I1 + I2;
    var Req = U / Itotal;
    var balanceRatio = (R1 * R4) / (R2 * R3);
    return {
      U: U, VB: VB, VC: VC, VBC: VB - VC,
      I1: I1, I2: I2, I3: I3, I4: I4, I5: I5,
      Itotal: Itotal, Req: Req, balanceRatio: balanceRatio
    };
  }

  /**
   * 6. Ch11 Lab 6: RC charging & discharging transient response.
   */
  function calcRCTransient(params) {
    var E = Number(params.E || 10); // V
    var R = Math.max(1, Number(params.R || 2000)); // Ohm
    var C = Math.max(1e-9, Number(params.C || 1e-6)); // F
    var t = Math.max(0, Number(params.t !== undefined ? params.t : 0.002)); // s
    var mode = params.mode || 'charge'; // 'charge' | 'discharge'
    var tau = R * C;
    var expFactor = Math.exp(-t / tau);
    var uC = mode === 'charge' ? E * (1 - expFactor) : E * expFactor;
    var i = mode === 'charge' ? (E / R) * expFactor : -(E / R) * expFactor;
    var q = C * uC;
    var WC = 0.5 * C * uC * uC;
    var Wmax = 0.5 * C * E * E;
    return { E: E, R: R, C: C, tau: tau, t: t, uC: uC, i: i, q: q, WC: WC, Wmax: Wmax };
  }

  /**
   * 7. Ch12 Lab 7: Biot-Savart axial magnetic field B(x) for single loop, Helmholtz/double coil, and finite solenoid.
   */
  function calcBiotSavart(params) {
    var mode = params.mode || 'loop'; // 'loop' | 'helmholtz' | 'solenoid'
    var I = Number(params.I || 2.0); // A
    var R = Math.max(0.005, Number(params.R || 0.05)); // m
    var N = Math.max(1, Number(params.N || 100)); // turns
    var L = Math.max(0.01, Number(params.L || 0.05)); // m (coil separation d or solenoid length L)
    var x = Number(params.x !== undefined ? params.x : 0); // m from center
    var B = 0;
    var B0 = 0;
    if (mode === 'loop') {
      B = (MU0 * N * I * R * R) / (2 * Math.pow(R * R + x * x, 1.5));
      B0 = (MU0 * N * I) / (2 * R);
    } else if (mode === 'helmholtz') {
      var x1 = x + L / 2;
      var x2 = x - L / 2;
      var B1 = (MU0 * N * I * R * R) / (2 * Math.pow(R * R + x1 * x1, 1.5));
      var B2 = (MU0 * N * I * R * R) / (2 * Math.pow(R * R + x2 * x2, 1.5));
      B = B1 + B2;
      B0 = (MU0 * N * I * R * R) / Math.pow(R * R + (L * L) / 4, 1.5);
    } else {
      var n = N / L;
      var z1 = x + L / 2;
      var z2 = x - L / 2;
      var cos1 = z1 / Math.sqrt(R * R + z1 * z1);
      var cos2 = z2 / Math.sqrt(R * R + z2 * z2);
      B = 0.5 * MU0 * n * I * (cos1 - cos2);
      var half = L / 2;
      B0 = MU0 * n * I * (half / Math.sqrt(R * R + half * half));
    }
    return { mode: mode, I: I, R: R, N: N, L: L, x: x, B: B, B0: B0 };
  }

  /**
   * 8. Ch12 Lab 8: Ampere circuital law radial profile (cylinder / coaxial / slab) & Lorentz cyclotron motion.
   */
  function calcAmpereCyclotron(params) {
    var mode = params.mode || 'cylinder'; // 'cylinder' | 'slab' | 'cyclotron'
    var I = Number(params.I || 10); // A
    var R = Math.max(0.005, Number(params.R || 0.04)); // m (radius or half-thickness d/2)
    var r = Math.max(0, Number(params.r !== undefined ? params.r : 0.02)); // m
    var Bmag = Number(params.B || 0.02); // T for cyclotron
    var v0 = Number(params.v0 || 2e6); // m/s
    var pitchDeg = Number(params.pitchDeg !== undefined ? params.pitchDeg : 60);
    if (mode === 'cylinder') {
      var Bcyl = r <= R ? (MU0 * I * r) / (2 * Math.PI * R * R) : (MU0 * I) / (2 * Math.PI * r);
      var Bpeak = (MU0 * I) / (2 * Math.PI * R);
      return { mode: mode, r: r, R: R, B: Bcyl, Bpeak: Bpeak };
    } else if (mode === 'slab') {
      // Uniform current density j across slab of half-thickness R (total current per unit width K = j * 2R)
      var j = I / (2 * R); // A/m^2 (per 1m depth)
      var Bslab = r <= R ? MU0 * j * r : MU0 * j * R;
      return { mode: mode, r: r, R: R, B: Bslab, Bpeak: MU0 * j * R };
    } else {
      var m_e = 9.1093837e-31;
      var theta = (pitchDeg * Math.PI) / 180;
      var vPerp = v0 * Math.sin(theta);
      var vPara = v0 * Math.cos(theta);
      var R_cyc = (m_e * Math.max(vPerp, 1)) / (Q_E * Bmag);
      var T_cyc = (2 * Math.PI * m_e) / (Q_E * Bmag);
      var h_pitch = vPara * T_cyc;
      return { mode: mode, B: Bmag, R_cyc: R_cyc, T_cyc: T_cyc, h_pitch: h_pitch, vPerp: vPerp, vPara: vPara };
    }
  }

  /**
   * 9. Ch13 Lab 9: Magnetic media (solenoid / coaxial cable with relative permeability ur, 例13.1 & 例13.2).
   */
  function calcMagneticMedia(params) {
    var n = Number(params.n || 1000); // turns/m
    var I = Number(params.I || 2.0); // A
    var ur = Number(params.ur || 250); // relative permeability
    var chi_m = ur - 1;
    var H = n * I; // A/m
    var B0 = MU0 * H; // T
    var M = chi_m * H; // A/m
    var Bprime = MU0 * M; // T
    var B = MU0 * ur * H; // T
    var jm = M; // surface bound current linear density A/m
    return { n: n, I: I, ur: ur, chi_m: chi_m, H: H, B0: B0, M: M, Bprime: Bprime, B: B, jm: jm };
  }

  /**
   * 10. Ch13 Lab 10: Ferromagnetic magnetization & hysteresis loop B(H) model (例13.3).
   */
  function calcFerroHysteresis(params) {
    var Hs = Math.max(50, Number(params.Hs || 800)); // A/m saturation drive
    var Hc = Math.max(10, Number(params.Hc || 160)); // A/m coercivity
    var Bs = Math.max(0.2, Number(params.Bs || 1.4)); // T saturation B
    var H = Number(params.H !== undefined ? params.H : 200); // current operating H
    var H0 = Math.max(40, Hc * 1.2);
    var B_upper = Bs * Math.tanh((H + Hc) / H0);
    var B_lower = Bs * Math.tanh((H - Hc) / H0);
    var B_init = Bs * Math.tanh(H / H0);
    var Br = Bs * Math.tanh(Hc / H0);
    var ur_eff = Math.abs(H) > 1 ? Math.abs(B_init) / (MU0 * Math.abs(H)) : Bs / (MU0 * H0);
    var loopArea = 4 * Hc * Br * 0.82; // J/m^3 per cycle approx
    return {
      H: H, Hs: Hs, Hc: Hc, Bs: Bs, Br: Br,
      B_upper: B_upper, B_lower: B_lower, B_init: B_init,
      ur_eff: ur_eff, loopArea: loopArea
    };
  }

  /**
   * 11. Ch14 Lab 11: Cylindrical time-varying magnetic field vortex electric field E_i(r) &
   * chord / moving extended rod EMF (例14.6, 例14.7, 例14.9).
   */
  function calcMotionalVortex(params) {
    var R = Math.max(0.01, Number(params.R || 0.1)); // m radius of B field region
    var dBdt = Number(params.dBdt !== undefined ? params.dBdt : 0.5); // T/s
    var B = Number(params.B !== undefined ? params.B : 0.4); // T instantaneous B
    var v = Number(params.v !== undefined ? params.v : 1.5); // m/s rod velocity
    var r = Math.max(0, Number(params.r !== undefined ? params.r : 0.06)); // m probe radius
    var Ei = r <= R ? 0.5 * r * Math.abs(dBdt) : (0.5 * R * R * Math.abs(dBdt)) / r;
    var Ei_max = 0.5 * R * Math.abs(dBdt);
    // For 例14.9: rod ac of length 2R at distance d = R*sqrt(3)/2 from center O (chord ab has length R, central angle 60 deg)
    var eps_vortex_ab = (Math.sqrt(3) / 4) * R * R * dBdt; // EMF along chord ab inside circle
    var eps_vortex_ac = 0.25 * (Math.sqrt(3) + Math.PI / 3) * R * R * dBdt; // EMF along full rod ac of length 2R
    var eps_motional_ab = B * R * v; // motional EMF comes only from segment ab inside magnetic field!
    var eps_total_ac = eps_motional_ab - eps_vortex_ac;
    return {
      R: R, r: r, dBdt: dBdt, B: B, v: v,
      Ei: Ei, Ei_max: Ei_max,
      eps_vortex_ab: eps_vortex_ab,
      eps_vortex_ac: eps_vortex_ac,
      eps_motional_ab: eps_motional_ab,
      eps_total_ac: eps_total_ac
    };
  }

  /**
   * 12. Ch14 Lab 12: Coaxial solenoids mutual inductance M (例14.12) & RL transient / magnetic energy.
   */
  function calcRLMutual(params) {
    var R1 = Math.max(0.01, Number(params.R1 || 0.05)); // outer radius m
    var R2 = Math.min(R1, Math.max(0.005, Number(params.R2 || 0.03))); // inner radius m
    var N1 = Math.max(10, Number(params.N1 || 400));
    var N2 = Math.max(10, Number(params.N2 || 300));
    var l = Math.max(0.05, Number(params.l || 0.5)); // length m
    var R_res = Math.max(0.5, Number(params.R_res || 10)); // Ohm
    var I0 = Number(params.I0 || 2.0); // A steady current
    var t = Math.max(0, Number(params.t !== undefined ? params.t : 0.0005)); // s
    var L1 = (MU0 * N1 * N1 * Math.PI * R1 * R1) / l;
    var L2 = (MU0 * N2 * N2 * Math.PI * R2 * R2) / l;
    var M = (MU0 * N1 * N2 * Math.PI * R2 * R2) / l; // flux confined to inner area pi*R2^2
    var kCoupling = R2 / R1;
    var M_wrong = (R1 / R2) * Math.sqrt(L1 * L2); // classic trap on PDF p491
    var tau = L1 / R_res;
    var i_t = I0 * (1 - Math.exp(-t / tau));
    var Wm = 0.5 * L1 * i_t * i_t;
    return {
      R1: R1, R2: R2, N1: N1, N2: N2, l: l,
      L1: L1, L2: L2, M: M, M_wrong: M_wrong, kCoupling: kCoupling,
      tau: tau, i_t: i_t, Wm: Wm
    };
  }

  return {
    EPS0: EPS0,
    MU0: MU0,
    K_E: K_E,
    Q_E: Q_E,
    calcDipoleField: calcDipoleField,
    calcRingDiskSphere: calcRingDiskSphere,
    calcConductorPlates: calcConductorPlates,
    calcDielectricCap: calcDielectricCap,
    calcBridgeCircuit: calcBridgeCircuit,
    calcRCTransient: calcRCTransient,
    calcBiotSavart: calcBiotSavart,
    calcAmpereCyclotron: calcAmpereCyclotron,
    calcMagneticMedia: calcMagneticMedia,
    calcFerroHysteresis: calcFerroHysteresis,
    calcMotionalVortex: calcMotionalVortex,
    calcRLMutual: calcRLMutual
  };
});
