"""Build the section-first review aids against the same chapter IDs as the textbook."""
import html
import re

PAGE_TITLES = {
    "ch06": "二极管", "ch07": "三极管", "ch08": "场效应晶体管",
    "ch08s": "MOS 管工作原理与类型（补充）", "ch10": "频率响应",
    "ch11": "反馈", "ch11s": "反馈拆环分析（补充）", "ch12": "功率放大器",
}
PAGE_COUNTS = dict(zip(PAGE_TITLES, [32, 67, 41, 41, 73, 48, 16, 24]))


def page_library(images):
    return {key: {"title": title, "images": [images.key(f"pages/{key}/{n:03}.webp")
            for n in range(1, PAGE_COUNTS[key] + 1)]} for key, title in PAGE_TITLES.items()}


def read_guides(path):
    result = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#"):
            continue
        num, title, tex, note, refs = line.split("|")
        ch, sec = map(int, num.split("."))
        key = f"ch{ch:02}"
        sid = f"{key}-s{sec:02}"
        pages = []
        for group in refs.split(";"):
            doc = key + "s" if group.startswith("s") else key
            for chunk in group.lstrip("s").split(","):
                bounds = [int(i) for i in chunk.split("-")]
                assert 1 <= bounds[0] <= bounds[-1] <= PAGE_COUNTS[doc]
                pages.append((doc, bounds[0], bounds[-1]))
        assert sid not in result, sid
        result[sid] = (title, tex, note, pages)
    return result


def attach_guides(body, chapter, sections, guides, store, images, formulas):
    headings = {s["id"]: s for s in sections if s["level"] == 2}
    assert set(headings) == {k for k in guides if k.startswith(chapter + "-")}

    def add(m):
        sid = m[1]
        title, tex, note, ranges = guides[sid]
        headings[sid]["focus"] = title
        links = []
        for doc, a, b in ranges:
            pages = f"P{a}" if a == b else f"P{a}–{b}"
            label = ("补充 " if doc.endswith("s") else "讲义 ") + pages
            links.append(f'<button type="button" data-page="{doc}/{a}" title="打开完整讲义页">{label}</button>')
        jump = "".join(f'<a href="#/formulas/{f["id"]}">{html.escape(f["title"])}</a>'
                       for f in formulas if f["section"] == sid)
        panel = (f'<aside class="section-guide" aria-label="本节核心公式索引">'
                 f'<div class="guide-head"><b>核心公式索引</b><span>{html.escape(title)}</span></div>'
                 f'<div class="guide-math">{store.add(tex, True)}</div>'
                 f'<p>{html.escape(note)}</p><div class="guide-links no-print">{"".join(links)}'
                 f'{jump}<a href="#/topics/{chapter}">本章专题索引</a></div></aside>')
        extra = {"ch07-s03": "bjt", "ch08-s03": "mos"}.get(sid)
        if extra:
            panel += f'<div class="device-slot" id="motion-{extra}" data-device-motion="{extra}"></div>'
        scope = {"ch07-s10": "bjt", "ch08-s11": "mos"}.get(sid)
        if scope:
            panel += f'<div id="scope-{scope}" data-scope="{scope}"></div>'
        # Place carried-over circuit diagrams next to the analysis that uses them.
        shared = {
            "ch08-s08": ("ch08", 39, "共源共栅实例：比较上管的体端和源端电位"),
            "ch08-s14": ("ch08", 24, "三张基本接法原图：逐张辨认输入端、输出端和公共端"),
            "ch10-s07": ("ch10", 36, "时间常数分析的共射级实例：先在原图上认出三只低频电容"),
            "ch11-s03": ("ch11", 2, "由求和点写净输入，再沿前向和反馈支路写出信号关系"),
            "ch11-s04": ("ch11", 2, "固定反馈网络，沿环路追踪开环增益的变化"),
            "ch11-s12": ("ch11", 31, "对照拆环电路，标出输入和输出的负载条件"),
            "ch12-s04": ("ch12", 4, "计算效率用到的恒流下拉甲类射随级"),
            "ch12-s08": ("ch12", 12, "按本图上下电源轨和输出管，分别检查正、负峰值余量")
        }.get(sid)
        if shared:
            doc, page, caption = shared
            key = images.key(f"pages/{doc}/{page:03}.webp")
            panel += (f'<figure class="fig full-slide"><img class="zoomable" tabindex="0" loading="lazy" '
                      f'data-img="{key}" alt="{caption}"><figcaption>{caption} '
                      f'<button class="page-link no-print" data-page="{doc}/{page}">讲义 P{page} · 整页</button>'
                      f'</figcaption></figure>')
        return m[0] + panel

    return re.sub(r'<h2 id="([^"]+)">.*?</h2>', add, body, flags=re.S)


def add_example_figures(markdown, exercises):
    """Show original question art inside worked problems that explicitly use that problem."""
    def add(m):
        header, content = m[1], m[2]
        # References such as “同类” are not the source of this example's circuit.
        matches = re.findall(r'(?:EC2024\s*题\s*)(CH\d+-KP\d+-\d+)', header + "\n" + content)
        if not matches:
            return m[0]
        q = exercises[matches[0]]
        # Only extract the question art, never an answer drawing with a different topology.
        art = re.findall(r'@@IMG:([^@]+)@@', q["question"])
        if not art:
            return m[0]
        figures = "\n\n".join("@@IMG:" + path + "@@" for path in dict.fromkeys(art))
        given, _, rest = content.rstrip().partition("\n\n")
        return f"{header}\n{given}\n\n**原题题图 · {q['id']}**\n\n{figures}\n\n{rest}\n:::"
    return re.sub(r'(^:::example[^\n]*)\n(.*?)^:::', add, markdown, flags=re.M | re.S)
