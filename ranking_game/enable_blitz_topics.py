from pathlib import Path
import json
def edit(file,old,new):
 p=Path(file);s=p.read_text(encoding='utf-8');assert old in s,(file,old[:70]);p.write_text(s.replace(old,new),encoding='utf-8')
p=Path('blitz-ui.html');s=p.read_text(encoding='utf-8').replace('<button class="wbtn" id="bsolo">', '<div class="topic-options" id="blitz-topic-buttons"></div><p id="blitz-topic-label" class="sub"></p>\n    <button class="wbtn" id="bsolo">');p.write_text(s,encoding='utf-8')
plan='''function blitzPlan(cats,previous=[]){
 const eligible=shuffle(cats.filter(c=>new Set(c.items.map(i=>i[1])).size>=4)),chosen=[],seen=new Set();
 while(chosen.length<15){let added=false;
  for(const c of eligible){
   const available=c.items.filter(i=>!seen.has(c.title+'|'+i[0]));
   const fresh=available.filter(i=>!previous.some(q=>q.category===c.title&&q.prompt===i[0]));
   if(!available.length)continue;
   const item=shuffle(fresh.length?fresh:available)[0];seen.add(c.title+'|'+item[0]);
   const values=blitzValues(c.items,item[1],c.unit==='р.');
   chosen.push({id:c.title+'|'+item[0],category:c.title,prompt:item[0],options:blitzLabels(values,c.unit),correct:values.indexOf(item[1])});added=true;
   if(chosen.length===15)break;
  }if(!added)break;
 }return chosen;
}
'''
p=Path('blitz.js');s=p.read_text(encoding='utf-8');a=s.index('function makeBlitzPlan()');b=s.index('function renderBlitzPlayers',a);s=s[:a]+plan+"function makeBlitzPlan(){return blitzPlan(selectionCats(blitzSelection));}\n"+s[b:]
s=s.replace("$('bresume').hidden=!savedDuel();", "renderBlitzTopics();$('bresume').hidden=!savedDuel();")
s=s.replace("cleanupBlitz(); B={phase:'question',online:false,plan:makeBlitzPlan(),round:0,score:0};", "const plan=makeBlitzPlan();if(plan.length!==15){$('berror').textContent='Обери ширшу добірку: потрібно 15 різних питань.';return;}\n  cleanupBlitz(); B={phase:'question',online:false,plan,round:0,score:0};")
s=s.replace("name:$('bname').value.trim()||'Гравець',room", "name:$('bname').value.trim()||'Гравець',room,selection:blitzSelection")
s=s.replace("$('bsolo').onclick=startSoloBlitz;", """function renderBlitzTopics(){
 const box=$('blitz-topic-buttons');box.replaceChildren();
 [['','Усі теми'],['Фільми','Фільми'],['Музика','Музика'],['Аніме','Аніме']].forEach(([name,label])=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',name?blitzSelection?.family===name:!blitzSelection);b.onclick=()=>{if(!name){blitzSelection=null;renderBlitzTopics();}else if(name==='Аніме'){blitzSelection={family:name,ids:[]};renderBlitzTopics();}else openTopicPicker(GROUPS.find(g=>g.name===name),'blitz');};box.append(b);});
 $('blitz-topic-label').textContent=blitzSelection?blitzSelection.family+(blitzSelection.ids.length?' · '+blitzSelection.ids.map(id=>TOPIC_OPTIONS[blitzSelection.family].find(x=>x[0]===id)[1]).join(' + '):' · усе разом'):'Питання з усіх тем. У дуелі добірку обирає автор кімнати.';
}
$('bsolo').onclick=startSoloBlitz;""")
p.write_text(s,encoding='utf-8')
p=Path('netlify/lib/duel-core.mjs');s=p.read_text(encoding='utf-8');a=s.index('export function makePlan(');b=s.index('function settle(',a);s=s[:a]+plan+'''export function makePlan(bank,previous=[]){return blitzPlan(bank,previous).map(q=>({...q,id:crypto.randomUUID()}));}
function selectBank(bank,selection){
 if(selection===null||selection===undefined)return bank;
 const allowed={"Фільми":['potter','starwars','marvel'],"Музика":['rock','rap','pop'],"Аніме":[]};
 if(!selection||typeof selection!=='object'||!Object.hasOwn(allowed,selection.family)||!Array.isArray(selection.ids)||selection.ids.length>4||selection.ids.some(id=>!allowed[selection.family].includes(id)))throw new DuelError('Некоректна добірка.');
 return bank.filter(c=>c.topicFamily===selection.family).map(c=>({...c,items:c.items.filter(i=>!selection.ids.length||selection.ids.some(id=>i[2]?.includes(id)))}));
}
'''+s[b:]
s=s.replace('room.plan=makePlan(bank,previous);','room.plan=makePlan(selectBank(bank,room.selection),previous);')
s=s.replace("plan:makePlan(bank)};", "selection:input.selection||null,plan:makePlan(selectBank(bank,input.selection))};")
s=s.replace('match:room.match||1,rematch:', 'selection:room.selection||null,match:room.match||1,rematch:')
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8');raw=s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0];groups=json.loads(raw)
for g in groups:
 if g['name']=='Аніме':
  for c in g['cats']:c['topicFamily']='Аніме'
s=s.replace(raw,json.dumps(groups,ensure_ascii=False));a=s.index('const TOPIC_OPTIONS=');b=s.index('const DAILY_BANK =',a);s=s[:a]+Path('topics.js').read_text(encoding='utf-8')+'\n'+s[b:]
a=s.index('<section id="blitz" hidden>');b=s.index('</section>',a)+len('</section>');s=s[:a]+Path('blitz-ui.html').read_text(encoding='utf-8')+s[b:]
p.write_text(s,encoding='utf-8')
