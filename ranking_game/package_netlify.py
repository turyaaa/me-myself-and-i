from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json,re,hashlib
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
assert html==(root/'dist/index.html').read_text(encoding='utf-8'), 'Run the build first'
ids=re.findall(r'\bid="([^"<>]+)"',html)
# Only markup IDs: script strings legitimately construct repeated dynamic IDs.
markup=html.split('<script>')[0]
ids=re.findall(r'\bid="([^"<>]+)"',markup)
assert len(ids)==len(set(ids)), 'Duplicate HTML IDs'
for name in ['test-results.json','duel-test-results.json','matchmaking-test-results.json','matchmaking-client-test-results.json']:
 json.loads((root/name).read_text(encoding='utf-8-sig'))
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.html','.js','.css','.json','.mjs','.cjs','.py','.sql','.md','.toml','.ico','.webmanifest'}]
files+=[root/'.gitignore']
files+=[p for p in (root/'assets').rglob('*') if p.is_file()]
files+=[p for p in (root/'netlify').rglob('*.mjs') if p.name!='question-bank.mjs']
files=sorted(set(files))
target=root/'ranking-game-netlify.zip'
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
 for p in files:archive.write(p,p.relative_to(root).as_posix())
with ZipFile(target) as archive:
 assert archive.testzip() is None
 assert len(archive.namelist())==len(set(archive.namelist()))
 assert archive.read('index.html').decode('utf-8').replace('\r\n','\n')==html
 assert 'netlify/functions/matchmaking.mjs' in archive.namelist()
print(json.dumps({'archive':target.name,'files':len(files),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
