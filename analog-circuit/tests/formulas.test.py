"""Guard the formula quick reference against markup leaks and example dumping."""
from pathlib import Path
import json, re

ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'index.html').read_text(encoding='utf-8')
data=json.loads(re.search(r'<script type="application/json" id="course-data">(.*?)</script>',source,re.S).group(1))
cards=data['formulas']
leaks=[x for x in cards if re.search(r'data:image|base64|loading=|decoding=|alt=',x.get('context',''))]
assert not leaks,f'{len(leaks)} formula notes expose image markup fragments'
curated=json.loads((ROOT/'content/key-formulas.json').read_text(encoding='utf-8'))
assert len(cards)==len(curated)==39,'Quick reference must contain only the selected general formula cards'
assert len({x['id'] for x in cards})==39
assert len({x['title'] for x in cards})==39
sections={s['id'] for c in data['chapters'] for s in c['sections']}
for built,original in zip(cards,curated):
    assert built['tex']==original['tex'] and built['title']==original['title']
    assert built['section'] in sections
    assert all(s in sections for s in built.get('related_sections',[]))
    assert 'context' not in built,'Do not reintroduce the HTML-fragment excerpt'
    for key in ('use','conditions','pitfall'):
        assert built[key] and built[key+'Html']
        assert all(ord(c)>=32 for c in built[key]),f'Control character in {built["id"]} {key}'
        assert not re.search(r'data:image|base64|loading=|decoding=|<img',built[key+'Html'])
    assert not re.search(r'4600|7\.3692|3\.15108|49\.50495|\b2000t',built['tex']),built['id']
assert {x['chapter'] for x in cards}==set(range(1,10))
print('PASS: 39 curated cards; nine lectures; valid source links; structured notes; no image-markup leaks or copied numerical examples')
