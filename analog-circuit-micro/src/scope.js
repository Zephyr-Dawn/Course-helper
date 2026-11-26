/* Low-frequency voltage amplifiers, both biased at 1 mA and 3 V. */
window.GainScope = (() => {
  const stops = new Set();
  const configs = {
    bjt: { name: '共射', input: 'vBE', output: 'vCE', bias: .65, swing: 5, limit: 12, gm: 40,
      model: 'iC = 1 mA × exp(ΔvBE / 25 mV)', source: '三极管讲义 P7、P20–24、P39–41',
      prompt: '基射电压增加 5 mV，集电极电压会变多少？',
      detail: '发射极接地，输入源直接设定基射电压。取热电压 25 mV，并把 0.650 V 时的集电流定为 1 mA。输入增加后，更多电子从发射区注入基区，集电流增加，集电极电阻上的压降随之增加。',
      domain: '在滑块全程，集电极电位都高于基极，管子保持正向放大。忽略 Early 效应。' },
    mos: { name: '共源', input: 'vGS', output: 'vDS', bias: 2, swing: 100, limit: 200, gm: 2,
      model: 'iD = (1 mA/V²) × (vGS − 1 V)²', source: '场效应晶体管讲义 P9–12、P15、P27–29',
      prompt: '栅压增加 100 mV，漏极电压会变多少？',
      detail: '源极与体端接地，阈值 1 V，器件参数 kₙ = 2 mA/V²。栅压从 2 V 上升时，过驱动和反型电荷增加，漏电流随之增大。电源电压固定，因此漏端电压下降。',
      domain: '在滑块全程，漏源电压都大于过驱动，管子保持饱和。采用长沟道模型，忽略沟道长度调制。' }
  };
  function circuit(type, hero = false) {
    const isB = type === 'bjt';
    const symbol = isB ?
      '<path d="M158 104v42m0-30 25-19m-25 36 25 19"/><path fill="currentColor" d="m169 145 11 4-6-10z"/>' :
      '<path d="M151 107v34m8-37v11m0 5v11m0 5v11m0-38h24V96m-24 46h24v11m-24-28h15v17"/><path fill="currentColor" d="m161 125 7-3v6z"/>';
    const input = isB ? '0.650 V' : '2.000 V';
    return `<svg viewBox="0 0 286 216" role="img" aria-label="${isB ? '共射 NPN' : '共源增强型 NMOS，体源相连'}实验完整电路，五伏电源经两千欧电阻接输出，输入电压源与晶体管共地"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M176 17h14m-7 0v17l-5 4 10 6-10 6 10 6-10 6 5 4v32m0-17h50"/><circle cx="183" cy="81" r="2.7" fill="currentColor"/><circle cx="237" cy="81" r="3"/>
      <path d="M183 151v28m-10 0h20m-17 5h14m-11 5h8M52 125h${isB ? 106 : 99}M52 125v10m0 26v18m-10 0h20m-17 5h14m-11 5h8"/>
      ${symbol}<circle cx="52" cy="148" r="13"/><path d="M48 143h8m-4-4v8m-3 6h6"/></g>
      <g fill="currentColor" font-family="inherit" font-size="13"><text x="199" y="22">+5 V</text><text x="200" y="54">2 kΩ</text><text x="230" y="70">vₒ</text><text x="15" y="112">vᵢ</text><text x="64" y="153">${hero ? input : '直流 + 正弦'}</text><text x="191" y="134">${isB ? 'NPN' : 'NMOS'}</text><text x="12" y="208">${hero ? '静态工作点' : '输入和输出共地'}</text>${hero ? '<text x="115" y="208">1.00 mA · 3.00 V</text>' : ''}</g></svg>`;
  }
  const curves = (type, mv) => {
    const c = configs[type], a = mv / 1000;
    return phase => {
      const vin = a * Math.sin(phase * 2 * Math.PI);
      const i = type === 'bjt' ? Math.exp(vin / .025) : (1 + vin) ** 2;
      return { vin, i, vo: 5 - i * 2, tangent: 3 - c.gm * 2 * vin };
    };
  };
  function mount(root) {
    root.querySelectorAll('[data-scope]').forEach(el => {
      const type = el.dataset.scope, c = configs[type];
      el.innerHTML = `<section class="gain-scope"><header><span>小信号放大实验 · ${c.name}级</span><h3>${c.prompt}</h3></header>
        <p>${c.detail}</p><div class="scope-plots"><figure>${circuit(type)}<figcaption>教学算例 · 完整电路</figcaption></figure><figure class="scope-wave"><svg viewBox="0 0 340 222" role="img" aria-label="同一周期的输入、输出和切线近似波形"></svg><figcaption>实线为器件方程，虚线为切线近似</figcaption></figure></div>
        <div class="scope-controls"><label>输入峰值 <output class="amplitude"></output><input data-amplitude type="range" min="1" max="${c.limit}" value="${c.swing}"></label>
        <label>周期位置 <output class="phase"></output><input data-phase type="range" min="0" max="100" value="25"></label></div>
        <div class="scope-actions"><button class="btn" data-play>播放一个周期</button><button class="btn" data-reset>复位</button></div>
        <div class="scope-read"></div><details><summary>从工作点推到电压增益</summary><div class="dbody"><p>① 直流时输入为 ${c.bias.toFixed(3)} V。代入 ${c.model} 得 1 mA，输出为 5 V − 2 kΩ × 1 mA = 3 V。</p>
        <p>② 在这个工作点对电流求导，得到跨导 gₘ = ${c.gm} mS。电流变化经 2 kΩ 转成电压变化，电压增益为 −${2*c.gm} V/V。</p>
        <p>③ 将输入峰值调大，观察实线偏离虚线。正、负半周的电流变化量开始不等，输出峰值也不再对称。${c.domain}</p></div></details>
        <small>自拟数值 · ${c.source} · 理想电压源驱动，输出空载。</small></section>`;
      const $ = sel => el.querySelector(sel), amp = $('[data-amplitude]'), phase = $('[data-phase]');
      const svg = $('.scope-wave svg'), play = $('[data-play]');
      let timer = 0;
      function stop() { cancelAnimationFrame(timer); timer = 0; play.textContent = '播放一个周期'; }
      stops.add(stop);
      function draw() {
        const a = Number(amp.value), p = Number(phase.value) / 100;
        const at = curves(type, a), now = at(p), outLim = Math.max(3-at(.25).vo, at(.75).vo-3)*1.1;
        const x = n => 47+278*n, y1 = v => 60-23*v/(a/1000), y2 = v => 150-32*(v-3)/outLim;
        const path = (field, y) => Array.from({length:129}, (_,k) => (k ? 'L':'M') + x(k/128).toFixed(2)+' '+y(at(k/128)[field]).toFixed(2)).join(' ');
        const fmt = (n, digits) => (n>=0?'+':'−')+Math.abs(n).toFixed(digits);
        svg.innerHTML = `<g stroke="#d4dde0" fill="none"><path d="M47 28v158m0-126h278m-278 90h278"/>${[.25,.5,.75,1].map(t=>'<path stroke-dasharray="2 4" d="M'+x(t)+' 28v158"/>').join('')}</g>
          <g fill="#365263" font-size="12" font-family="inherit"><text x="8" y="18">输入增量 / mV</text><text x="6" y="42">+${a}</text><text x="29" y="64">0</text><text x="8" y="89">−${a}</text><text x="8" y="108">输出电压 / V</text><text x="3" y="122">${(3+outLim).toFixed(2)}</text><text x="3" y="154">3.00</text><text x="3" y="184">${(3-outLim).toFixed(2)}</text><text x="45" y="208">0</text><text x="178" y="208">T/2</text><text x="318" y="208">T</text></g>
          <g fill="none" stroke-width="2.4"><path stroke="#117777" d="${path('vin',y1)}"/><path stroke="#af5426" d="${path('vo',y2)}"/><path stroke="#394d6b" stroke-width="1.5" stroke-dasharray="5 4" d="${path('tangent',y2)}"/></g><path stroke="#526474" stroke-dasharray="3 3" d="M${x(p)} 28v160"/><circle fill="#117777" cx="${x(p)}" cy="${y1(now.vin)}" r="4"/><circle fill="#af5426" cx="${x(p)}" cy="${y2(now.vo)}" r="4"/>`;
        $('.amplitude').textContent = a+' mV'; $('.phase').textContent = Math.round(p*100)+'%';
        $('.scope-read').innerHTML = `<span>${c.input}<b>${(c.bias+now.vin).toFixed(4)} V</b></span><span>管电流<b>${now.i.toFixed(3)} mA</b></span><span>输出变化<b>${fmt(now.vo-3,3)} V</b></span><span>切线预测<b>${fmt(now.tangent-3,3)} V</b></span>`;
      }
      amp.oninput = draw; phase.oninput = () => {stop(); draw();};
      play.onclick = () => {
        if (timer) return stop();
        const start=performance.now(), initial=Number(phase.value)/100;
        play.textContent='暂停';
        function frame(t) {
          const elapsed=(t-start)/6000, pos=initial+elapsed;
          phase.value=elapsed>=1 ? Math.round(initial*100) : Math.round((pos%1)*100);
          draw();
          if (elapsed>=1) stop(); else timer=requestAnimationFrame(frame);
        }
        timer=requestAnimationFrame(frame);
      };
      $('[data-reset]').onclick=()=>{stop(); amp.value=c.swing; phase.value=25; draw();};
      draw();
    });
  }
  return {circuit, mount, dispose(){stops.forEach(stop=>stop()); stops.clear();}};
})();
