"""Build a self-contained offline revision website from the maintained sources."""
from pathlib import Path
import sys,re,json,html,base64,hashlib
from html.parser import HTMLParser
import markdown

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'src'))
from figures import FIGURES,CAPTIONS

META=[
('预备知识','复数、辐角与根；复平面、点集和区域',27),
('解析函数','复导数、C-R、调和函数与初等函数分支',51),
('复变函数的积分','路径积分、柯西公式、估计与整函数',30),
('级数','幂级数、Taylor、零点与 Laurent 环域',39),
('留数','孤立奇点、留数计算与三类实积分',38),
('保角映射','区域变换、分式线性与规范化映射',40),
('拉普拉斯变换','正逆变换、时移卷积与方程求解',31)]

class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,d):self.parts.append(d)
def plain(s):
 p=Text();p.feed(s);return re.sub(r'\s+',' ',' '.join(p.parts)).strip()
def md(s):
 maths=[]
 def protect(m):
  raw=m.group();display=raw.startswith('$$');tex=raw[2:-2] if display else raw[1:-1];token=f'MATHPLACEHOLDER{len(maths):06}END';maths.append((token,tex.strip(),display));return '\n\n'+token+'\n\n' if display else token
 text=re.sub(r'\$\$[\s\S]*?\$\$|\$(?!\$)[^\n$]+?\$',protect,s)
 body=markdown.markdown(text,extensions=['tables','fenced_code','sane_lists'])
 for token,tex,display in maths:
  tag='div' if display else 'span';cl='math-display' if display else 'math-inline';node=f'<{tag} class="{cl}" data-tex="{html.escape(tex,quote=True)}">{html.escape(tex)}</{tag}>'
  body=body.replace('<p>'+token+'</p>',node) if display else body.replace(token,node)
 return body
def data_uri(p):
 mime={'.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.webp':'image/webp','.png':'image/png'}[p.suffix]
 return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
def load(name):return json.loads((ROOT/'content'/name).read_text(encoding='utf-8'))
def validate_source_characters():
 def walk(value,path):
  if isinstance(value,str) and re.search(r'[\x00-\x09\x0b\x0c\x0e-\x1f]',value):raise ValueError('Control character in '+path+'; check Python/JSON TeX escaping')
  if isinstance(value,list):
   for i,v in enumerate(value):walk(v,path+f'[{i}]')
  if isinstance(value,dict):
   for k,v in value.items():walk(v,path+'.'+k)
 for path in (ROOT/'content').iterdir():
  if path.suffix=='.json':walk(json.loads(path.read_text(encoding='utf-8')),path.name)
  elif path.suffix=='.md':walk(path.read_text(encoding='utf-8'),path.name)
def figure_html(key):
 if key not in FIGURES:raise ValueError('Unknown figure '+key)
 return '<figure><button class="figure-open" data-figure="'+key+'" aria-label="放大图示：'+html.escape(CAPTIONS[key],quote=True)+'">'+FIGURES[key]+'</button><figcaption>'+html.escape(CAPTIONS[key])+'<br>本站按数学关系绘制的静态示意图。<span class="figure-zoom-tip">点击图示可放大。</span></figcaption></figure>'

def build():
 validate_source_characters()
 chapters=[];search=[];coverage=[];source_chars=0
 for n,(title,subtitle,pages)in enumerate(META,1):
  cid=f'ch{n:02}';source=(ROOT/'content'/f'{cid}.md').read_text(encoding='utf-8');source_chars+=len(source)
  # Map the actual per-topic page citations, retaining their text and overlap.
  fragments=re.split(r'(?=^## )',source,flags=re.M);sections=[]
  for part in fragments:
   match=re.match(r'## ([^\n]+)',part)
   if not match:continue
   sid=f'{cid}-s{len(sections)+1:02}';stitle=match.group(1);citation=re.search(r'^> 讲义来源：([^\n]+)',part,re.M)
   if not citation:raise ValueError(f'{sid}: missing source citation')
   sections.append(dict(id=sid,title=stitle,text='',source=citation.group(1)))
  body=md(source);idx=[0]
  def h2(m):
   i=idx[0];idx[0]+=1;return f'<h2 id="{sections[i]["id"]}">{m.group(1)}</h2>'
  body=re.sub(r'<h2>(.*?)</h2>',h2,body,flags=re.S)
  body=re.sub(r'<p>\[\[FIG:([\w-]+)\]\]</p>',lambda m:figure_html(m.group(1)),body)
  if '[[FIG:'in body:raise ValueError('Unresolved figure '+cid)
  for part in re.split(r'(?=<h2 id=)',body):
   h=re.match(r'<h2 id="([^"]+)">(.*?)</h2>',part,re.S)
   if h:
    sec=next(x for x in sections if x['id']==h.group(1));sec['text']=plain(part)
    search.append(dict(id=sec['id'],title=f'第{n}章 · {sec["title"]}',text=sec['text'],preview=sec['text'][:140]))
  for page in range(1,pages+1):
   destinations=[]
   for sec in sections:
    # Coverage is chapter-level topical routing, not a sentence-by-sentence claim.
    first=sec['source'].split('；')[0]
    ranges=[(int(a),int(b or a))for a,b in re.findall(r'p(\d+)(?:[–—-](\d+))?',first)]
    if any(a<=page<=b for a,b in ranges):destinations.append(sec['id'])
   classification='正文专题（引用可能交叉重叠）'if destinations else ('课程封面/行政信息'if page==1 or (n==1 and page<=4)else '空白尾页（已核对原页，仅页码/底纹）')
   coverage.append(dict(chapter=n,page=page,sections=destinations,classification=classification))
  chapters.append(dict(id=cid,number=n,title=title,subtitle=subtitle,pages=pages,html=body,sections=sections))

 sources=load('sources.json');source_images={};
 for source in sources:source['path']=''
 exercises=load('exams-recent.json')+load('exams-20-22.json')
 exercises.sort(key=lambda e:(-int(e['yearKey']), int(re.search(r'\d+',e['number']).group())if re.search(r'\d+',e['number'])else 999,e['id']))
 for e in exercises:
  for field in ['question','hint','solution','answer','check']:
   if not e.get(field):raise ValueError(e['id']+' missing '+field)
   e[field+'Html']=md(e[field])
  e['sourceKey']=None  # Public edition keeps source labels, not original scans.
  search.append(dict(id='ex-'+e['id'],title=f'{e["year"]} · 原题{e["number"]} · {e["title"]}',text=e['question']+' '+e['title']+' '+e['year']+' '+e['tags'].__str__(),preview=plain(e['questionHtml'])[:150]))

 formulas=load('formulas-1-3.json')+load('formulas-4-7.json')
 for f in formulas:
  f['sectionId']=f'ch{f["chapter"]:02}-s{f["section"]:02}'
  if not any(f['sectionId']==s['id']for c in chapters for s in c['sections']):raise ValueError('Invalid formula anchor '+f['id'])
  for field in ['use','conditions','pitfall']:f[field+'Html']=md(f[field])
 quizzes=load('quizzes.json')
 for q in quizzes:
  for field in ['question','explanation']:q[field+'Html']=md(q[field])
  q['optionsHtml']=[md(x)for x in q['options']]
 years=[dict(key=key,title=label,count=sum(e['yearKey']==key for e in exercises))for key,label in [('2025','2025–2026'),('2024','2024–2025'),('2022','2022–2023'),('2021','2021–2022'),('2020','2020–2021（回忆卷）'),('2011','2011–2012')]]
 archive=[dict(year=y,questions=q,answers=a,note=note)for y,q,a,note in [('2021–2022','2–6','7–9','与独立卷重复；本站已解'),('2017–2018','10–14','15–18','原卷和原解见本地资料包'),('2015–2016','19–22','23–27','原卷和原解见本地资料包'),('2013–2014','28–32','33–36','原卷和原解见本地资料包'),('2012–2013','37–41','42–46','原卷和原解见本地资料包'),('2011–2012','47–51','52–54','选3道原缺答案题补全'),('2019–2020','55–60','无独立答案页','含讲义外拓展内容；见本地资料包')]]
 stats=dict(chapters=7,sections=sum(len(c['sections'])for c in chapters),lecturePages=256,paperPages=70,exercises=len(exercises),recentExercises=sum(e['yearKey']!='2011'for e in exercises),formulas=len(formulas),quizzes=len(quizzes),sourceChars=source_chars,sourceImages=len(source_images),figures=sum(c['html'].count('<figure>')for c in chapters))
 data=dict(chapters=chapters,exercises=exercises,formulas=formulas,quizzes=quizzes,years=years,sources=sources,sourceImages=source_images,archive=archive,figures=FIGURES,search=search,stats=stats,methodsHtml=md((ROOT/'content/methods.md').read_text(encoding='utf-8')))
 kcss=(ROOT/'assets/katex/katex.min.css').read_text(encoding='utf-8')
 # The portable asset set intentionally contains WOFF2 fonts only. Drop the
 # unused WOFF/TTF fallback URLs before embedding, and require each WOFF2 file.
 kcss=re.sub(r'src:url\(([^)]+\.woff2)\)[^}]*',lambda m:'src:url('+data_uri(ROOT/'assets/katex'/m.group(1).strip('"\''))+') format("woff2")',kcss)
 replacements={'/*KATEX_CSS*/':kcss,'/*APP_CSS*/':(ROOT/'src/style.css').read_text(encoding='utf-8'),'/*KATEX_JS*/':(ROOT/'assets/katex/katex.min.js').read_text(encoding='utf-8'),'/*COURSE_DATA*/':json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\/'),'/*APP_JS*/':(ROOT/'src/app.js').read_text(encoding='utf-8')}
 shell=(ROOT/'src/shell.html').read_text(encoding='utf-8')
 for key,val in replacements.items():
  if shell.count(key)!=1:raise ValueError('Shell marker '+key)
  shell=shell.replace(key,val)
 dest=ROOT/'复变函数与积分变换-全面复习.html';dest.write_text(shell,encoding='utf-8',newline='\n')
 manifest={**stats,'html':dest.name,'htmlBytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'sourceScope':'七章讲义 + 五份独立近年卷全题 + 旧汇编精选3题；原PDF和原页图仅在本地'}
 (ROOT/'build-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 (ROOT/'internal/page-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__':build()
