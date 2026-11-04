"""Check completeness, source identities, embedded assets and delivery metadata."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
ranges = {1:(73,77),2:(47,51),3:(45,51),4:(51,56),5:(37,42),6:(55,60),7:(57,62),8:(59,65),9:(55,61)}
expected = {f'L{n}-P{p}' for n,(a,b) in ranges.items() for p in range(a,b+1)}
records = []
for n in range(1,10):
    chapter = (ROOT/f'content/ch{n:02}.md').read_text(encoding='utf-8')
    assert len(chapter) > 6000, f'Insufficient chapter content: {n}'
    assert len(re.findall(r'^## ', chapter, re.M)) >= 7
    questions = json.loads((ROOT/f'content/exercises-{n:02}.json').read_text(encoding='utf-8'))
    assert {q['id'] for q in questions} == {x for x in expected if x.startswith(f'L{n}-')}
    for q in questions:
        assert q['chapter'] == n
    records.extend(questions)
challenges = json.loads((ROOT/'content/challenges.json').read_text(encoding='utf-8'))
assert len(challenges) == 12
for q in challenges:
    assert q['url'].startswith('https://bc0403.github.io/EC2024/')
    if q.get('image'): assert (ROOT/q['image']).is_file()
records.extend(challenges)
assert len({q['id'] for q in records}) == 67
for q in records:
    for field in ('title','source','question','solution','answer','checks','tags','hints'):
        assert q.get(field), f"Missing {field}: {q['id']}"
    assert len(q['solution']) > 100, q['id']
quizzes = json.loads((ROOT/'content/quizzes.json').read_text(encoding='utf-8'))
assert len(quizzes) == 24
for q in quizzes:
    assert 0 <= q['correct'] < len(q['options']) and q['explanation']
manifest = json.loads((ROOT/'build-manifest.json').read_text(encoding='utf-8'))
assert manifest['chapters'] == 9 and manifest['sections'] == 95 and not manifest['draft']
assert manifest['exercise_pages'] == 55 and manifest['challenges'] == 12 and manifest['formulas'] == 39
index = json.loads((ROOT/'source-index.json').read_text(encoding='utf-8'))
assert len(index['pages']) == 525
assert len({(p['file'],p['pdf_page']) for p in index['pages']}) == 525
source = (ROOT/'index.html').read_text(encoding='utf-8')
assert not re.search(r'(?:src|href)=[\"\']https?://[^\"\']+\.(?:js|css|png|webp|woff2?)', source)
data = json.loads(re.search(r'<script type="application/json" id="course-data">(.*?)</script>', source, re.S).group(1))
assert len(data['chapters']) == 9 and len(data['exercises']) == 67
for q in data['exercises']:
    if q.get('image'): assert q['image'].startswith('data:image/'), q['id']
    if q.get('questionImage'): assert q['questionImage'].startswith('data:image/'), q['id']
figures=json.loads((ROOT/'content/figures.json').read_text(encoding='utf-8'))
question_figures=json.loads((ROOT/'content/question-figures.json').read_text(encoding='utf-8'))
assert len(figures)==76 and len(question_figures)==50
assert sum(c['html'].count('data-course-figure=') for c in data['chapters'])==76
assert sum(bool(q.get('questionImage')) for q in data['exercises'])==50
for r in figures+question_figures:
    assert (ROOT/r['image']).is_file(),r['id']
    x0,y0,x1,y1=r['crop']
    assert 0<=x0<x1<=1 and 0<=y0<y1<=1,r['id']
assert (ROOT/'index.html').stat().st_size == manifest['html_bytes']
print('PASS: 9 chapters, 55 exercise pages, 12 challenges, 24 quizzes, 39 key formula groups, 76 theory figures, 50 question diagrams, 525 indexed source pages, embedded assets')
