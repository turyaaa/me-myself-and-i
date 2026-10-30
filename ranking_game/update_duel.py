from pathlib import Path
import json,re

def change(file,old,new):
 p=Path(file);s=p.read_text(encoding='utf-8');assert old in s,(file,old);p.write_text(s.replace(old,new),encoding='utf-8')

change('netlify/lib/duel-core.mjs','const COUNT=10,','const COUNT=15,')
change('netlify/lib/duel-core.mjs',"room.round===COUNT?'end'","room.round===room.plan.length?'end'")
change('netlify/lib/duel-core.mjs','room.startsAt=now+2000','room.startsAt=now+(room.round===1?5000:2000)')
change('netlify/lib/duel-core.mjs','total:COUNT,','total:room.plan.length,')
change('blitz.js','const BLITZ_COUNT=10,','const BLITZ_COUNT=15,')
change('blitz.js','function cleanupBlitz() { stopBlitzClock();','function cleanupBlitz() { closeBlitzOutcome(); stopBlitzClock();')
change('blitz.js',"Блітз · дуель","Блітз · Дуель")
change('blitz.js',"if(performance.now()<startsAt){$('bseconds')","if(performance.now()<startsAt){$('bseconds').classList.remove('urgent');$('bseconds')")
change('blitz.js',"B.deadline=performance.now()+BLITZ_MS;\n  startBlitzClock(B.deadline,()=>finishSoloBlitz(null));", "B.startsAt=performance.now()+(B.round===1?5000:0);\n  B.deadline=B.startsAt+BLITZ_MS;\n  if(performance.now()<B.startsAt)lockBlitzOptions();\n  startBlitzClock(B.deadline,()=>finishSoloBlitz(null),B.startsAt,()=>{[...$('boptions').children].forEach(button=>button.disabled=false);});")
change('blitz.js',"if(!B.online)return finishSoloBlitz(performance.now()>=B.deadline?null:index);\n  if(performance.now()<B.startsAt)return;", "if(performance.now()<B.startsAt)return;\n  if(!B.online)return finishSoloBlitz(performance.now()>=B.deadline?null:index);")
change('blitz.js',"$('breplay').hidden=false;rememberDuel(null);\n  }else", "$('breplay').hidden=false;rememberDuel(null);\n    if(changed)showBlitzOutcome(data.players);\n  }else")
change('blitz.js',"$('bsolo').onclick=startSoloBlitz;", """function blitzOutcome(players) {
  const you=players.find(p=>p.you),other=players.find(p=>!p.you);
  if(!you||!other)return null;
  return {kind:you.score===other.score?'draw':you.score>other.score?'win':'loss',you:you.score,other:other.score};
}
function closeBlitzOutcome(){const dialog=$('boutcome');if(dialog.open)dialog.close();}
function showBlitzOutcome(players){
  const result=blitzOutcome(players);if(!result)return;
  const copy={win:['Перемога!','Чудова гра. Ця дуель за тобою.','★'],draw:['Нічия!','Рівні бали. Час для реваншу?','='],loss:['Цього разу поразка','Наступна дуель — новий шанс.','↗']}[result.kind];
  $('boutcome').dataset.result=result.kind;
  $('boutcome-title').textContent=copy[0];$('boutcome-note').textContent=copy[1];$('boutcome-icon').textContent=copy[2];
  $('boutcome-score').textContent=result.you+' : '+result.other;
  if(!$('boutcome').open)$('boutcome').showModal();
}
$('boutcome-close').onclick=closeBlitzOutcome;
$('boutcome-replay').onclick=()=>{closeBlitzOutcome();showBlitzSetup();};
$('boutcome').addEventListener('click',event=>{if(event.target===$('boutcome')){const r=$('boutcome').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeBlitzOutcome();}});
$('boutcome').addEventListener('close',()=>{if(B?.phase==='end')$('breplay').focus();});
$('bsolo').onclick=startSoloBlitz;""")
change('blitz-ui.html','10 питань ·','15 питань ·')
change('blitz-ui.html','</section>', '''  <dialog id="boutcome" class="boutcome" aria-labelledby="boutcome-title" aria-describedby="boutcome-note">
    <span id="boutcome-icon" class="boutcome-icon" aria-hidden="true"></span>
    <h2 id="boutcome-title"></h2>
    <p id="boutcome-note"></p>
    <strong id="boutcome-score" class="boutcome-score"></strong>
    <p class="boutcome-label">Твої бали · Бали суперника</p>
    <button class="wbtn" id="boutcome-replay" autofocus>Зіграти ще раз</button>
    <button class="wbtn alt" id="boutcome-close">Переглянути результат</button>
  </dialog>
</section>''')
with Path('blitz.css').open('a',encoding='utf-8') as f:f.write('''
  .boutcome { box-sizing:border-box; width:min(400px,calc(100% - 32px)); max-height:calc(100dvh - 32px); overflow:auto; padding:28px 24px 20px; background:var(--card); color:var(--ink); border:1px solid var(--line); border-radius:22px; text-align:center; box-shadow:0 20px 80px #0006; }
  .boutcome::backdrop { background:#10060bb3; }
  .boutcome-icon { display:block; color:var(--icon); font:48px/1.2 system-ui; }
  .boutcome[data-result="win"] .boutcome-icon { color:var(--ok); }
  .boutcome h2 { font:700 30px Georgia,serif; margin:12px 0; }
  .boutcome p { font:15px/1.5 system-ui; color:var(--muted); }
  .boutcome-score { display:block; font:700 40px/1.3 system-ui; font-variant-numeric:tabular-nums; margin-top:20px; }
  .boutcome .boutcome-label { font-size:12px; margin:4px 0 24px; }
''')
p=Path('index.html');s=p.read_text(encoding='utf-8');raw=s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0];groups=json.loads(raw)
found=0
for g in groups:
 for c in g['cats']:
  if c['title']=='Населення міста України (округлено, на початок 2022)':
   c['title']='Наявне населення міста України (тис., на 01.01.2022)'
   for item in c['items']:
    if item[0]=='Київ':item[1]=2952;found+=1
assert found==1
s=s.replace(raw,json.dumps(groups,ensure_ascii=False))
s=re.sub(r'<section id="blitz" hidden>.*?</section>',lambda _:Path('blitz-ui.html').read_text(encoding='utf-8').strip(),s,flags=re.S)
a=s.index('  .bdivider');b=s.index('</style>',a);s=s[:a]+Path('blitz.css').read_text(encoding='utf-8')+'\n'+s[b:];p.write_text(s,encoding='utf-8')
change('verify-game.cjs','ends after ten questions.','ends after fifteen questions.')
change('verify-game.cjs','assert.equal(B.plan.length,10);assert.equal(B.deadline-blitzNow,10000);',"assert.equal(B.plan.length,15);assert.equal(B.startsAt-blitzNow,5000);assert.equal(B.deadline-B.startsAt,10000);submitBlitz(B.plan[0].correct);assert.equal(B.score,0);assert.equal(B.phase,'question');")
change('verify-game.cjs','new Set(B.plan.map(q=>q.id)).size,10','new Set(B.plan.map(q=>q.id)).size,15')
change('verify-game.cjs','i<=10','i<=15')
change('verify-game.cjs',"assert.equal(B.round,10);assert.equal(B.score,900);assert.equal(store.get('bestb_Всі'),'90')","assert.equal(B.round,15);assert.equal(B.score,1400);assert.equal(store.get('bestb_Всі'),'93')")
change('verify-game.cjs',"results.blitzTenSecondDeadline='passed';", """for(const [a,b,kind] of [[300,100,'win'],[200,200,'draw'],[100,300,'loss']]){
 const players=[{score:b,you:false},{score:a,you:true}];assert.equal(blitzOutcome(players).kind,kind);
 const dialog=$('boutcome');dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
 showBlitzOutcome(players);assert.equal(dialog.open,true);assert.equal(dialog.dataset.result,kind);assert.equal($('boutcome-score').textContent,a+' : '+b);closeBlitzOutcome();assert.equal(dialog.open,false);
}
results.duelOutcomeWinDrawLoss='passed';results.blitzInitialCountdown='passed';results.blitzTenSecondDeadline='passed';""")
change('test-duel.cjs','while(round<10)','while(round<15)')
change('test-duel.cjs','round===10?','round===15?')
change('test-duel.cjs','score,900','score,1400')
change('test-duel.cjs','round:10,index','round:15,index')
change('test-duel.cjs','duelRounds:10','duelRounds:15')
change('test-duel.cjs','assert.equal(state.round,round);',"assert.equal(state.round,round);assert.equal(state.total,15);assert.equal(state.startsAt-now,round===1?5000:2000);")
