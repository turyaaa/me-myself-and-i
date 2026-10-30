from pathlib import Path
import json,re

# index.html remains the complete standalone deliverable. Run this after editing
# the readable feature files, then run npm test.
p=Path('index.html');s=p.read_text(encoding='utf-8')
a=s.index('  .bdivider');b=s.index('</style>',a)
s=s[:a]+Path('blitz.css').read_text(encoding='utf-8')+'\n'+Path('daily.css').read_text(encoding='utf-8')+'\n'+s[b:]
for name,file in [('blitz','blitz-ui.html'),('daily','daily-ui.html')]:
 s=re.sub(r'<section id="'+name+r'" hidden>.*?</section>',lambda _:Path(file).read_text(encoding='utf-8').strip(),s,flags=re.S)
a=s.index('const TOPIC_OPTIONS=');b=s.index('const DAILY_BANK =',a)
s=s[:a]+Path('topics.js').read_text(encoding='utf-8')+'\n'+s[b:]
a=s.index('const DAILY_BANK =');b=s.index('// Daily puzzles are pinned',a)
s=s[:a]+'const DAILY_BANK = '+Path('daily-bank.json').read_text(encoding='utf-8')+';\nconst DAILY_SCHEDULE = '+Path('daily-schedule.json').read_text(encoding='utf-8')+';\n'+s[b:]
a=s.index('// Daily puzzles are pinned');b=s.index('// Blitz: the standalone HTML',a)
s=s[:a]+Path('daily.js').read_text(encoding='utf-8')+'\n'+s[b:]
a=s.index('// Blitz: the standalone HTML');b=s.index('\nshowHome();',a)
js=Path('blitz.js').read_text(encoding='utf-8').split("if(typeof location!=='undefined'){const invited=")[0]+'\n'+Path('matchmaking.js').read_text(encoding='utf-8')
s=s[:a]+js+s[b:];p.write_text(s,encoding='utf-8')
print('Feature copies synchronized into index.html.')
if Path('library.js').exists():
 import subprocess,sys
 subprocess.run([sys.executable,'sync-library.py'],check=True)
