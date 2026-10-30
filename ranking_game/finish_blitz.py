from pathlib import Path
import json,zipfile
p=Path('index.html');s=p.read_text(encoding='utf-8')
start=s.index('// Blitz: the standalone HTML')
end=s.index('\nshowHome();\nif(typeof location',start)
js=Path('blitz.js').read_text(encoding='utf-8').split("if(typeof location!=='undefined'){const invited=")[0]
s=s[:start]+js+s[end:];p.write_text(s,encoding='utf-8')
quiz=json.JSONDecoder().raw_decode(s.split('const QUIZ = ',1)[1])[0]
bank=[]
for c in quiz:
 if c.get('blitz'):bank.append(dict(title=c['name'],kind='trivia',topicFamily=c.get('topicFamily'),items=[[q[0],q[1],[c.get('topicId')]] for q in c['qs']]))
groups=json.loads(s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0])
Path('netlify/lib/question-bank.mjs').write_text('// Generated private server bank.\nexport default '+json.dumps([c for g in groups for c in g['cats']]+bank,ensure_ascii=False)+';\n',encoding='utf-8')
Path('dist').mkdir(exist_ok=True);Path('dist/index.html').write_text(s,encoding='utf-8')
