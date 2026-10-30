from pathlib import Path
import re,json

def edit(file,old,new):
 p=Path(file);s=p.read_text(encoding='utf-8');assert old in s,(file,old[:90]);p.write_text(s.replace(old,new),encoding='utf-8')

# Mark existing records without moving or deleting their content.
p=Path('index.html');s=p.read_text(encoding='utf-8');raw=s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0];groups=json.loads(raw)
patterns={
 'potter':r'Гаррі Поттер|Філософський камінь|Таємна кімната|В’язень Азкабану|Келих вогню|Орден Фенікса|Напівкровний Принц|Смертельні реліквії',
 'starwars':r'Зоряні війни|Star Wars', 'lotr':r'Володар перснів|Гобіт','marvel':r'Месники|Залізна людина|Чорна пантера|Людина-павук|Доктор Стрендж|Вартові галактики',
 'rock':r'The Beatles|John Lennon|Queen|Pink Floyd|Led Zeppelin|AC/DC|Nirvana|Metallica|Guns N|Eagles|Fleetwood Mac|Леннон|Фредді|Мік Джаггер|Lordi|U2|Oasis|Radiohead|Coldplay|Linkin Park',
 'rap':r'Eminem|Tupac|2Pac|Kendrick|Drake|Kanye|Jay.Z|Snoop|50 Cent|Емінем|Тупак',
 'pop':r'Michael Jackson|Madonna|Taylor Swift|Adele|ABBA|BTS|Billie Eilish|Dua Lipa|Beyonc|Lady Gaga|Джексон|Мадонна|Селін Діон|Мадонн|Біллі Айліш|Елвіс',
 'jazz':r'Miles Davis|Louis Armstrong|Луї Армстронг|Ella Fitzgerald|Дюк Еллінгтон|John Coltrane|Nina Simone'
}
for g in groups:
 if g['name'] in ['Фільми','Музика']:
  for c in g['cats']:
   c['topicFamily']=g['name']
   for it in c['items']:
    tags=[k for k,v in patterns.items() if re.search(v,it[0],re.I)];it.append(tags)
s=s.replace(raw,json.dumps(groups,ensure_ascii=False))
marker='// Blitz: the standalone HTML'
topics="const TOPIC_MATCHERS={"+','.join(json.dumps(k)+':new RegExp('+json.dumps(v,ensure_ascii=False)+",'i')" for k,v in patterns.items())+"};\n"+Path('topics.js').read_text(encoding='utf-8')
daily='const DAILY_BANK = '+Path('daily-bank.json').read_text(encoding='utf-8')+';\n'+Path('daily.js').read_text(encoding='utf-8')
s=s.replace(marker,topics+'\n'+daily+'\n'+marker)
ui=Path('daily-ui.html').read_text(encoding='utf-8')+'''\n<section id="topic-picker" hidden><h2 class="title" id="topic-title"></h2><p class="sub">Обери добірки або грай у все разом.</p><div id="topic-options" class="topic-options"></div><p class="sub" id="topic-note"></p><button class="wbtn" id="topic-start">Почати гру</button><button class="wbtn alt" id="topic-back">Назад</button></section>\n'''
s=s.replace('<section id="blitz" hidden>',ui+'<section id="blitz" hidden>')
s=s.replace('<button class="mode" id="mode-rank">','''<button class="mode daily-card" id="mode-daily"><span class="daily-badge">DAILY EDITION</span><span class="mt">Поділи світ</span><small id="daily-card-state">Три розподіли. Одна спроба на день.</small><span class="daily-card-footer"><span>Наступний набір через <b id="daily-card-clock">—</b></span><span>00:00 · Київ</span></span></button>
    <button class="mode" id="mode-rank">''')
s=s.replace('</style>',Path('daily.css').read_text(encoding='utf-8')+'\n</style>')
s=s.replace('  const base = QUIZ.map(c =>','  const base = topicQuiz(quizSelection).map(c =>')
s=s.replace('  opt("Стандартні", QUIZ.length', '''  const filterRow=document.createElement('div');filterRow.className='topic-options';
  [['Фільми','Добірки кіно'],['Музика','Жанри музики']].forEach(([name,label])=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>openTopicPicker(GROUPS.find(g=>g.name===name),'quiz');filterRow.append(b);});
  if(quizSelection){const reset=document.createElement('button');reset.textContent='Скинути: '+quizSelection.family;reset.onclick=()=>{quizSelection=null;openQuiz();};filterRow.append(reset);}
  box.append(filterRow);
  opt(quizSelection?'Обрані добірки':'Стандартні', topicQuiz(quizSelection).length''')
p.write_text(s,encoding='utf-8')

# Balanced distractors: prefer plausible scale, enforce a useful minimum separation.
helper='''function blitzValues(items,answer,year=false){
 const pool=[...new Set(items.map(i=>i[1]))].filter(v=>v!==answer);
 const distance=v=>year?Math.abs(v-answer):Math.abs(Math.log(v/answer));
 const nearby=pool.filter(v=>year?Math.abs(v-answer)>=3:(v/answer>=.3&&v/answer<=3.5&&Math.abs(v-answer)/answer>=.18));
 const selected=shuffle(nearby).slice(0,3);
 for(const v of pool.slice().sort((a,b)=>distance(a)-distance(b)))if(selected.length<3&&!selected.includes(v))selected.push(v);
 return shuffle([answer,...selected]);
}
function blitzLabels(values,unit){
 if(unit==='р.')return values.map(String).map(v=>v+' р.');
 const units=['тис.','млн','млрд'];let factor=1,label=unit;
 if(unit==='тис.'){factor=1000;label='';}else if(unit==='млн'){factor=1e6;label='';}else if(unit==='млрд'){factor=1e9;label='';}
 if(!label){const smallest=Math.min(...values)*factor;const scale=smallest>=1e9?1e9:smallest>=1e6?1e6:smallest>=1000?1000:1;label=scale===1?'':units[[1000,1e6,1e9].indexOf(scale)];return values.map(v=>(v*factor/scale).toLocaleString('uk-UA',{maximumFractionDigits:2})+(label?' '+label:''));}
 return values.map(v=>v.toLocaleString('uk-UA',{maximumFractionDigits:3})+' '+unit);
}
'''
edit('blitz.js','function makeBlitzPlan() {',helper+'\nfunction makeBlitzPlan() {')
edit('blitz.js',"const item=shuffle(cat.items)[0], other=shuffle([...new Set(cat.items.map(i=>i[1]))].filter(v=>v!==item[1])).slice(0,3);\n    const values=shuffle([item[1],...other]);", "const item=shuffle(cat.items)[0], values=blitzValues(cat.items,item[1],cat.unit==='р.');")
edit('blitz.js',"options:values.map(v=>fv(cat,v)+' '+cat.unit)","options:blitzLabels(values,cat.unit)")
edit('netlify/lib/duel-core.mjs','export function makePlan(bank){',helper+"\nexport function makePlan(bank,previous=[]){")
edit('netlify/lib/duel-core.mjs','const [prompt,answer]=shuffle(c.items)[0];\n    const values=shuffle([answer,...shuffle([...new Set(c.items.map(i=>i[1]))].filter(v=>v!==answer)).slice(0,3)]);',"const fresh=c.items.filter(i=>!previous.some(q=>q.category===c.title&&q.prompt===i[0]));\n    const [prompt,answer]=shuffle(fresh.length?fresh:c.items)[0];\n    const values=blitzValues(c.items,answer,c.unit==='р.');")
edit('netlify/lib/duel-core.mjs',"options:values.map(v=>format(v,c.unit)+' '+c.unit)","options:blitzLabels(values,c.unit)")
edit('netlify/lib/duel-core.mjs','function actionOnRoom(room,who,input,now){','function actionOnRoom(room,who,input,now,bank){')
edit('netlify/lib/duel-core.mjs','changed=actionOnRoom(room,who,input,now);','changed=actionOnRoom(room,who,input,now,bank);')
edit('netlify/lib/duel-core.mjs',"if(input.action==='state')return changed;", """if(input.action==='state')return changed;
  if(['answer','ready','rematch'].includes(input.action)&&(input.match!==undefined||room.match>1)&&input.match!==(room.match||1))return changed;
  if(input.action==='rematch'){
    if(room.phase!=='end')return changed;
    room.rematch=room.rematch||[];
    if(!room.rematch.includes(who.id)){room.rematch.push(who.id);changed=true;}
    if(room.rematch.length===2){const previous=room.plan;room.plan=makePlan(bank,previous);room.match=(room.match||1)+1;room.phase='waiting';room.round=0;room.answers=[];room.ready=[];room.rematch=[];room.players.forEach(p=>p.score=0);room.expires=now+LIFE;beginRound(room,now);}
    return changed;
  }""")
edit('netlify/lib/duel-core.mjs',"if(!['end','cancelled'].includes(room.phase))", "if(room.phase!=='cancelled')")
edit('netlify/lib/duel-core.mjs',"players:room.players.map(p=>({name:p.name,score:p.score,you:p.id===who.id})),", "match:room.match||1,rematch:(room.rematch||[]).includes(who.id),\n    players:room.players.map(p=>({name:p.name,score:p.score,you:p.id===who.id,ready:room.ready.includes(p.id),rematch:(room.rematch||[]).includes(p.id)})),")
edit('blitz.js',"['end','cancelled'].includes(B.phase)","['cancelled'].includes(B.phase)")
edit('blitz.js',"room:B.room,token:B.token,...extra", "room:B.room,token:B.token,match:B.snapshot.match||1,...extra")
edit('blitz.js',"previous.round!==data.round||previous.phase!==data.phase", "previous.round!==data.round||previous.phase!==data.phase||previous.match!==data.match")
edit('blitz.js',"B.snapshot=data;B.phase=data.phase;", "if(previous&&previous.match!==data.match)closeBlitzOutcome();\n  B.snapshot=data;B.phase=data.phase;")
edit('blitz.js',"$('breplay').hidden=false;rememberDuel(null);\n    if(changed)showBlitzOutcome(data.players);", """$('breplay').hidden=false;$('breplay').textContent=data.rematch?'Очікуємо реваншу…':'Реванш';$('breplay').disabled=!!data.rematch;
    $('boutcome-replay').textContent=data.rematch?'Очікуємо суперника…':'Реванш';$('boutcome-replay').disabled=!!data.rematch;
    if(changed)showBlitzOutcome(data.players);""")
edit('blitz.js',"$('breplay').onclick=showBlitzSetup;", "$('breplay').onclick=()=>B?.online&&B.phase==='end'?duelAction('rematch'):showBlitzSetup();")
edit('blitz.js',"$('boutcome-replay').onclick=()=>{closeBlitzOutcome();showBlitzSetup();};", "$('boutcome-replay').onclick=()=>duelAction('rematch');")
edit('blitz.js',"$('bresume').hidden=!savedDuel();", "$('bresume').hidden=!savedDuel();$('breplay').disabled=false;$('breplay').textContent='Зіграти ще раз';")
edit('blitz.js',"name.textContent=p.name;score.textContent=p.score;", "name.textContent=p.name+(p.ready?' · Готовий ✓':p.rematch?' · Реванш ✓':'');score.textContent=p.score;")
# Ensure new games and cancelled states have an enabled generic restart button.
edit('blitz.js',"$('breplay').hidden=false;rememberDuel(null);return;", "$('breplay').hidden=false;$('breplay').disabled=false;$('breplay').textContent='Зіграти ще раз';rememberDuel(null);return;")
