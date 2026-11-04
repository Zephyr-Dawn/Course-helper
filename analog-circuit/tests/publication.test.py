"""Build the public edition using only the files allowed in the public repo."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
assert not (ROOT / "assets/exercises").exists(), "Full source-slide images stay in the local offline package"
run = subprocess.run(
    [sys.executable, "-X", "utf8", "build.py"],
    cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
)
assert run.returncode == 0, "Public source must build without private slide images:\n" + run.stderr
entry = ROOT / "index.html"
assert entry.is_file(), "Pages needs a real index.html entry"
if shutil.which("git") and (ROOT.parent / ".git").exists():
    unfiltered = subprocess.check_output(
        ["git", "hash-object", "--no-filters", str(entry)], cwd=ROOT.parent
    )
    published = subprocess.check_output(
        ["git", "hash-object", "--path=analog-circuit/index.html", str(entry)], cwd=ROOT.parent
    )
    assert unfiltered == published, "Git must publish exactly the generated HTML bytes, including line endings"
text = entry.read_text(encoding="utf-8")
data = json.loads(re.search(
    r'<script type="application/json" id="course-data">(.*?)</script>', text, re.S
).group(1))
assert len(data["chapters"]) == 9
assert sum(len(c["sections"]) for c in data["chapters"]) == 95
local = [e for e in data["exercises"] if e.get("page")]
web = [e for e in data["exercises"] if e.get("url")]
assert len(local) == 55 and len(web) == 12
assert all(not e.get("image") for e in local), "Do not embed full lecture-slide screenshots"
assert sum(bool(e.get("questionImage")) for e in local) == 50
assert all(e["solutionHtml"] and e["questionHtml"] for e in local + web)
assert len(data["formulas"]) == 39 and len(data["quizzes"]) == 24
assert sum(c["html"].count("data-course-figure=") for c in data["chapters"]) == 76
assert not re.search(r"(?:src|href)=[\"']https?://[^\"']+\.(?:js|css|woff2?|png|webp)", text)
print("PASS: public index builds from published sources; nine lectures and all exercises/diagrams remain; full slides excluded")
