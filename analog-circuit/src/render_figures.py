"""Extract selected diagrams from original lecture PDFs, preserving their labels.

The delivered assets are already rendered. Re-run only when source crops change.
"""
from pathlib import Path
import json, io, math
import pymupdf as fitz
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parents[1]

def main():
    docs = {}
    records = json.loads((ROOT/'content/figures.json').read_text(encoding='utf-8'))
    records += json.loads((ROOT/'content/question-figures.json').read_text(encoding='utf-8'))
    for item in records:
        n = item['chapter']
        if n not in docs:
            docs[n] = fitz.open(next(WORK.glob(f'EC2026-lec{n}-*.pdf')))
        page = docs[n][item['page']-1]
        if item.get('panels'):
            panels=[]
            infos=page.get_image_info(xrefs=True)
            for bounds in item['panels']:
                target=fitz.Rect(bounds)
                def overlap(info):
                    box=fitz.Rect(info['bbox'])
                    return (box&target).get_area()/(box|target).get_area()
                info=max(infos,key=overlap)
                if overlap(info)<.8:raise ValueError(f'Embedded figure mismatch: {item["id"]}')
                panels.append(Image.open(io.BytesIO(docs[n].extract_image(info['xref'])['image'])).convert('RGB'))
            layout=item.get('layout','horizontal')
            if len(panels)==1:im=panels[0]
            elif layout=='grid3':
                im=Image.new('RGB',(1500,420*math.ceil(len(panels)/3)),'white')
                for i,panel in enumerate(panels):
                    panel=ImageOps.contain(panel,(470,390),Image.Resampling.LANCZOS)
                    im.paste(panel,(i%3*500+(500-panel.width)//2,i//3*420+(420-panel.height)//2))
            elif layout=='vertical':
                width=min(800,max(p.width for p in panels));panels=[p.resize((width,round(p.height*width/p.width)),Image.Resampling.LANCZOS) for p in panels]
                im=Image.new('RGB',(width,sum(p.height for p in panels)+25*(len(panels)-1)),'white');y=0
                for p in panels:im.paste(p,(0,y));y+=p.height+25
            else:
                height=min(420,max(p.height for p in panels));panels=[p.resize((round(p.width*height/p.height),height),Image.Resampling.LANCZOS) for p in panels]
                im=Image.new('RGB',(sum(p.width for p in panels)+25*(len(panels)-1),height),'white');x=0
                for p in panels:im.paste(p,(x,0));x+=p.width+25
        else:
            x0,y0,x1,y1 = item['crop']
            clip = fitz.Rect(x0*page.rect.width,y0*page.rect.height,x1*page.rect.width,y1*page.rect.height)
            pix = page.get_pixmap(matrix=fitz.Matrix(2.6,2.6),clip=clip,alpha=False)
            im = Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
        im.thumbnail((1600,1450),Image.Resampling.LANCZOS)
        dest = ROOT/item['image'];dest.parent.mkdir(parents=True,exist_ok=True)
        im.save(dest,'WEBP',quality=94,method=5)
    print(f'Rendered {len(records)} cropped course figures.')

if __name__ == '__main__': main()
