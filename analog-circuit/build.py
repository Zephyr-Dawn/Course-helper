"""Build the public, self-contained revision site without full source slides."""
from pathlib import Path
import base64, html, io, json, re, sys, zipfile
from html.parser import HTMLParser
import markdown

ROOT=Path(__file__).resolve().parent
WORK=ROOT.parent.parent
META=[
('电路基本概念','物理量、参考方向、元件约束、网络拓扑与基尔霍夫定律',77),
('系统分析方法','电阻等效、Δ–Y 变换、节点电压法与网孔电流法',51),
('线性电路定理','叠加、电源变换、端口等效、最大功率与电桥',51),
('运算放大器','放大器模型、负反馈、差分、仪表放大器与 DAC',56),
('电容与电感','储能、初始状态、串并联、积分器与微分器',42),
('一阶动态电路','零输入、奇异函数、阶跃、三要素法与多阶段换路',60),
('二阶动态电路','初始导数、特征根、阻尼、串并联 RLC 与一般网络',62),
('正弦稳态分析','复数、相量、复阻抗与交流电路系统分析',65),
('频率响应与滤波','零极点、波特图、谐振、无源/有源滤波与 Sallen–Key',61)]

class Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]
    def handle_data(self,d):self.parts.append(d)
def plain(s):
    p=Text();p.feed(s);return re.sub(r'\s+',' ',' '.join(p.parts)).strip()

def md(s):
    math=[]
    def protect(m):
        raw=m.group();display=raw.startswith('$$');tex=raw[2:-2] if display else raw[1:-1]
        token=f'MATHPLACEHOLDER{len(math):06}END'
        math.append((token,tex.strip(),display));return '\n\n'+token+'\n\n' if display else token
    s=re.sub(r'\$\$[\s\S]*?\$\$|\$(?!\$)[^\n$]+?\$',protect,s)
    out=markdown.markdown(s,extensions=['tables','fenced_code','sane_lists'])
    for token,tex,display in math:
        tag='div' if display else 'span';cl='math-display' if display else 'math-inline'
        val=f'<{tag} class="{cl}" data-tex="{html.escape(tex,quote=True)}">{html.escape(tex)}</{tag}>'
        out=out.replace('<p>'+token+'</p>',val) if display else out.replace(token,val)
    return out

def data_uri(p):
    ext=p.suffix.lower();mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'}.get(ext,'application/octet-stream')
    return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()

def illustrated(body,records):
    """Place source diagrams next to their matching definitions and derivations."""
    anchors={}
    for r in records:anchors.setdefault(r['anchor'],[]).append(r)
    for anchor,items in anchors.items():
        matches=[m for m in re.finditer(r'<h[23]>(.*?)</h[23]>',body,re.S) if plain(m.group(1)).startswith(anchor)]
        if len(matches)!=1:raise ValueError(f'Figure anchor must be unique: {anchor!r}, found {len(matches)}')
        h=matches[0];following=body[h.end():]
        paragraph=re.match(r'\s*<p>.*?</p>',following,re.S)
        at=h.end()+(paragraph.end() if paragraph else 0)
        figures=[]
        for r in items:
            src=data_uri(ROOT/r['image']);caption=html.escape(r['caption']);fid=r['id']
            figures.append(f'<figure class="course-figure" id="fig-{fid}" data-course-figure="{fid}"><div class="figure-source">课件插图 · {html.escape(r["source"])}</div><button class="figure-open" data-open-figure aria-label="放大：{caption}"><img src="{src}" alt="{caption}" loading="eager" decoding="async"></button><figcaption><strong>图 {fid[1:].replace("-",".")}</strong>　{caption}<span class="zoom-hint">点击图片可放大</span></figcaption></figure>')
        body=body[:at]+''.join(figures)+body[at:]
    return body

def render_source_pages():
    import pymupdf as fitz
    from PIL import Image
    ranges={1:(73,77),2:(47,51),3:(45,51),4:(51,56),5:(37,42),6:(55,60),7:(57,62),8:(59,65),9:(55,61)}
    for n,(a,b) in ranges.items():
        source=next(WORK.glob(f'EC2026-lec{n}-*.pdf'));doc=None
        for page in range(a,b+1):
            dest=ROOT/'assets/exercises'/f'L{n}-P{page}.webp'
            if dest.exists():continue
            if doc is None:doc=fitz.open(source)
            p=doc[page-1];pix=p.get_pixmap(matrix=fitz.Matrix(1550/p.rect.width,1550/p.rect.width),alpha=False)
            Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(dest,format='WEBP',quality=90,method=4)

def main():
    draft='--draft' in sys.argv
    chapters=[];search=[];count=0
    figures=json.loads((ROOT/'content/figures.json').read_text(encoding='utf-8'))
    question_figures={r['id']:r for r in json.loads((ROOT/'content/question-figures.json').read_text(encoding='utf-8'))}
    for n,(title,subtitle,pages) in enumerate(META,1):
        p=ROOT/'content'/f'ch{n:02}.md'
        if not p.exists():
            if draft:continue
            raise FileNotFoundError(p)
        source=p.read_text(encoding='utf-8');count+=len(source);body=md(source);body=re.sub(r'^<h1>.*?</h1>\s*','',body,count=1,flags=re.S)
        body=illustrated(body,[r for r in figures if r['chapter']==n])
        cid=f'ch{n:02}';idx=[0]
        def heading(m):idx[0]+=1;return f'<h2 id="{cid}-s{idx[0]:02}">{m.group(1)}</h2>'
        body=re.sub(r'<h2>(.*?)</h2>',heading,body,flags=re.S)
        secs=[]
        for part in re.split(r'(?=<h2 id=)',body):
            h=re.match(r'<h2 id="([^"]+)">(.*?)</h2>',part,re.S)
            if not h:continue
            sid,stitle=h.group(1),plain(h.group(2));text=plain(part)
            secs.append({'id':sid,'chapter':n,'title':stitle,'text':text})
            search.append({'id':sid,'title':f'第 {n} 讲 · {stitle}','text':text})
        chapters.append({'id':cid,'n':n,'title':title,'navTitle':title,'subtitle':subtitle,'pages':pages,'html':body,'sections':secs})
    # Quick reference is editorial content, never a substring of illustrated HTML.
    # Slicing HTML can start inside a data-URI attribute and expose image markup.
    sections={s['id'] for c in chapters for s in c['sections']}
    all_formulas=[]
    for record in json.loads((ROOT/'content/key-formulas.json').read_text(encoding='utf-8')):
        if draft and record['section'] not in sections:continue
        if record['section'] not in sections:raise ValueError(f'Unknown formula source: {record["id"]}')
        if any(s not in sections for s in record.get('related_sections',[])) and not draft:
            raise ValueError(f'Unknown related formula source: {record["id"]}')
        item=dict(record)
        for key in ('use','conditions','pitfall'):
            if not item.get(key):raise ValueError(f'Missing formula {key}: {item["id"]}')
            item[key+'Html']=md(item[key])
        all_formulas.append(item)
    exercises=[]
    for path in sorted((ROOT/'content').glob('exercises-*.json'))+sorted((ROOT/'content').glob('challenges.json')):
        for record in json.loads(path.read_text(encoding='utf-8')):
            e=dict(record)
            if e['id'] in question_figures:e['questionImage']=data_uri(ROOT/question_figures[e['id']]['image'])
            for key in ['question','solution','answer','checks']:e[key+'Html']=md(str(e.get(key,'')))
            e['hintsHtml']=[md(h) for h in e.get('hints',[])]
            if e.get('image'):e['image']=str(ROOT/e['image'])
            if e.get('image') and Path(e['image']).exists():e['image']=data_uri(Path(e['image']))
            elif e.get('image'):raise FileNotFoundError(e['image'])
            exercises.append(e);search.append({'id':'ex-'+e['id'],'title':e['id']+' · '+e['title'],'text':plain(e['questionHtml']+' '+e['solutionHtml'])})
    quizzes=json.loads((ROOT/'content/quizzes.json').read_text(encoding='utf-8')) if (ROOT/'content/quizzes.json').exists() else []
    data={'chapters':chapters,'exercises':exercises,'formulas':all_formulas,'search':search,'quizzes':quizzes,'stats':{'contentChars':count,'coursePages':525,'theoryFigures':len(figures),'questionFigures':len(question_figures)}}
    css=(ROOT/'assets/katex/katex.min.css').read_text(encoding='utf-8')
    # KaTeX font declarations list several formats; embed woff2 and remove other alternatives.
    def font(m):
        url=m.group(1).strip('"\'');p=ROOT/'assets/katex'/url
        if p.exists():return 'url('+data_uri(p)+')'
        woff2=p.with_suffix('.woff2')
        if woff2.exists():return 'url('+data_uri(woff2)+')'
        raise FileNotFoundError(p)
    css=re.sub(r'url\(([^)]+)\)',font,css)
    source=(ROOT/'src/shell.html').read_text(encoding='utf-8')
    repl={'/*KATEX_CSS*/':css,'/*APP_CSS*/':(ROOT/'src/style.css').read_text(encoding='utf-8'),'/*COURSE_DATA*/':json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\/'),'/*KATEX_JS*/':(ROOT/'assets/katex/katex.min.js').read_text(encoding='utf-8').split('//# sourceMappingURL=')[0],'/*MODELS_JS*/':(ROOT/'src/models.js').read_text(encoding='utf-8'),'/*LABS_JS*/':(ROOT/'src/labs.js').read_text(encoding='utf-8'),'/*APP_JS*/':(ROOT/'src/app.js').read_text(encoding='utf-8')}
    for token,value in repl.items():source=source.replace(token,value)
    dest=ROOT/'index.html';dest.write_text(source,encoding='utf-8',newline='\n')
    (ROOT/'build-manifest.json').write_text(json.dumps({'edition':'public-web','source_page_images':0,'chapters':len(chapters),'sections':len(search)-len(exercises),'exercise_pages':sum(bool(e.get('page')) for e in exercises),'challenges':sum(bool(e.get('url')) for e in exercises),'formulas':len(all_formulas),'formula_selection':'manual-key-formulas','lecture_display_formulas':sum(c['html'].count('class="math-display"') for c in chapters),'quizzes':len(quizzes),'theory_figures':len(figures),'question_figures':len(question_figures),'content_characters':count,'html_bytes':dest.stat().st_size,'draft':draft},ensure_ascii=False,indent=2),encoding='utf-8')
    print((ROOT/'build-manifest.json').read_text(encoding='utf-8'))
    print(dest)

if __name__=='__main__':
    if '--render-pages' in sys.argv:render_source_pages()
    main()
