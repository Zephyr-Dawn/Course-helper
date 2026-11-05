"""Markdown -> HTML with math protection and site markers.

Math: $$...$$ (display) and $...$ (inline) are cut out before Markdown runs, then
pre-rendered by KaTeX (node src/katex_render.cjs) in one batch per build.
Markers (each on its own line):
  {{fig:F6-01}}          lecture figure card (content/figures-chNN.json)
  {{lab:diode-iv}}       interactive module mount (src/labs.js)
  {{ex:CH06-KP2-03}}     link chip to an exercise
  @@IMG:path@@           exercise image (assets/ec2024/path)
Callouts:
  :::tip 标题 / :::warn / :::note / :::example / :::check  ...  :::
"""
import html, json, re, subprocess
from pathlib import Path
import markdown

SITE = Path(__file__).resolve().parents[1]
MATH_TOKEN = "QMATHQ{}QEND"
CALLOUT_KINDS = {"tip": "要点", "warn": "易错", "note": "说明", "example": "例题", "check": "自检", "derive": "推导"}


class MathStore:
    def __init__(self):
        self.items = []  # (tex, display)
        self.html = None
        self.errors = []

    def add(self, tex, display):
        # KaTeX 不支持 array 列格式 *{n}{c}，展开成 n 个 c
        tex = re.sub(r"\*\{(\d+)\}\{([lcr])\}", lambda m: m.group(2) * int(m.group(1)), tex)
        self.items.append((tex.strip(), display))
        return MATH_TOKEN.format(len(self.items) - 1)

    def render_all(self):
        payload = json.dumps([{"tex": t, "display": d} for t, d in self.items], ensure_ascii=False)
        res = subprocess.run(["node", str(SITE / "src" / "katex_render.cjs")], input=payload,
                             capture_output=True, text=True, check=True)
        out = json.loads(res.stdout)
        self.html = [o["html"] for o in out]
        self.errors = [(self.items[i][0], o["error"]) for i, o in enumerate(out) if o["error"]]

    def restore(self, s):
        def rep(m):
            i = int(m.group(1))
            h = self.html[i]
            tex = html.escape(self.items[i][0], quote=True)
            if self.items[i][1]:
                return f'<div class="math-display" data-tex="{tex}">{h}</div>'
            return f'<span class="math" data-tex="{tex}">{h}</span>'
        s = s.replace("QBLANKQ", '<span class="blank" aria-label="填空"></span>')
        return re.sub(r"QMATHQ(\d+)QEND", rep, s)


DISPLAY_RE = re.compile(r"\$\$(.+?)\$\$", re.S)
MULTILINE_ENV_RE = re.compile(r"(?<![\\$])\$(?!\$)((?:(?!\n\s*\n)[^$])*?\\begin\{(?:(?!\n\s*\n)[^$])*?\n(?:(?!\n\s*\n)[^$])*?)\$")
INLINE_RE = re.compile(r"(?<![\\$])\$(?!\$)((?:\\\$|[^$\n])+?)\$")


def protect_math(text, store):
    text = DISPLAY_RE.sub(lambda m: "\n\n" + store.add(m.group(1), True) + "\n\n", text)
    # 源题库里有跨行的 $\begin{array}...\end{array}$（单个 $ 包裹多行），按独立公式处理
    text = MULTILINE_ENV_RE.sub(lambda m: "\n\n" + store.add(m.group(1), True) + "\n\n", text)
    text = INLINE_RE.sub(lambda m: store.add(m.group(1), False), text)
    # 填空横线（____）不能被 Markdown 当成强调符号
    text = re.sub(r"_{2,}|＿+", "QBLANKQ", text)
    return text


def _md(text):
    return markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"], output_format="html5")


def split_callouts(text):
    """Yield ('md', text) and ('callout', kind, title, inner) chunks."""
    lines = text.split("\n")
    out, buf, i = [], [], 0
    while i < len(lines):
        m = re.match(r"^:::\s*(\w+)\s*(.*)$", lines[i].strip())
        if m and m.group(1) in CALLOUT_KINDS:
            if buf:
                out.append(("md", "\n".join(buf)))
                buf = []
            kind, title = m.group(1), m.group(2).strip()
            inner, i = [], i + 1
            while i < len(lines) and lines[i].strip() != ":::":
                inner.append(lines[i])
                i += 1
            out.append(("callout", kind, title, "\n".join(inner)))
        else:
            buf.append(lines[i])
        i += 1
    if buf:
        out.append(("md", "\n".join(buf)))
    return out


def md_to_html(text, store, ctx=None):
    """Convert markdown (with callouts and markers) to HTML containing math tokens."""
    text = protect_math(text, store)
    parts = []
    for ch in split_callouts(text):
        if ch[0] == "md":
            parts.append(_md(ch[1]))
        else:
            _, kind, title, inner = ch
            label = html.escape(title or CALLOUT_KINDS[kind])
            parts.append(f'<div class="callout {kind}"><div class="callout-title">{label}</div>{_md(inner)}</div>')
    h = "\n".join(parts)
    return expand_markers(h, ctx or {})


MARKER_RE = re.compile(r"(?:<p>)?\{\{(fig|lab|ex):([\w\-\.]+)\}\}(?:</p>)?")
IMG_RE = re.compile(r"(?:<p>)?@@IMG:([^@]+)@@(?:</p>)?")


def expand_markers(h, ctx):
    used = ctx.setdefault("used", {"fig": [], "lab": [], "ex": [], "img": []})

    def rep(m):
        kind, key = m.group(1), m.group(2)
        used[kind].append(key)
        if kind == "fig":
            fig = ctx.get("figures", {}).get(key)
            if not fig:
                ctx.setdefault("missing", []).append(("fig", key))
                return f'<p class="build-missing">[缺少图 {key}]</p>'
            return fig_html(fig, ctx)
        if kind == "lab":
            return f'<div class="lab-mount" data-lab="{key}"></div>'
        return f'<a class="ex-chip" href="#/ex/{key}">习题 {key}</a>'

    h = MARKER_RE.sub(rep, h)

    def rep_img(m):
        p = m.group(1)
        used["img"].append(p)
        key = ctx["img_key"]("ec2024/" + p)
        return f'<p class="ex-img"><img data-img="{key}" alt="题图" class="zoomable" loading="lazy"></p>'

    return IMG_RE.sub(rep_img, h)


def fig_html(fig, ctx):
    key = ctx["img_key"]("figs/" + fig["id"] + ".webp")
    cap = ctx["inline_md"](fig.get("caption", ""))
    src = html.escape(fig.get("sourceLabel", ""))
    return (f'<figure class="fig" id="fig-{fig["id"]}"><img data-img="{key}" alt="{html.escape(fig.get("alt", fig["id"]))}" '
            f'class="zoomable" loading="lazy"><figcaption><b>图 {fig["id"]}</b> {cap}'
            f'<span class="fig-src">{src}</span></figcaption></figure>')


def inline_md(text, store):
    """Single-paragraph markdown without wrapping <p>."""
    h = md_to_html(text, store)
    h = h.strip()
    if h.startswith("<p>") and h.endswith("</p>") and h.count("<p>") == 1:
        h = h[3:-4]
    return h
