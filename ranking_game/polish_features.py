from pathlib import Path
import re
def edit(file,old,new):
 p=Path(file);s=p.read_text(encoding='utf-8');assert old in s,(file,old[:70]);p.write_text(s.replace(old,new),encoding='utf-8')

labels='''function blitzLabels(values,unit){
 if(unit==='р.')return values.map(v=>String(v)+' р.');
 let shown=values,label=unit,precision=3;
 if(unit==='млн'||unit==='млрд'){precision=2;}
 else if(unit==='тис.'){
  const scale=Math.max(...values)>=1000?1000:1;
  shown=values.map(v=>v/scale);label=scale===1000?'млн':'тис.';precision=2;
 }
 let labels;
 do{labels=shown.map(v=>v.toLocaleString('uk-UA',{maximumFractionDigits:precision})+' '+label);precision++;}while(new Set(labels).size<values.length&&precision<=8);
 return labels;
}
'''
for file,end in [('blitz.js','function makeBlitzPlan()'),('netlify/lib/duel-core.mjs','export function makePlan')]:
 p=Path(file);s=p.read_text(encoding='utf-8');a=s.index('function blitzLabels(');b=s.index(end,a);s=s[:a]+labels+'\n'+s[b:];p.write_text(s,encoding='utf-8')
edit('blitz.js',"B.phase='end';stopBlitzClock();$('bnext').hidden=true;$('breplay').hidden=false;rememberDuel(null);", "B.phase='cancelled';closeBlitzOutcome();stopBlitzClock();$('bnext').hidden=true;$('breplay').hidden=false;$('breplay').disabled=false;$('breplay').textContent='Зіграти ще раз';rememberDuel(null);")
edit('blitz.js',"if(data.phase==='cancelled'){stopBlitzClock();", "if(data.phase==='cancelled'){closeBlitzOutcome();stopBlitzClock();")
edit('blitz.js',"B?.phase==='waiting'?1800:1000", "['waiting','end'].includes(B?.phase)?1800:1000")
p=Path('daily.css');s=p.read_text(encoding='utf-8');s+='''
  #mode-daily { padding-right:150px; min-height:190px; }
  #mode-daily::after { content:""; position:absolute; right:24px; top:28px; width:100px; height:100px; border-radius:50%; background:conic-gradient(#e58a9b 0 38%,#5b96e5 38% 66%,#f2c85b 66% 84%,#8d8d96 84%); box-shadow:0 8px 28px #0002; }
  @media(max-width:420px){#mode-daily{padding-right:100px;}#mode-daily::after{width:64px;height:64px;right:20px;top:28px;}}
''';p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8');a=s.index('const TOPIC_OPTIONS=');b=s.index('const DAILY_BANK =',a);s=s[:a]+Path('topics.js').read_text(encoding='utf-8')+'\n'+s[b:]
a=s.index('// Daily puzzles are pinned');b=s.index('\n// Blitz:',a);s=s[:a]+Path('daily.js').read_text(encoding='utf-8')+s[b:]
a=s.index('  #mode-daily {');b=s.index('</style>',a);s=s[:a]+Path('daily.css').read_text(encoding='utf-8')+'\n'+s[b:]
s=s.replace("store.set('ranking_points',Number(store.get('ranking_points')||0)+G.score);", "if(!G.pointsSaved){store.set('ranking_points',Number(store.get('ranking_points')||0)+G.score);G.pointsSaved=true;}")
p.write_text(s,encoding='utf-8')
