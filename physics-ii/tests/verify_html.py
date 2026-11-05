#!/usr/bin/env python3
"""End-to-end structural, math, image, and offline CSP verifier for 大学物理II-互动复习.html."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "physics-ii"
HTML_PATH = ROOT / "大学物理II-互动复习.html"


def main() -> None:
    assert HTML_PATH.is_file(), f"Missing {HTML_PATH}"
    html = HTML_PATH.read_text(encoding="utf-8")

    # 1. Extract and validate embedded JSON payloads
    m_course = re.search(r'<script type="application/json" id="course-data">(.*?)</script>', html, re.DOTALL)
    m_images = re.search(r'<script type="application/json" id="image-data">(.*?)</script>', html, re.DOTALL)
    assert m_course and m_images, "Missing course-data or image-data JSON script tags"

    course_raw = m_course.group(1)
    for token in ("@@MATH_", "@@CALLOUT_", "@@CODE_", "{{fig:", "{{lab:", "{{ex:", "katex-error"):
        assert token not in course_raw, f"Forbidden unrendered token '{token}' found in course-data!"
    for token in ("__COURSE_DATA_JSON__", "__IMAGE_DATA_JSON__", "katex-error"):
        assert token not in html, f"Forbidden token '{token}' found in compiled HTML!"

    course = json.loads(course_raw)
    images = json.loads(m_images.group(1))

    assert len(course["chapters"]) == 6, f"Expected 6 chapters, got {len(course['chapters'])}"
    total_secs = sum(len(c["sections"]) for c in course["chapters"])
    assert total_secs == 36, f"Expected 36 sections, got {total_secs}"
    assert len(course["formulas"]) >= 38, f"Expected >=38 formulas, got {len(course['formulas'])}"
    assert len(course["exercises"]) >= 58, f"Expected >=58 exercises, got {len(course['exercises'])}"
    assert len(course["quizzes"]) >= 32, f"Expected >=32 quizzes, got {len(course['quizzes'])}"
    assert len(images) >= 130, f"Expected >=130 embedded WebP images, got {len(images)}"

    # 3. Verify every data-asset reference in course HTML exists in image-data
    all_sec_html = "\n".join(s["html"] for c in course["chapters"] for s in c["sections"])
    asset_refs = set(re.findall(r'data-asset="([^"]+)"', all_sec_html))
    for ex in course["exercises"]:
        if ex.get("questionImage"):
            asset_refs.add(ex["questionImage"])
    for ref in asset_refs:
        assert ref in images, f"Referenced data-asset '{ref}' missing from image-data"
        assert images[ref].startswith("data:image/webp;base64,"), f"Invalid data URI for '{ref}'"

    # 4. Verify all 12 interactive lab mounts are present in chapter sections
    lab_refs = set(re.findall(r'data-lab="([^"]+)"', all_sec_html))
    expected_labs = {
        "dipole-field", "ring-disk-gauss", "conductor-plates", "dielectric-cap",
        "bridge-circuit", "rc-transient", "biot-savart", "ampere-cyclotron",
        "media-boundary", "ferro-hysteresis", "motional-vortex", "rl-mutual",
    }
    assert lab_refs == expected_labs, f"Lab mounts mismatch: got {lab_refs}, expected {expected_labs}"

    # 5. Verify zero external network dependencies in HTML tags
    ext_refs = re.findall(r'(?:src|href)=["\']https?://[^"\']+["\']', html)
    assert not ext_refs, f"External network references found: {ext_refs}"

    print(
        f"VERIFY OK: {len(course['chapters'])} chapters, {total_secs} sections, "
        f"{len(course['formulas'])} formulas, {len(course['exercises'])} exercises, "
        f"{len(course['quizzes'])} quizzes, {len(lab_refs)} labs, {len(images)} embedded WebP images, "
        f"0 KaTeX errors, 0 external links."
    )


if __name__ == "__main__":
    main()
