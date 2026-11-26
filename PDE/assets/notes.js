"use strict";

const byId = id => document.getElementById(id);
const colors = {
  axis: "#627367",
  grid: "#dce1d6",
  green: "#194833",
  sage: "#668276",
  warm: "#936630",
  blue: "#4c628b"
};

function drawChart(canvas, { xRange, yRange, xTicks, yTicks, curves, hero = false,
  yLabel = "u(x,t)", paths = [], dots = [] }) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  const width = rect.width;
  const height = rect.height;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const left = hero ? 28 : 38;
  const right = width - 20;
  const top = 20;
  const bottom = height - 26;
  const scaleX = x => left + (right - left) * (x - xRange[0]) / (xRange[1] - xRange[0]);
  const scaleY = y => bottom - (bottom - top) * (y - yRange[0]) / (yRange[1] - yRange[0]);
  const zeroY = scaleY(0);
  const zeroX = scaleX(0);
  const axisColor = hero ? colors.green : colors.axis;

  function line(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.font = "12px system-ui";
  ctx.fillStyle = axisColor;
  ctx.textAlign = "center";
  for (const [x, label] of xTicks) {
    const px = scaleX(x);
    line(px, top, px, bottom, colors.grid);
    if (label) ctx.fillText(label, px, bottom + 17);
  }
  ctx.textAlign = "right";
  for (const [y, label] of yTicks) {
    const py = scaleY(y);
    line(left, py, right, py, colors.grid);
    if (label) ctx.fillText(label, left - 7, py + 4);
  }
  line(zeroX, top - 3, zeroX, bottom + 2, axisColor);
  line(left - 6, zeroY, right + 4, zeroY, axisColor);
  ctx.textAlign = "left";
  ctx.font = "italic 15px Georgia, serif";
  if (hero) {
    line(zeroX, top - 3, zeroX - 4, top + 5, axisColor);
    line(zeroX, top - 3, zeroX + 4, top + 5, axisColor);
    line(right + 4, zeroY, right - 4, zeroY - 4, axisColor);
    line(right + 4, zeroY, right - 4, zeroY + 4, axisColor);
  }
  ctx.fillText(yLabel, zeroX + 6, top - 7);
  ctx.fillText("x", right + 8, zeroY + 5);

  const segments = Math.max(240, Math.round(width));
  ctx.save();
  ctx.beginPath();
  ctx.rect(left - 2, top - 1, right - left + 4, bottom - top + 2);
  ctx.clip();
  ctx.lineJoin = "round";
  for (const { points, fill, color, dashed = false, thickness = 1.6 } of paths) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(scaleX(x), scaleY(y));
      else ctx.lineTo(scaleX(x), scaleY(y));
    });
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.setLineDash(dashed ? [4, 4] : []);
      ctx.stroke();
    }
  }
  for (const { value, color, dashed = false, thickness = 2.3 } of curves) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.beginPath();
    for (let index = 0; index <= segments; index++) {
      const x = xRange[0] + (xRange[1] - xRange[0]) * index / segments;
      const px = scaleX(x);
      const py = scaleY(value(x));
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  for (const { x, y, color, label } of dots) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(scaleX(x), scaleY(y), 3.3, 0, 2 * Math.PI);
    ctx.fill();
    if (label) {
      ctx.font = "italic 13px Georgia, serif";
      ctx.fillText(label, scaleX(x) + 6, scaleY(y) - 5);
    }
  }
}

function renderHero() {
  drawChart(byId("hero-plot"), {
    hero: true,
    xRange: [0, 1],
    yRange: [-1.22, 1.22],
    xTicks: Array.from({ length: 13 }, (_, index) => [index / 12, ""]),
    yTicks: [-1, -.6, -.2, .2, .6, 1].map(value => [value, ""]),
    curves: [
      { value: x => .32 * Math.sin(7 * Math.PI * x), color: "#c6a354", thickness: 1.7 },
      { value: x => .56 * Math.sin(5 * Math.PI * x), color: "#8ca788", thickness: 1.9 },
      { value: x => Math.sin(4 * Math.PI * x) * (1 - .28 * x), color: colors.green, thickness: 2.6 }
    ]
  });
}

function renderWave() {
  const t = byId("wave-t").valueAsNumber;
  const pulse = x => Math.max(0, 1 - x * x) ** 3;
  const left = x => pulse(x + t) / 2;
  const right = x => pulse(x - t) / 2;
  byId("wave-t-value").value = t.toFixed(2);
  byId("wave-reading").value = "左行分量中心 x = " + (-t).toFixed(2).replace("-", "−") +
    "，右行分量中心 x = " + t.toFixed(2) + "。";
  drawChart(byId("wave-plot"), {
    xRange: [-3.3, 3.3],
    yRange: [-.12, 1.1],
    xTicks: [[-3, "−3"], [-2, "−2"], [-1, "−1"], [0, "0"], [1, "1"], [2, "2"], [3, "3"]],
    yTicks: [[0, "0"], [.5, "0.5"], [1, "1"]],
    curves: [
      { value: x => left(x) + right(x), color: colors.green, thickness: 2.8 },
      { value: left, color: colors.sage, dashed: true, thickness: 1.4 },
      { value: right, color: colors.warm, dashed: true, thickness: 1.4 }
    ]
  });
}

const intervalTicks = [[0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"]];

function renderMode() {
  const n = byId("mode-n").valueAsNumber;
  const t = byId("mode-t").valueAsNumber;
  const heat = byId("mode-kind").value === "heat";
  const factor = heat ? Math.exp(-n * n * t) : Math.cos(n * t);
  const initial = x => Math.sin(n * x);
  const readableFactor = factor !== 0 && Math.abs(factor) < .0001 ? factor.toExponential(2) : factor.toFixed(4);
  byId("mode-n-value").value = String(n);
  byId("mode-t-value").value = t.toFixed(2);
  byId("mode-reading").value = "λ = " + n * n + "，内部节点 " + (n - 1) + " 个。" +
    (heat ? " 衰减因子 exp(−n²t) = " : " 振荡因子 cos(nt) = ") + readableFactor + "。";
  drawChart(byId("mode-plot"), {
    xRange: [0, Math.PI],
    yRange: [-1.1, 1.1],
    xTicks: intervalTicks,
    yTicks: [[-1, "−1"], [0, "0"], [1, "1"]],
    curves: [
      { value: initial, color: colors.sage, dashed: true, thickness: 1.7 },
      { value: x => initial(x) * factor, color: colors.green }
    ]
  });
}

function renderFourier() {
  const limit = byId("fourier-n").valueAsNumber;
  const initial = x => x * (Math.PI - x);
  const terms = Array.from({ length: Math.ceil(limit / 2) }, (_, index) => {
    const n = 2 * index + 1;
    return { n, weight: 8 / (Math.PI * n ** 3) };
  });
  const partialSum = x => terms.reduce((sum, { n, weight }) => sum + weight * Math.sin(n * x), 0);
  const midpoint = Math.PI / 2;
  const midpointError = Math.abs(initial(midpoint) - partialSum(midpoint));
  byId("fourier-n-value").value = String(limit);
  byId("fourier-reading").value = "非零项 " + terms.length + " 个。中点 x = π/2 的绝对误差为 " +
    midpointError.toPrecision(3) + "。";
  drawChart(byId("fourier-plot"), {
    xRange: [0, Math.PI],
    yRange: [-.19, 2.8],
    xTicks: intervalTicks,
    yTicks: [[0, "0"], [1, "1"], [2, "2"]],
    curves: [
      { value: partialSum, color: colors.green, thickness: 2.8 },
      { value: initial, color: colors.sage, dashed: true, thickness: 1.6 }
    ]
  });
}

byId("wave-t")?.addEventListener("input", renderWave);
byId("fourier-n")?.addEventListener("input", renderFourier);

const charts = [[renderHero, "hero-plot"], [renderWave, "wave-plot"],
  [renderFourier, "fourier-plot"]];
for (const [render, id] of charts) {
  const plot = byId(id);
  if (!plot) continue;
  render();
  new ResizeObserver(render).observe(plot);
}

function setupStudyLab(render, plotIds, controls, timeId, playId) {
  const plots = plotIds.map(byId);
  if (!plots[0]) return;

  for (const id of controls) byId(id).addEventListener("input", render);
  const observer = new ResizeObserver(render);
  for (const plot of plots) observer.observe(plot);
  render();

  const slider = byId(timeId);
  const button = byId(playId);
  if (!button) return;
  const min = Number(slider.min);
  const max = Number(slider.max);
  let frame = 0;

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
    button.textContent = "播放";
  }

  button.addEventListener("click", () => {
    if (frame) {
      pause();
      return;
    }
    if (slider.valueAsNumber >= max) slider.value = String(min);
    const startValue = slider.valueAsNumber;
    const startTime = performance.now();

    function step(now) {
      const next = Math.min(max, startValue + (now - startTime) * (max - min) / 6500);
      const previous = slider.value;
      slider.value = String(next);
      if (slider.value !== previous) render();
      if (next < max) frame = requestAnimationFrame(step);
      else pause();
    }

    button.textContent = "暂停";
    render();
    frame = requestAnimationFrame(step);
  });

  slider.addEventListener("pointerdown", pause);
  slider.addEventListener("keydown", pause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
}

const twoDecimals = value => value.toFixed(2).replace("-", "−");
const threeDecimals = value => (Math.abs(value) < .0005 ? 0 : value).toFixed(3).replace("-", "−");
const dependencyTicks = [[-4, "−4"], [-2, "−2"], [0, "0"], [2, "2"], [4, "4"]];
const dependencyRange = [-4.6, 4.6];

function renderCharacteristics() {
  const x = byId("characteristic-x").valueAsNumber;
  const t = byId("characteristic-t").valueAsNumber;
  const tau = t * byId("characteristic-slice").valueAsNumber / 100;
  const left = x - t;
  const right = x + t;
  const sliceLeft = x - (t - tau);
  const sliceRight = x + (t - tau);
  const phi = Math.cos;
  const psi = s => (1 + Math.sin(s)) / 2;
  const displacement = (phi(left) + phi(right)) / 2;
  const area = (right - left + Math.cos(left) - Math.cos(right)) / 2;
  const velocity = area / 2;

  byId("characteristic-x-value").value = twoDecimals(x);
  byId("characteristic-t-value").value = twoDecimals(t);
  byId("characteristic-slice-value").value = twoDecimals(tau);
  byId("characteristic-interval").value =
    "依赖区间 [" + twoDecimals(left) + ", " + twoDecimals(right) + "]。初位移取 φ(L)、φ(R)，初速度在整段积分。";
  byId("characteristic-result").value =
    "自由解 u(P) ≈ " + threeDecimals(displacement + velocity) +
    "。初位移项 " + threeDecimals(displacement) + "，初速度项 " + threeDecimals(velocity) + "。";
  byId("characteristic-slice-reading").value =
    "源项切片 [" + twoDecimals(sliceLeft) + ", " + twoDecimals(sliceRight) +
    "]，宽 " + twoDecimals(sliceRight - sliceLeft) + "。";

  drawChart(byId("characteristic-plot"), {
    xRange: dependencyRange,
    yRange: [0, 2.8],
    xTicks: dependencyTicks,
    yTicks: [[0, "0"], [1, "1"], [2, "2"]],
    yLabel: "t",
    curves: [],
    paths: [
      { points: [[left, 0], [x, t], [right, 0]], color: colors.green, fill: "#e8eee3" },
      { points: [[sliceLeft, tau], [sliceRight, tau]], color: colors.warm, thickness: 2.5 }
    ],
    dots: t > .06 ? [
      { x: left, y: 0, color: colors.green, label: "L" },
      { x: right, y: 0, color: colors.green, label: "R" },
      { x, y: t, color: colors.green, label: "P" }
    ] : [{ x, y: t, color: colors.green, label: "P" }]
  });

  const velocityArea = [[left, 0]];
  for (let i = 0; i <= 72; i++) {
    const s = left + (right - left) * i / 72;
    velocityArea.push([s, psi(s)]);
  }
  velocityArea.push([right, 0]);

  drawChart(byId("wave-data-plot"), {
    xRange: dependencyRange,
    yRange: [-1.12, 1.15],
    xTicks: dependencyTicks,
    yTicks: [[-1, "−1"], [0, "0"], [1, "1"]],
    yLabel: "φ, ψ",
    paths: [
      { points: velocityArea, fill: "#dce3f0" },
      { points: [[left, -1.02], [left, 1.02]], color: colors.sage, dashed: true },
      { points: [[right, -1.02], [right, 1.02]], color: colors.sage, dashed: true }
    ],
    curves: [
      { value: phi, color: colors.green },
      { value: psi, color: colors.blue, dashed: true }
    ],
    dots: [
      { x: left, y: phi(left), color: colors.green, label: t > .06 ? "L" : "L=R" },
      { x: right, y: phi(right), color: colors.green, label: t > .06 ? "R" : "" }
    ]
  });
}

function renderReflection() {
  const t = byId("reflection-t").valueAsNumber;
  const fixed = byId("reflection-kind").value === "fixed";
  const sign = fixed ? -1 : 1;
  const center = 1.5;
  const radius = .55;
  const envelope = s => Math.max(0, 1 - (s / radius) ** 2);
  const pulse = s => envelope(s) ** 3;
  const derivative = s => -6 * s / radius ** 2 * envelope(s) ** 2;
  const original = x => (pulse(x + t - center) + pulse(x - t - center)) / 2;
  const image = x => sign * pulse(x - t + center) / 2;
  const total = x => original(x) + image(x);

  const phase = t < center - radius ? "入射脉冲尚未接触端点。" :
    t <= center + radius ? "入射脉冲与镜像波正在端点附近叠加。" :
      "反射脉冲已离开端点。";
  const boundarySlope = (derivative(t - center) + derivative(-t - center) +
    sign * derivative(-t + center)) / 2;
  const check = fixed ? "固定端反号反射。u(0,t) = " + threeDecimals(total(0)) :
    "自由端同号反射。uₓ(0,t) = " + threeDecimals(boundarySlope);

  byId("reflection-t-value").value = twoDecimals(t);
  byId("reflection-reading").value = phase + check + "。";
  drawChart(byId("reflection-plot"), {
    xRange: [0, 5.4],
    yRange: [-.65, 1.12],
    xTicks: [[0, "端点"], [1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]],
    yTicks: [[-.5, "−.5"], [0, "0"], [.5, ".5"], [1, "1"]],
    curves: [
      { value: total, color: colors.green, thickness: 3 },
      { value: original, color: colors.sage, dashed: true, thickness: 1.6 },
      { value: image, color: colors.warm, dashed: true, thickness: 1.6 }
    ],
    dots: [{ x: 0, y: total(0), color: colors.green }]
  });
}

function renderMixedModes() {
  const t = byId("mixed-mode-t").valueAsNumber;
  const decay = Math.exp(-t);
  const weights = [(1 + t) * decay, (2 / 3) * (decay - Math.exp(-4 * t)), Math.exp(-9 * t)];
  const modeColors = [colors.warm, colors.blue, colors.sage];
  const modes = weights.map((weight, index) => {
    const n = index + 1;
    byId("mixed-t" + n).value = weight > 0 && weight < .001 ? weight.toExponential(1) : threeDecimals(weight);
    byId("mixed-meter" + n).value = weight;
    return { n, value: x => weight * Math.sin(n * x), color: modeColors[index], dashed: true, thickness: 1.55 };
  });
  const active = modes.filter(mode => byId("mixed-mode-" + mode.n).checked);
  const sum = (terms, x) => terms.reduce((total, term) => total + term.value(x), 0);
  const lifting = x => 1 + (1 + 2 * t) * x / Math.PI;
  const exact = x => lifting(x) + sum(modes, x);
  const partial = x => lifting(x) + sum(active, x);
  const probe = Math.PI / 4;

  byId("mixed-mode-t-value").value = twoDecimals(t);
  const selected = active.length ? "已选第 " + active.map(mode => mode.n).join("、") + " 模态。" : "当前只保留边界函数。";
  const error = Math.abs(partial(probe) - exact(probe));
  byId("mixed-mode-reading").value = selected +
    "在 x = π/4，重建值约为 " + threeDecimals(partial(probe)) +
    "，与完整解的差的绝对值约为 " + threeDecimals(error) +
    "。两端温度始终为 1 与 " + twoDecimals(2 + 2 * t) + "。";

  drawChart(byId("mixed-u-plot"), {
    xRange: [0, Math.PI],
    yRange: [-.15, 6.4],
    xTicks: intervalTicks,
    yTicks: [[0, "0"], [2, "2"], [4, "4"], [6, "6"]],
    curves: [
      { value: exact, color: colors.sage, dashed: true, thickness: 2 },
      { value: partial, color: colors.green, thickness: 2.6 },
      { value: lifting, color: colors.warm, dashed: true, thickness: 1.55 }
    ],
    dots: [{ x: probe, y: partial(probe), color: colors.green }]
  });
  drawChart(byId("mixed-v-plot"), {
    xRange: [0, Math.PI],
    yRange: [-1.18, 2.05],
    xTicks: intervalTicks,
    yTicks: [[-1, "−1"], [0, "0"], [1, "1"], [2, "2"]],
    yLabel: "v(x,t)",
    curves: [{ value: x => sum(active, x), color: colors.green, thickness: 2.6 }, ...active]
  });
}

setupStudyLab(renderCharacteristics, ["characteristic-plot", "wave-data-plot"],
  ["characteristic-x", "characteristic-t", "characteristic-slice"], "characteristic-t", "characteristic-play");
setupStudyLab(renderReflection, ["reflection-plot"],
  ["reflection-kind", "reflection-t"], "reflection-t", "reflection-play");
setupStudyLab(renderMode, ["mode-plot"],
  ["mode-kind", "mode-n", "mode-t"], "mode-t", "mode-play");
setupStudyLab(renderMixedModes, ["mixed-u-plot", "mixed-v-plot"],
  ["mixed-mode-t", "mixed-mode-1", "mixed-mode-2", "mixed-mode-3"], "mixed-mode-t", "mixed-mode-play");

const formulaBlocks = [...document.querySelectorAll(".formula")];
function updateFormulaFocus() {
  for (const block of formulaBlocks) {
    const overflows = block.scrollWidth > block.clientWidth + 1;
    if (overflows) {
      block.tabIndex = 0;
      block.setAttribute("role", "region");
      block.setAttribute("aria-label", "可横向滚动的公式");
    } else {
      block.removeAttribute("tabindex");
      block.removeAttribute("role");
      block.removeAttribute("aria-label");
    }
  }
}
window.addEventListener("resize", updateFormulaFocus);
document.addEventListener("toggle", updateFormulaFocus, true);
updateFormulaFocus();

let detailsToRestore = null;
window.addEventListener("beforeprint", () => {
  if (detailsToRestore) return;
  detailsToRestore = [...document.querySelectorAll("details:not([open])")];
  for (const detail of detailsToRestore) detail.open = true;
});
window.addEventListener("afterprint", () => {
  for (const detail of detailsToRestore || []) detail.open = false;
  detailsToRestore = null;
});
byId("print")?.addEventListener("click", () => window.print());
