"""Vector schematics of worked circuits whose component values differ from the slides."""
from html import escape


def wire(d):
    return f'<path d="{d}"/>'


def label(x, y, value, middle=False):
    anchor = "middle" if middle else "start"
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" fill="currentColor" stroke="none">{escape(value)}</text>'


def dot(x, y):
    return f'<circle cx="{x}" cy="{y}" r="2.8" fill="currentColor"/>'


def ground(x, y):
    return wire(f"M{x} {y}v6m-10 0h20m-17 4h14m-11 4h8")


def diode(x, y, angle=0):
    return f'<g transform="translate({x} {y}) rotate({angle})"><path d="M-24 0h14 M-10 -8L6 0 -10 8Z M6 -8v16 M6 0h18"/></g>'


def resistor(x, y, angle=0):
    return (f'<g transform="translate({x} {y}) rotate({angle})">'
            '<path d="M-30 0h11m0-6h38v12h-38zm38 6h11"/></g>')


def source(x, y, ac=False):
    inside = 'm-10 0q5-11 10 0t10 0' if ac else 'm-4-6h8m-4-4v8m-4 9h8'
    return f'<circle cx="{x}" cy="{y}" r="15"/>' + wire(f'M{x} {y}{inside}')


def diagram(key):
    if key in ("dmodel", "dripple", "diter", "dtwo"):
        supply, resistance = {"dmodel": ("5 V", "1 kΩ"), "dripple": ("10 V + 纹波", "10 kΩ"),
                              "diter": ("5 V", "1 kΩ"), "dtwo": ("5 V", "2 kΩ")}[key]
        two = key == "dtwo"
        parts = [source(55, 92), ground(55, 134), wire("M55 77V45h65m60 0h60m-185 62v27"),
                 resistor(150, 45), label(150, 27, resistance, True), label(14, 121, supply),
                 diode(240, 90, 90), wire("M240 45v21m0 48v20"), ground(240, 134),
                 label(255, 94, "D₁" if two else "D"), label(246, 36, "X" if two else "vD"), dot(240, 45)]
        if two:
            parts += [wire("M240 45h115v21m0 48v13"), diode(355, 90, 90), label(371, 94, "D₂"),
                      wire("M345 127h20"), label(355, 151, "+3 V", True)]
        else:
            parts += [wire("M240 45h53"), '<circle cx="296" cy="45" r="3"/>']
        title = "两只二极管的阴极分别接地和 +3 V" if two else "单管串联回路与管压测量节点"
    elif key == "bridge":
        title = "全波桥式整流，储能电容与负载并联"
        parts = [wire("M40 44h41m48 0h82m48 0h178M40 44v103h41m48 0h82m48 0h41v-103"),
                 diode(105, 44), diode(235, 44), diode(105, 147), diode(235, 147),
                 source(170, 94, True), wire("M170 44v35m0 30v38"),
                 wire("M355 44v43m-12 0h24m-24 8h24m-12 0v32"), ground(355, 127),
                 resistor(437, 96, 90), wire("M437 44v22"), ground(437, 126), ground(40, 147),
                 # The positive branch at x437 leads to the resistor through its top contact.
                 label(165, 24, "副边 10 V 有效值 · 50 Hz", True), label(95, 69, "D₁"), label(224, 69, "D₂"),
                 label(95, 172, "D₃"), label(224, 172, "D₄"), label(318, 82, "+"), label(348, 163, "100 μF", True),
                 label(435, 163, "1 kΩ", True), label(367, 32, "vₒ"), dot(170, 44), dot(170, 147),dot(300,44),dot(355,44)]
    elif key in ("fixed", "swing"):
        title = "发射极接地的固定偏置 NPN 级"
        rb = "510 / 100 kΩ" if key == "fixed" else "510 kΩ"
        parts = [wire("M85 26h160m-80 0v-9m-8 0h16M85 26v14m0 60v26h122M245 26v14m0 60v4l-38 17m0-14v42m0-13 38 20v9"),
                 resistor(85,70,90),resistor(245,70,90),ground(245,165),
                 '<path fill="currentColor" d="m232 152 11 3-7-9z"/>',
                 wire("M245 104h81"),'<circle cx="329" cy="104" r="3"/>',dot(165,26),dot(245,104),
                 label(180,20,"+10 V"),label(102,75,rb),label(262,75,"2 kΩ"),
                 label(322,91,"vCE"),label(152,153,"β = 100")]
    elif key == "port":
        title = "空载与带载电压法的输出端口等效电路"
        parts=[source(75,94,True),wire("M75 79V42h60m60 0h100v21m0 60v9m-220-23v23"),resistor(165,42),
               resistor(295,93,90),ground(295,132),ground(75,132),label(163,28,"Rₒ",True),
               label(100,105,"空载 2 V"),label(310,99,"1 kΩ"),label(312,36,"vL"),dot(295,42),
               wire("M295 42h44"),'<circle cx="342" cy="42" r="3"/>']
    else:
        raise ValueError(key)
    width = 490 if key == "bridge" else 415
    return (f'<figure class="example-schematic"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 197" '
            f'role="img" aria-label="{title}"><g fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" font-size="14" font-family="sans-serif">'
            + "".join(parts) + f'</g></svg><figcaption>{title} · 按本例条件绘制</figcaption></figure>')


def lab_drawings():
    """Topology variants for the diode waveforms; component values come from the controls."""
    diagrams = {}
    for mode in ("half", "center", "bridge"):
        for filtered in (False, True):
            if mode == "bridge":
                left = [wire("M30 42h41m48 0h57m48 0h64M30 42v98h41m48 0h57m48 0h39V42"),
                        diode(95,42),diode(200,42),diode(95,140),diode(200,140),
                        wire("M148 42v33m0 30v35"),source(148,90,True),ground(30,140),
                        dot(148,42),dot(148,140),dot(263,42),label(58,179,"交流源接桥臂中点")]
            elif mode == "half":
                left = [source(68,99,True),wire("M68 84V42h84m48 0h88M68 114v26"),
                        ground(68,140),diode(176,42),label(86,104,"副边")]
            else:
                left = [wire("M90 42h62m48 0h88M90 140h62m48 0h63V42"),
                        diode(176,42),diode(176,140),dot(263,42),dot(90,91),
                        wire("M90 42v9q-18 5 0 10q-18 5 0 10q-18 5 0 10v10q-18 5 0 10q-18 5 0 10q-18 5 0 10v19"),
                        wire("M90 91H42v28"),ground(42,119),label(16,170,"副边中心抽头接地")]
            parts = left + [wire("M288 42h94v23m0 60v11"),resistor(382,95,90),ground(382,136),
                            label(380,28,"vₒ",True),label(402,98,"Rʟ")]
            if filtered:
                parts += [wire("M305 42v40m-12 0h24m-24 8h24m-12 0v46"),ground(305,136),
                          dot(305,42), label(326,95,"C")]
            diagrams[mode + ("-c" if filtered else "")] = _lab_svg(parts, {"half":"半波整流","center":"中心抽头全波整流","bridge":"全波桥式整流"}[mode] + ("，电容并联在负载两端" if filtered else "，电阻负载"))
    for mode in ("upper", "lower", "double", "series", "clampP", "clampN"):
        parts = [source(52,102,True),ground(52,140),wire("M52 117v23m0-53V43"),label(25,85,"vᵢ")]
        if mode == "series":
            parts += [wire("M52 43h79m48 0h150v23m0 60v14"),diode(155,43),resistor(329,96,90),
                      ground(329,140),label(347,98,"Rʟ")]
        elif mode in ("clampP","clampN"):
            parts += [wire("M52 43h62m0-12v24m8-24v24m0-12h207v23m0 60v14"),
                      resistor(329,96,90),ground(329,140),label(347,98,"Rʟ"),label(116,23,"C",True),
                      wire("M232 43v27m0 48v22"),diode(232,94,270 if mode == "clampP" else 90),
                      ground(232,140),dot(232,43),label(64,181,"稳态，RʟC 远大于信号周期")]
        else:
            parts += [wire("M52 43h46m60 0h218"),resistor(128,43),label(128,25,"R",True),
                      '<circle cx="379" cy="43" r="3"/>']
            for x,upper in ([(232,True)] if mode=="upper" else [(232,False)] if mode=="lower" else [(225,True),(313,False)]):
                parts += [dot(x,43),wire(f"M{x} 43v27m0 48v19"),diode(x,94,90 if upper else 270),
                          wire(f"M{x-8} 137h16"),label(x,161,("+Vʀᴇꜰ" if upper else "−Vʀᴇꜰ"),True)]
        parts += [label(343,33,"vₒ")]
        title = {"upper":"带正参考电压的上限幅","lower":"带负参考电压的下限幅","double":"双参考电压双向限幅","series":"串联半波限幅","clampP":"正向平移的箝位电路","clampN":"负向平移的箝位电路"}[mode]
        diagrams[mode] = _lab_svg(parts,title)
    return diagrams


def _lab_svg(parts, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 193" role="img" aria-label="{title}">'
            '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
            'font-size="15" font-family="sans-serif">' + "".join(parts) + f'</g></svg><figcaption>{title}</figcaption>')
