#!/usr/bin/env python3
"""Single-file offline HTML builder for 大学物理甲-II 互动复习 (Chapters 9–14)."""

from __future__ import annotations

import base64
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

SITE = Path(__file__).resolve().parent
ROOT = SITE.parent
sys.path.insert(0, str(SITE / "src"))

from mdconv import MathCollector, parse_chapter_markdown, render_inline_md, render_md_fragment  # noqa: E402

CHAPTER_SPECS = [
    {
        "id": "ch09",
        "badge": "第 9 章",
        "shortTitle": "9 真空中的静电场",
        "title": "第 9 章：真空中的静电场",
        "subtitle": "库仑定律、电场强度叠加、电偶极子、静电场高斯定理、环路定理、电势与电势梯度",
        "pageRange": "课件第1～4讲 · PDF p12–138",
        "pdfPages": [12, 138],
    },
    {
        "id": "ch10",
        "badge": "第 10 章",
        "shortTitle": "10 导体和电介质",
        "title": "第 10 章：静电场中的导体和电介质",
        "subtitle": "静电平衡与电荷分布、静电屏蔽、电容器、电介质极化、有介质高斯定理(D/E/P)、静电场能量",
        "pageRange": "课件第4～7讲 · PDF p139–238",
        "pdfPages": [139, 238],
    },
    {
        "id": "ch11",
        "badge": "第 11 章",
        "shortTitle": "11 稳恒电流",
        "title": "第 11 章：稳恒电流",
        "subtitle": "电流密度矢量与连续性方程、欧姆定律微分形式、电动势、基尔霍夫定律、惠斯通电桥与 RC 暂态过程",
        "pageRange": "课件第7～8讲 · PDF p239–271",
        "pdfPages": [239, 271],
    },
    {
        "id": "ch12",
        "badge": "第 12 章",
        "shortTitle": "12 稳恒磁场",
        "title": "第 12 章：稳恒磁场",
        "subtitle": "毕奥-萨伐尔定律、磁通量与磁场高斯定理、安培环路定理、安培力与磁力矩、洛伦兹力与霍尔效应",
        "pageRange": "课件第8～11讲 · PDF p272–365",
        "pdfPages": [272, 365],
    },
    {
        "id": "ch13",
        "badge": "第 13 章",
        "shortTitle": "13 磁场中的磁介质",
        "title": "第 13 章：磁场中的磁介质",
        "subtitle": "顺磁/抗磁微观机制、磁化强度与磁化电流、有介质安培环路定理(H/B/M)、铁磁质磁滞回线与磁屏蔽",
        "pageRange": "课件第11～12讲 · PDF p366–404",
        "pdfPages": [366, 404],
    },
    {
        "id": "ch14",
        "badge": "第 14 章",
        "shortTitle": "14 电磁感应",
        "title": "第 14 章：电磁感应",
        "subtitle": "法拉第定律与楞次定律、动生电动势、感生电动势与涡旋电场、自感与互感、RL暂态与磁场能量",
        "pageRange": "课件第12～14讲 · PDF p405–502",
        "pdfPages": [405, 502],
    },
]


def strip_tags(html_str: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html_str)).strip()


def embed_katex_css() -> str:
    css_path = SITE / "assets" / "katex" / "katex.min.css"
    css = css_path.read_text(encoding="utf-8")
    fonts_dir = SITE / "assets" / "katex" / "fonts"

    def repl_url(match: re.Match[str]) -> str:
        rel = match.group(1).strip("'\"")
        if rel.endswith(".woff2"):
            fname = Path(rel).name
            fpath = fonts_dir / fname
            if fpath.is_file():
                b64 = base64.b64encode(fpath.read_bytes()).decode("ascii")
                return f"url(data:font/woff2;base64,{b64}) format('woff2')"
        return match.group(0)

    css = re.sub(r"url\(([^)]+)\)\s*format\(['\"]woff2['\"]\)", repl_url, css)
    css = re.sub(r",\s*url\([^)]+\.(?:woff|ttf)\)\s*format\([^)]+\)", "", css)
    return css


def load_fig_dict(ch_id: str) -> Dict[str, Dict[str, Any]]:
    p = SITE / "content" / f"figures-{ch_id}.json"
    if not p.is_file():
        return {}
    raw = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return {rec["id"]: rec for rec in raw}
    return raw


def replace_math_recursive(obj: Any, collector: MathCollector) -> Any:
    if isinstance(obj, str):
        return collector.replace_in_text(obj)
    if isinstance(obj, list):
        return [replace_math_recursive(x, collector) for x in obj]
    if isinstance(obj, dict):
        return {k: replace_math_recursive(v, collector) for k, v in obj.items()}
    return obj


def build() -> None:
    collector = MathCollector()
    chapters_out: List[Dict[str, Any]] = []
    formulas_out: List[Dict[str, Any]] = []
    exercises_out: List[Dict[str, Any]] = []
    quizzes_out: List[Dict[str, Any]] = []
    image_keys: set[str] = set()

    for spec in CHAPTER_SPECS:
        ch_id = spec["id"]
        figs = load_fig_dict(ch_id)
        for fid, frec in figs.items():
            image_keys.add(str(frec.get("assetKey", f"figs/{fid}.webp")))

        md_path = SITE / "content" / f"{ch_id}.md"
        intro_html, sections = parse_chapter_markdown(md_path, figs, collector)
        ch_entry = dict(spec)
        ch_entry["introHtml"] = intro_html
        ch_entry["sections"] = sections
        chapters_out.append(ch_entry)

        # Formulas
        fm_path = SITE / "content" / f"formulas-{ch_id}.json"
        for fm in json.loads(fm_path.read_text(encoding="utf-8")):
            tex_key = collector.add(str(fm["tex"]), display=True)
            formulas_out.append(
                {
                    "ch": ch_id,
                    "chLabel": spec["badge"],
                    "name": render_inline_md(str(fm["name"]), collector),
                    "rawName": re.sub(r"\$[^\$]+\$", "", str(fm["name"])).strip(),
                    "texHtml": tex_key,
                    "use": render_inline_md(str(fm["use"]), collector),
                    "conditions": render_inline_md(str(fm["conditions"]), collector),
                    "pitfall": render_inline_md(str(fm["pitfall"]), collector),
                    "section": fm["section"],
                }
            )

        # Exercises
        ex_path = SITE / "content" / "exercises" / f"{ch_id}.json"
        ex_raw = json.loads(ex_path.read_text(encoding="utf-8"))
        ex_list = ex_raw.get("exercises", ex_raw) if isinstance(ex_raw, dict) else ex_raw
        for ex in ex_list:
            q_img = ex.get("questionImage", "")
            if q_img:
                image_keys.add(str(q_img))
            exercises_out.append(
                {
                    "id": ex["id"],
                    "ch": ch_id,
                    "section": ex["section"],
                    "difficulty": int(ex.get("difficulty", 2)),
                    "source": str(ex.get("source", "")),
                    "title": render_inline_md(str(ex["title"]), collector),
                    "rawTitle": re.sub(r"\$[^\$]+\$", "", str(ex["title"])).strip(),
                    "problem": render_md_fragment(str(ex["problem"]), collector),
                    "questionImage": q_img,
                    "hints": [render_inline_md(str(h), collector) for h in ex.get("hints", [])],
                    "steps": [render_md_fragment(str(s), collector) for s in ex.get("steps", [])],
                    "answer": render_md_fragment(str(ex["answer"]), collector),
                    "check": render_md_fragment(str(ex["check"]), collector),
                    "note": render_md_fragment(str(ex["note"]), collector) if ex.get("note") else "",
                }
            )

        # Quizzes
        qz_path = SITE / "content" / f"quiz-{ch_id}.json"
        for q in json.loads(qz_path.read_text(encoding="utf-8")):
            quizzes_out.append(
                {
                    "id": q["id"],
                    "ch": ch_id,
                    "section": q["section"],
                    "q": render_inline_md(str(q["q"]), collector),
                    "options": [render_inline_md(str(opt), collector) for opt in q["options"]],
                    "answer": int(q["answer"]),
                    "explain": render_inline_md(str(q["explain"]), collector),
                }
            )

    errors = collector.render_all()
    if errors:
        for _, tex, err in errors:
            print(f"KaTeX ERROR: {err} in {tex}", file=sys.stderr)
        sys.exit(1)

    chapters_out = replace_math_recursive(chapters_out, collector)
    formulas_out = replace_math_recursive(formulas_out, collector)
    exercises_out = replace_math_recursive(exercises_out, collector)
    quizzes_out = replace_math_recursive(quizzes_out, collector)

    # Search index
    search_index: List[Dict[str, str]] = []
    for ch in chapters_out:
        for s in ch["sections"]:
            plain = strip_tags(s["html"])
            search_index.append(
                {
                    "kind": ch["badge"],
                    "title": s["rawTitle"],
                    "text": plain[:600],
                    "snippet": plain[:110] + "...",
                    "href": f"#{ch['id']}/{s['id']}",
                }
            )
    for fm in formulas_out:
        plain = strip_tags(fm["use"] + " " + fm["conditions"] + " " + fm["pitfall"])
        search_index.append(
            {
                "kind": "重点公式",
                "title": fm["rawName"],
                "text": plain,
                "snippet": plain[:110],
                "href": f"#formulas/{fm['ch']}",
            }
        )
    for ex in exercises_out:
        plain = strip_tags(ex["problem"] + " " + ex["answer"])
        search_index.append(
            {
                "kind": f"例题 {ex['id']}",
                "title": ex["rawTitle"],
                "text": plain[:500],
                "snippet": plain[:110] + "...",
                "href": f"#exercises/{ex['ch']}",
            }
        )

    image_data: Dict[str, str] = {}
    for key in sorted(image_keys):
        img_file = SITE / "assets" / key
        if not img_file.is_file():
            raise FileNotFoundError(f"Missing referenced image asset: {img_file}")
        b64 = base64.b64encode(img_file.read_bytes()).decode("ascii")
        image_data[key] = f"data:image/webp;base64,{b64}"

    course_data = {
        "chapters": chapters_out,
        "formulas": formulas_out,
        "exercises": exercises_out,
        "quizzes": quizzes_out,
        "searchIndex": search_index,
    }

    shell = (SITE / "src" / "shell.html").read_text(encoding="utf-8")
    out_html = (
        shell.replace("/* __KATEX_CSS__ */", embed_katex_css())
        .replace("/* __APP_CSS__ */", (SITE / "src" / "style.css").read_text(encoding="utf-8"))
        .replace("__COURSE_DATA_JSON__", json.dumps(course_data, ensure_ascii=False).replace("</script>", "<\\/script>"))
        .replace("__IMAGE_DATA_JSON__", json.dumps(image_data, ensure_ascii=False))
        .replace("/* __MODELS_JS__ */", (SITE / "src" / "models.js").read_text(encoding="utf-8"))
        .replace("/* __LABS_JS__ */", (SITE / "src" / "labs.js").read_text(encoding="utf-8"))
        .replace("/* __APP_JS__ */", (SITE / "src" / "app.js").read_text(encoding="utf-8"))
    )

    out1 = SITE / "index.html"
    out2 = ROOT / "大学物理II-互动复习.html"
    out1.write_text(out_html, encoding="utf-8")
    out2.write_text(out_html, encoding="utf-8")

    manifest = {
        "course": "大学物理甲-II（电磁学 · 期中复习）",
        "chapters": len(chapters_out),
        "sections": sum(len(c["sections"]) for c in chapters_out),
        "formulas": len(formulas_out),
        "exercises": len(exercises_out),
        "quizzes": len(quizzes_out),
        "images": len(image_data),
        "mathExpressions": len(collector.items),
        "htmlBytes": len(out_html.encode("utf-8")),
        "sha256": hashlib.sha256(out_html.encode("utf-8")).hexdigest(),
    }
    (SITE / "build-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Built successfully:", json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    build()
