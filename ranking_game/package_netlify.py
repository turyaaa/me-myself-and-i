from pathlib import Path
import zipfile,re
from html.parser import HTMLParser
root=Path.cwd()
files=['index.html','package.json','netlify.toml','build.mjs','.gitignore','README.md','verify-game.cjs','test-duel.cjs','test-results.json','duel-test-results.json','fact-check.md','blitz.js','blitz.css','blitz-ui.html','netlify/lib/duel-core.mjs','netlify/functions/duel.mjs','netlify/functions/cleanup-duels.mjs']
class IDs(HTMLParser):
 def __init__(self):super().__init__();self.ids=[]
 def handle_starttag(self,tag,attrs):
  self.ids.extend(v for k,v in attrs if k=='id')
s=(root/'index.html').read_text(encoding='utf-8');parser=IDs();parser.feed(s)
assert len(parser.ids)==len(set(parser.ids)), 'Duplicate element IDs'
assert 'body.wide.home-view' not in s
assert s.count('id="mode-blitz"')==1 and s.count('id="blitz"')==1
assert (root/'dist/index.html').read_text(encoding='utf-8')==s
with zipfile.ZipFile(root/'ranking-game-netlify.zip','w',zipfile.ZIP_DEFLATED) as out:
 for name in files:
  out.write(root/name,name)
print(f'GitHub-ready archive: {len(files)} files; HTML IDs unique; standalone and deployment HTML match.')
