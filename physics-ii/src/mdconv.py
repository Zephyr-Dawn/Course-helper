#!/usr/bin/env python3
"""Markdown + math + callout + figure/lab/exercise converter for 大学物理甲-II 互动复习."""

from __future__ import annotations

import html
import json
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple

import markdown

ROOT = Path(__file__).resolve().parent.parent
KATEX_SCRIPT = ROOT / "src" / "katex_render.cjs"


class MathCollector:
    """Collects TeX expressions across the entire build and renders them via KaTeX in one batch."""

    def __init__(self) -> None:
        self.items: Dict[str, Dict[str, object]] = {}
        self.by_sig: Dict[Tuple[bool, str], str] = {}
        self.rendered: Dict[str, Dict[str, str]] = {}

    def add(self, tex: str, display: bool = False) -> str:
        clean = tex.strip()
        sig = (display, clean)
        if sig in self.by_sig:
            return self.by_sig[sig]
        key = f"@@MATH_{len(self.items):05d}@@"
        self.by_sig[sig] = key
        self.items[key] = {"tex": clean, "display": display}
        return key

    def render_all(self) -> List[Tuple[str, str, str]]:
        if not self.items:
            return []
        proc = subprocess.run(
            ["node", str(KATEX_SCRIPT)],
            input=json.dumps(self.items, ensure_ascii=False),
            text=True,
            capture_output=True,
            check=True,
        )
        self.rendered = json.loads(proc.stdout)
        errors: List[Tuple[str, str, str]] = []
        for key, res in self.rendered.items():
            if "error" in res:
                errors.append((key, str(self.items[key]["tex"]), res["error"]))
        return errors

    def replace_in_text(self, text: str) -> str:
        def repl(match: re.Match[str]) -> str:
            key = match.group(0)
            spec = self.items.get(key)
            res = self.rendered.get(key)
            if not spec or not res:
                return key
            if spec["display"]:
                return f'<div class="math-block">{res["html"]}</div>'
            return f'<span class="math-inline">{res["html"]}</span>'

        return re.sub(r"@@MATH_\d{5}@@", repl, text)


DISPLAY_MATH_RE = re.compile(r"\$\$(.+?)\$\$", re.DOTALL)
INLINE_MATH_RE = re.compile(r"(?<!\\)\$([^\$\n]+?)(?<!\\)\$")


def protect_math(text: str, collector: MathCollector) -> str:
    """Replaces $$...$$ and $...$ with placeholders registered in collector."""
    code_stash: Dict[str, str] = {}

    def stash_code(match: re.Match[str]) -> str:
        k = f"@@CODE_{len(code_stash):04d}@@"
        code_stash[k] = match.group(0)
        return k

    text = re.sub(r"```.*?```", stash_code, text, flags=re.DOTALL)
    text = re.sub(r"`[^`\n]+`", stash_code, text)

    def repl_display(match: re.Match[str]) -> str:
        return "\n\n" + collector.add(match.group(1), display=True) + "\n\n"

    def repl_inline(match: re.Match[str]) -> str:
        return collector.add(match.group(1), display=False)

    text = DISPLAY_MATH_RE.sub(repl_display, text)
    text = INLINE_MATH_RE.sub(repl_inline, text)

    for k, v in code_stash.items():
        text = text.replace(k, v)
    return text


CALLOUT_RE = re.compile(
    r"^:::(tip|warn|note|example|check|derive)[ \t]*(.*?)\n(.*?)^:::[ \t]*$",
    re.MULTILINE | re.DOTALL,
)

CALLOUT_DEFAULT_TITLES = {
    "tip": "关键规律与解题技巧",
    "warn": "适用条件与高频易错点",
    "note": "物理意义与概念辨析",
    "example": "典型例题精解",
    "check": "量纲与极限自检",
    "derive": "核心推导过程",
}


def render_md_fragment(md_text: str, collector: MathCollector) -> str:
    """Converts a Markdown fragment (with math and callouts) into HTML with math placeholders."""
    protected = protect_math(md_text, collector)

    callout_stash: Dict[str, str] = {}

    def repl_callout(match: re.Match[str]) -> str:
        kind = match.group(1)
        raw_title = match.group(2).strip() or CALLOUT_DEFAULT_TITLES.get(kind, "提示")
        body_md = match.group(3).strip()
        title_html = render_inline_md(raw_title, collector)
        body_html = markdown.markdown(
            body_md,
            extensions=["tables", "fenced_code", "sane_lists", "attr_list"],
        )
        key = f"@@CALLOUT_{len(callout_stash):04d}@@"
        if kind == "derive":
            callout_stash[key] = (
                f'<details class="callout callout-{kind}" open>'
                f'<summary class="callout-title"><span class="callout-badge">推导</span>{title_html}</summary>'
                f'<div class="callout-body">{body_html}</div>'
                f"</details>"
            )
        else:
            badge_map = {
                "tip": "规律",
                "warn": "警示",
                "note": "辨析",
                "example": "例题",
                "check": "自检",
            }
            badge = badge_map.get(kind, "提示")
            callout_stash[key] = (
                f'<aside class="callout callout-{kind}">'
                f'<div class="callout-title"><span class="callout-badge">{badge}</span>{title_html}</div>'
                f'<div class="callout-body">{body_html}</div>'
                f"</aside>"
            )
        return f"\n\n{key}\n\n"

    protected = CALLOUT_RE.sub(repl_callout, protected)
    out_html = markdown.markdown(
        protected,
        extensions=["tables", "fenced_code", "sane_lists", "attr_list"],
    )
    for k, v in callout_stash.items():
        out_html = out_html.replace(f"<p>{k}</p>", v).replace(k, v)
    return out_html


def render_inline_md(text: str, collector: MathCollector) -> str:
    """Converts single-line text with inline math and bold/code to inline HTML."""
    protected = protect_math(text, collector)
    out = markdown.markdown(protected, extensions=["sane_lists"])
    out = re.sub(r"^<p>(.*)</p>$", r"\1", out.strip(), flags=re.DOTALL)
    return out


SECTION_SPLIT_RE = re.compile(
    r"^##[ \t]+(.+?)[ \t]*\{#([a-zA-Z0-9_-]+)\}[ \t]*$",
    re.MULTILINE,
)


def parse_chapter_markdown(
    md_path: Path,
    figures: Dict[str, Dict[str, object]],
    collector: MathCollector,
) -> Tuple[str, List[Dict[str, str]]]:
    """
    Parses a chapter markdown file into:
      - intro_html (before first ## heading)
      - list of sections: [{ id, title, html }]
    Also expands {{fig:ID}}, {{lab:ID}}, {{ex:ID}} placeholders.
    """
    raw = md_path.read_text(encoding="utf-8")
    raw = re.sub(r"^#[ \t]+.+?\n+", "", raw, count=1)

    matches = list(SECTION_SPLIT_RE.finditer(raw))
    if not matches:
        raise ValueError(f"No '## Title {{#id}}' sections found in {md_path}")

    intro_md = raw[: matches[0].start()].strip()
    intro_html = expand_embeds(render_md_fragment(intro_md, collector), figures, collector) if intro_md else ""

    sections: List[Dict[str, str]] = []
    for idx, m in enumerate(matches):
        title_raw = m.group(1).strip()
        sec_id = m.group(2).strip()
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw)
        body_md = raw[start:end].strip()
        body_html = render_md_fragment(body_md, collector)
        body_html = expand_embeds(body_html, figures, collector)
        sections.append(
            {
                "id": sec_id,
                "title": render_inline_md(title_raw, collector),
                "rawTitle": re.sub(r"\$[^\$]+\$", "", title_raw).strip(),
                "html": body_html,
            }
        )

    return intro_html, sections


def expand_embeds(
    html_text: str,
    figures: Dict[str, Dict[str, object]],
    collector: MathCollector,
) -> str:
    """Expands {{fig:ID}}, {{lab:ID}}, {{ex:ID}} inside rendered HTML."""

    def repl_fig(match: re.Match[str]) -> str:
        fig_id = match.group(1).strip()
        spec = figures.get(fig_id)
        if not spec:
            raise KeyError(f"Unknown figure id '{{{{fig:{fig_id}}}}}'")
        title_html = render_inline_md(str(spec.get("title", fig_id)), collector)
        caption_html = render_inline_md(str(spec.get("caption", "")), collector)
        source_label = html.escape(str(spec.get("source", "")))
        asset_key = html.escape(str(spec.get("assetKey", f"figs/{fig_id}.webp")))
        max_w = spec.get("maxWidth", "")
        style_attr = f' style="max-width:{int(max_w)}px"' if max_w else ""
        return (
            f'<figure class="lecture-fig" id="fig-{html.escape(fig_id)}"{style_attr}>'
            f'<div class="lecture-fig-img-wrap">'
            f'<img data-asset="{asset_key}" alt="{html.escape(str(spec.get("title", fig_id)))}" loading="lazy" />'
            f"</div>"
            f"<figcaption>"
            f'<div class="fig-head"><span class="fig-id">图 {html.escape(fig_id)}</span>'
            f'<strong class="fig-title">{title_html}</strong>'
            f'<span class="fig-src">{source_label}</span></div>'
            f'<div class="fig-cap">{caption_html}</div>'
            f"</figcaption>"
            f"</figure>"
        )

    def repl_lab(match: re.Match[str]) -> str:
        lab_id = html.escape(match.group(1).strip())
        return f'<div class="lab-mount" data-lab="{lab_id}"></div>'

    def repl_ex(match: re.Match[str]) -> str:
        ex_id = html.escape(match.group(1).strip())
        return f'<div class="inline-ex-mount" data-ex="{ex_id}"></div>'

    html_text = re.sub(r"<p>\s*\{\{fig:([a-zA-Z0-9_-]+)\}\}\s*</p>", repl_fig, html_text)
    html_text = re.sub(r"\{\{fig:([a-zA-Z0-9_-]+)\}\}", repl_fig, html_text)
    html_text = re.sub(r"<p>\s*\{\{lab:([a-zA-Z0-9_-]+)\}\}\s*</p>", repl_lab, html_text)
    html_text = re.sub(r"\{\{lab:([a-zA-Z0-9_-]+)\}\}", repl_lab, html_text)
    html_text = re.sub(r"<p>\s*\{\{ex:([a-zA-Z0-9_-]+)\}\}\s*</p>", repl_ex, html_text)
    html_text = re.sub(r"\{\{ex:([a-zA-Z0-9_-]+)\}\}", repl_ex, html_text)
    return html_text
