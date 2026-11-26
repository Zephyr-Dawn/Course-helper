#!/usr/bin/env python3
"""Content linter for 大学物理甲-II 互动复习.
Checks Markdown structure, figure/lab/exercise embeds, section cross-references,
WebP asset existence, and build-time KaTeX rendering across all content files.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Set

from mdconv import MathCollector, parse_chapter_markdown, render_inline_md, render_md_fragment

SITE = Path(__file__).resolve().parents[1]
CHAPTERS = ["ch09", "ch10", "ch11", "ch12", "ch13", "ch14"]
KNOWN_LABS = {
    "dipole-field",
    "ring-disk-gauss",
    "conductor-plates",
    "dielectric-cap",
    "bridge-circuit",
    "rc-transient",
    "biot-savart",
    "ampere-cyclotron",
    "media-boundary",
    "ferro-hysteresis",
    "motional-vortex",
    "rl-mutual",
}

CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")


def load_figures(ch: str) -> Dict[str, Dict[str, object]]:
    p = SITE / "content" / f"figures-{ch}.json"
    if not p.is_file():
        return {}
    data = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return {rec["id"]: rec for rec in data}
    return data


def lint_chapter(ch: str, errors: List[str]) -> None:
    md_path = SITE / "content" / f"{ch}.md"
    if not md_path.is_file():
        errors.append(f"[{ch}] Missing {md_path.relative_to(SITE)}")
        return

    figures = load_figures(ch)
    for fig_id, rec in figures.items():
        webp = SITE / "assets" / "figs" / f"{fig_id}.webp"
        if not webp.is_file():
            errors.append(f"[{ch}] Missing rendered figure WebP: {webp.relative_to(SITE)}")
        if not rec.get("title") or not rec.get("caption"):
            errors.append(f"[{ch}] Figure {fig_id} missing title or caption")

    raw_md = md_path.read_text(encoding="utf-8")
    used_figs = set(re.findall(r"\{\{fig:([a-zA-Z0-9_-]+)\}\}", raw_md))
    for fig_id in used_figs:
        if fig_id not in figures:
            errors.append(f"[{ch}] Markdown references unknown figure {{{{fig:{fig_id}}}}}")
    for fig_id in figures:
        if fig_id not in used_figs:
            errors.append(f"[{ch}] Figure {fig_id} defined in figures-{ch}.json is never used in {ch}.md")

    used_labs = set(re.findall(r"\{\{lab:([a-zA-Z0-9_-]+)\}\}", raw_md))
    for lab_id in used_labs:
        if lab_id not in KNOWN_LABS:
            errors.append(f"[{ch}] Markdown references unknown lab {{{{lab:{lab_id}}}}}")

    collector = MathCollector()
    try:
        _, sections = parse_chapter_markdown(md_path, figures, collector)
    except Exception as exc:
        errors.append(f"[{ch}] Failed to parse {ch}.md: {exc}")
        return

    sec_ids: Set[str] = {s["id"] for s in sections}
    if len(sec_ids) < 4:
        errors.append(f"[{ch}] Expected at least 4 sections in {ch}.md, got {len(sec_ids)}")

    # Check formulas
    fm_path = SITE / "content" / f"formulas-{ch}.json"
    if not fm_path.is_file():
        errors.append(f"[{ch}] Missing {fm_path.relative_to(SITE)}")
    else:
        fms = json.loads(fm_path.read_text(encoding="utf-8"))
        for idx, fm in enumerate(fms):
            sec = fm.get("section")
            if sec not in sec_ids:
                errors.append(f"[{ch}] Formula #{idx + 1} ({fm.get('name')}) points to unknown section '{sec}'")
            collector.add(str(fm.get("tex", "")), display=True)
            for field in ("name", "use", "conditions", "pitfall"):
                val = str(fm.get(field, "")).strip()
                if not val:
                    errors.append(f"[{ch}] Formula #{idx + 1} missing field '{field}'")
                else:
                    render_inline_md(val, collector)

    # Check quiz
    qz_path = SITE / "content" / f"quiz-{ch}.json"
    if not qz_path.is_file():
        errors.append(f"[{ch}] Missing {qz_path.relative_to(SITE)}")
    else:
        qzs = json.loads(qz_path.read_text(encoding="utf-8"))
        for q in qzs:
            qid = q.get("id", "?")
            sec = q.get("section")
            if sec not in sec_ids:
                errors.append(f"[{ch}] Quiz {qid} points to unknown section '{sec}'")
            render_inline_md(str(q.get("q", "")), collector)
            render_inline_md(str(q.get("explain", "")), collector)
            for opt in q.get("options", []):
                render_inline_md(str(opt), collector)

    # Check exercises
    ex_path = SITE / "content" / "exercises" / f"{ch}.json"
    if not ex_path.is_file():
        errors.append(f"[{ch}] Missing {ex_path.relative_to(SITE)}")
    else:
        ex_data = json.loads(ex_path.read_text(encoding="utf-8"))
        ex_list = ex_data.get("exercises", ex_data) if isinstance(ex_data, dict) else ex_data
        ex_ids = set()
        for ex in ex_list:
            ex_id = ex.get("id", "?")
            ex_ids.add(ex_id)
            sec = ex.get("section")
            if sec not in sec_ids:
                errors.append(f"[{ch}] Exercise {ex_id} points to unknown section '{sec}'")
            if ex.get("questionImage"):
                img_p = SITE / "assets" / str(ex["questionImage"])
                if not img_p.is_file():
                    errors.append(f"[{ch}] Exercise {ex_id} missing questionImage file {img_p.relative_to(SITE)}")
            render_inline_md(str(ex.get("title", "")), collector)
            render_md_fragment(str(ex.get("problem", "")), collector)
            render_md_fragment(str(ex.get("answer", "")), collector)
            render_md_fragment(str(ex.get("check", "")), collector)
            if ex.get("note"):
                render_md_fragment(str(ex.get("note", "")), collector)
            for h in ex.get("hints", []):
                render_inline_md(str(h), collector)
            for st in ex.get("steps", []):
                render_md_fragment(str(st), collector)

        used_exs = set(re.findall(r"\{\{ex:([a-zA-Z0-9_-]+)\}\}", raw_md))
        for uex in used_exs:
            if uex not in ex_ids:
                errors.append(f"[{ch}] Markdown references unknown exercise {{{{ex:{uex}}}}}")

    # Validate all collected math expressions
    for key, spec in collector.items.items():
        tex = str(spec["tex"])
        if CHINESE_RE.search(tex):
            errors.append(f"[{ch}] Chinese characters found inside math expression: {tex[:80]}")
        if "\\boxed" in tex:
            errors.append(f"[{ch}] Forbidden \\boxed found inside math expression: {tex[:80]}")

    katex_errors = collector.render_all()
    for _, tex, err in katex_errors:
        errors.append(f"[{ch}] KaTeX error: {err} in TeX: {tex[:100]}")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    targets = args or CHAPTERS
    errors: List[str] = []
    for ch in targets:
        lint_chapter(ch, errors)
    if errors:
        for e in errors:
            print("ERROR:", e, file=sys.stderr)
        sys.exit(1)
    print(f"OK: Linted {', '.join(targets)} with 0 errors.")


if __name__ == "__main__":
    main()
