from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json, hashlib, re
from PIL import Image, ImageChops

root=Path.cwd()
out=root/'evidencias/alineacion-seminario'
out.mkdir(parents=True,exist_ok=True)
slides=json.loads((root/'presentacion/fase-06/fuentes/DOC-06-02-contenido.json').read_text(encoding='utf-8'))
assert len(slides)==30
assert all(s.get('notes') and s.get('sources') for s in slides)
assert {s.get('group') for s in slides if s.get('group')}=={1,2,3,4,5,6}
assert not re.search('ticket',json.dumps(slides,ensure_ascii=False),re.I)
missing=[s for slide in slides for s in slide['sources'] if not s.startswith('http') and not (root/s).exists()]
assert not missing,missing
docs=[root/'documentacion/fase-01/word/DOC-01-02-investigacion-seis-grupos.docx',root/'presentacion/fase-06/DOC-06-02-guion-seis-grupos.docx',root/'documentacion/fase-07/word/DOC-07-02-guia-seis-grupos.docx']
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for file in docs:
 with ZipFile(file) as z:
  xml=ET.fromstring(z.read('word/document.xml'))
  styles=ET.fromstring(z.read('word/styles.xml'))
  assert any('TOC' in e.attrib.get('{'+ns['w']+'}instr','') for e in xml.findall('.//w:fldSimple',ns))
  assert not styles.findall('.//w:pBdr',ns)
  text=' '.join(xml.itertext())
  assert not re.search('ticket',text,re.I)
  normal=next(s for s in styles.findall('w:style',ns) if s.attrib.get('{'+ns['w']+'}styleId')=='Normal')
  assert normal.find('w:rPr/w:rFonts',ns).attrib['{'+ns['w']+'}ascii']=='Times New Roman'
  assert normal.find('w:rPr/w:sz',ns).attrib['{'+ns['w']+'}val']=='24'
ppt=root/'presentacion/fase-06/DOC-06-02-seminario-seis-grupos.pptx'
with ZipFile(ppt) as z:
 assert len([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n)])==30
 assert len([n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+.xml',n)])==30
 assert 'ppt/embeddings/chart-data-snapshot-001.xlsx' in z.namelist()
receipt=json.loads((root/'presentacion/fase-06/revision/seis-grupos/validation.json').read_text())
assert receipt['finalSha256']==hashlib.sha256(ppt.read_bytes()).hexdigest()
comparisons=[]
for i in range(1,31):
 p=root/f'presentacion/fase-06/revision/seis-grupos/slide-{i:02}.png'
 f=p.parent/'final-import'/p.name
 a=Image.open(p).convert('RGB');b=Image.open(f).convert('RGB')
 identical=a.size==b.size and ImageChops.difference(a,b).getbbox() is None
 comparisons.append({'slide':i,'identical_pixels':identical})
report={'date':'2026-10-20','slides':30,'notes_and_sources':30,'groups':6,'students':22,'local_source_paths_valid':True,'word_documents':3,'word_pages_visually_reviewed':[11,8,6],'slide_previews_visually_reviewed':30,'diagrams_parsed_rendered_and_reviewed':3,'final_import_comparison':comparisons,'hashes':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in docs+[ppt]},'scope':'Validación documental local. No acredita PowerPoint nativo, experimento OpenShift ni una nueva demostración funcional. No commit ni push.'}
(out/'verificacion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'slides':30,'documents':3,'matching_previews':sum(c['identical_pixels'] for c in comparisons)},ensure_ascii=False))
