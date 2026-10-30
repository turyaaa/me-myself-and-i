// Blitz: the standalone HTML runs solo; Netlify's /api/duel runs shared rooms.
let B=null, blitzTimer=null, blitzPoll=null, blitzEpoch=0;
const BLITZ_COUNT=15, BLITZ_MS=10000;
function showBlitzCountdown(seconds){
 const overlay=$('bcountdown'),digit=$('bcountdown-digit');
 if(seconds<=0){overlay.hidden=true;digit.textContent='';return;}
 overlay.hidden=false;
 if(digit.textContent!==String(seconds)){digit.textContent=String(seconds);digit.setAttribute('aria-label','Початок через '+seconds);digit.classList.remove('countdown-pop');void digit.offsetWidth;digit.classList.add('countdown-pop');}
}
function stopBlitzClock(hide=true) { if(blitzTimer!==null) clearInterval(blitzTimer); blitzTimer=null;if(hide)showBlitzCountdown(0); }
function cleanupBlitz() { closeBlitzOutcome(); stopBlitzClock(); if(blitzPoll!==null) clearTimeout(blitzPoll); blitzPoll=null; blitzEpoch++; }
function rememberDuel(value) { try { if(value) sessionStorage.setItem('ranking_duel',JSON.stringify(value)); else sessionStorage.removeItem('ranking_duel'); } catch(_){} }
function savedDuel() { try { const d=JSON.parse(sessionStorage.getItem('ranking_duel')); return d&&/^[A-Z2-9]{6}$/.test(d.room)&&typeof d.token==='string'?d:null; } catch(_){return null;} }
function showBlitzSetup() {
  cleanupBlitz(); B={phase:'setup',online:false}; show('blitz');
  $('btitle').textContent='Блітз'; $('bsetup').hidden=false; $('barena').hidden=true; $('berror').textContent='';
  renderBlitzTopics();$('bresume').hidden=!savedDuel();$('breplay').disabled=false;$('breplay').textContent='Зіграти ще раз';
  for(const id of ['bcreate','bjoin','bresume']) $(id).disabled=false;
}
function blitzValues(items,answer,year=false){
 const pool=[...new Set(items.map(i=>i[1]))].filter(v=>v!==answer);
 const distance=v=>year?Math.abs(v-answer):Math.abs(Math.log(v/answer));
 const nearby=pool.filter(v=>year?Math.abs(v-answer)>=3:(v/answer>=.3&&v/answer<=3.5&&Math.abs(v-answer)/answer>=.18));
 const selected=shuffle(nearby).slice(0,3);
 for(const v of pool.slice().sort((a,b)=>distance(a)-distance(b)))if(selected.length<3&&!selected.includes(v))selected.push(v);
 return shuffle([answer,...selected]);
}
function blitzLabels(values,unit){
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

function validTrivia(item){return Array.isArray(item[3])&&item[3].length===3&&item[3].every(v=>typeof v==='string'&&v.trim())&&new Set([item[1],...item[3]]).size===4;}
function blitzPlan(cats,previous=[]){
 const eligible=shuffle(cats.filter(c=>c.kind==='trivia'?c.items.some(validTrivia):new Set(c.items.map(i=>i[1])).size>=4)),chosen=[],seen=new Set();
 while(chosen.length<15){let added=false;
  for(const c of eligible){
   const available=c.items.filter(i=>!seen.has(c.title+'|'+i[0])&&(c.kind!=='trivia'||validTrivia(i)));
   const fresh=available.filter(i=>!previous.some(q=>q.category===c.title&&q.prompt===i[0]));
   if(!available.length)continue;
   const item=shuffle(fresh.length?fresh:available)[0];seen.add(c.title+'|'+item[0]);
   const values=c.kind==='trivia'?shuffle([item[1],...item[3]]):blitzValues(c.items,item[1],c.unit==='р.');
   chosen.push({id:c.title+'|'+item[0],category:c.title,prompt:item[0],options:c.kind==='trivia'?values:blitzLabels(values,c.unit),correct:values.indexOf(item[1])});added=true;
   if(chosen.length===15)break;
  }if(!added)break;
 }return chosen;
}
function makeBlitzPlan(){return blitzPlan(blitzPool(blitzSelection));}
function renderBlitzPlayers(players) {
  const box=$('bplayers'); box.replaceChildren();
  players.forEach(p=>{ const row=document.createElement('div');row.className='bplayer';const name=document.createElement('span'),score=document.createElement('strong');name.textContent=p.name+(p.ready?' · Готовий ✓':p.rematch?' · Реванш ✓':'');score.textContent=p.score;row.append(name,score);box.append(row); });
}
function renderBlitzQuestion(q,round,total) {
  $('bround').hidden=false; $('bprogress').textContent='Питання '+round+' з '+total;
  $('bcategory').textContent=q.category; $('bquestion').textContent=q.prompt;
  $('bquestion').classList.toggle('long-question',q.prompt.length>50);
  $('bhome').hidden=true;$('bfeedback').textContent=''; $('bnext').hidden=true; $('breplay').hidden=true;
  const box=$('boptions');box.replaceChildren();
  q.options.forEach((label,i)=>{const button=document.createElement('button');button.className='boption';button.textContent=label;button.onclick=()=>submitBlitz(i);box.append(button);});
}
function startBlitzClock(deadline,onExpire,startsAt=0,onStart=()=>{}) {
  stopBlitzClock(false);
  let started=false;
  const tick=()=>{
    if(performance.now()<startsAt){const seconds=Math.ceil((startsAt-performance.now())/1000);showBlitzCountdown(seconds);$('bseconds').classList.remove('urgent');$('bseconds').textContent='Старт '+seconds;$('btimebar').style.width='100%';return;}
    showBlitzCountdown(0);
    if(!started){started=true;onStart();}
    const remaining=Math.min(BLITZ_MS,Math.max(0,deadline-performance.now()));
    $('bseconds').textContent=Math.ceil(remaining/1000)+' с'; $('bseconds').classList.toggle('urgent',remaining<=3000);
    $('btimebar').style.width=(remaining/BLITZ_MS*100)+'%';
    if(!remaining){stopBlitzClock();onExpire();}
  };
  tick(); if(performance.now()<deadline) blitzTimer=setInterval(tick,100);
}
function startSoloBlitz() {
  const plan=makeBlitzPlan();if(plan.length!==15){$('berror').textContent='Обери ширшу добірку: потрібно 15 різних питань.';return;}
  cleanupBlitz(); B={phase:'question',online:false,plan,round:0,score:0};
  $('bsetup').hidden=true; $('barena').hidden=false; $('broom').hidden=true; $('berror').textContent='';
  nextSoloBlitz();
}
function nextSoloBlitz() {
  B.round++;B.phase='question'; B.selected=null;
  renderBlitzPlayers([{name:'Твої бали',score:B.score}]);
  renderBlitzQuestion(B.plan[B.round-1],B.round,B.plan.length);
  $('bstatus').textContent='Обери правильну відповідь. На відповідь — 10 секунд.';
  B.startsAt=performance.now()+(B.round===1?3000:0);
  B.deadline=B.startsAt+BLITZ_MS;
  if(performance.now()<B.startsAt)lockBlitzOptions();
  startBlitzClock(B.deadline,()=>finishSoloBlitz(null),B.startsAt,()=>{[...$('boptions').children].forEach(button=>button.disabled=false);});
}
function markBlitzAnswer(correct,selected) {
  [...$('boptions').children].forEach((button,i)=>{button.disabled=true;button.classList.toggle('correct',i===correct);button.classList.toggle('incorrect',i===selected&&selected!==correct);button.classList.toggle('chosen',i===selected);});
}
function finishSoloBlitz(index) {
  if(!B||B.online||B.phase!=='question')return;
  stopBlitzClock();B.phase='result';B.selected=index;
  const q=B.plan[B.round-1],correct=index===q.correct;
  if(correct){B.score+=100;playSound('perfect');}else playSound('error');
  markBlitzAnswer(q.correct,index);renderBlitzPlayers([{name:'Твої бали',score:B.score}]);
  $('bfeedback').textContent=(index===null?'Час вийшов. ':correct?'Правильно! +100. ':'Цього разу ні. ')+'Правильна відповідь: '+q.options[q.correct];
  if(B.round>=B.plan.length){
    B.phase='end';const key='bestb_Всі',best=Number(store.get(key)||0),percent=Math.round(B.score/B.plan.length);
    if(percent>best)store.set(key,percent);
    $('bstatus').textContent='Блітз завершено: '+B.score+' з '+B.plan.length*100+' балів.';
    $('breplay').hidden=false;$('bhome').hidden=false;
  }else {$('bnext').hidden=false;$('bnext').textContent='Наступне питання';}
}
function submitBlitz(index) {
  if(!B||B.phase!=='question'||B.pending)return;
  if(performance.now()<B.startsAt)return;
  if(!B.online)return finishSoloBlitz(performance.now()>=B.deadline?null:index);
  if(performance.now()>=B.deadline){lockBlitzOptions();return;}
  B.selected=index;lockBlitzOptions();duelAction('answer',{round:B.snapshot.round,index});
}
function lockBlitzOptions() { [...$('boptions').children].forEach((button,i)=>{button.disabled=true;button.classList.toggle('chosen',i===B.selected);}); }
async function duelRequest(action,payload={}) {
  if(typeof location==='undefined'||!/^https?:$/.test(location.protocol))throw Error('Онлайн-дуелі доступні у вебверсії гри на Netlify. У цьому HTML можна грати самому.');
  let response;const sent=performance.now();
  try {response=await fetch('/api/duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),cache:'no-store'});}catch(_){throw Error('Немає зв’язку. Перевір інтернет; дуель можна відновити.');}
  let data;try{data=await response.json();}catch(_){throw Error('Онлайн ще не налаштовано. На Netlify потрібно розгорнути весь пакет із серверними функціями.');}
  if(!response.ok){const error=Error(data.error||'Не вдалося виконати дію. Спробуй ще раз.');error.status=response.status;throw error;}data.latency=performance.now()-sent;return data;
}
async function connectDuel(action) {
  if(B&&B.pending)return;
  const epoch=++blitzEpoch;B={phase:'setup',online:true,pending:true};
  $('berror').textContent='';for(const id of ['bcreate','bjoin','bresume'])$(id).disabled=true;
  try {
    const saved=action==='resume'?savedDuel():null;
    const room=saved?saved.room:$('bcode').value.trim().toUpperCase();
    const data=await duelRequest(action==='resume'?'state':action,saved||{name:$('bname').value.trim()||'Гравець',room,selection:blitzSelection});
    if(epoch!==blitzEpoch)return;
    B={online:true,phase:'waiting',room:data.room,token:data.token||saved?.token,selected:null,pending:false};
    rememberDuel({room:B.room,token:B.token});$('bsetup').hidden=true;$('barena').hidden=false;$('broom').hidden=false;
    renderDuel(data);scheduleDuelPoll();
  }catch(error){if(epoch!==blitzEpoch)return;B={phase:'setup',online:false};$('berror').textContent=error.message;}
  finally{if(epoch===blitzEpoch){for(const id of ['bcreate','bjoin','bresume'])$(id).disabled=false;}}
}
function scheduleDuelPoll() {
  if(blitzPoll!==null)clearTimeout(blitzPoll);
  if(!B?.online||['cancelled'].includes(B.phase))return;
  const epoch=blitzEpoch;
  blitzPoll=setTimeout(async()=>{
    if(epoch!==blitzEpoch||!B?.online)return;
    try {const data=await duelRequest('state',{room:B.room,token:B.token});if(epoch!==blitzEpoch)return;renderDuel(data);$('berror').textContent='';}
    catch(error){if(epoch===blitzEpoch){$('berror').textContent=error.message;if([401,404,410].includes(error.status)){B.phase='cancelled';closeBlitzOutcome();stopBlitzClock();$('bnext').hidden=true;$('breplay').hidden=false;$('bhome').hidden=false;$('breplay').disabled=false;$('breplay').textContent='Зіграти ще раз';rememberDuel(null);}}}
    if(epoch===blitzEpoch&&B?.online)scheduleDuelPoll();
  },['waiting','end'].includes(B?.phase)?1800:1000);
}
async function duelAction(action,extra={}) {
  if(!B?.online||B.pending)return;
  const epoch=blitzEpoch;B.pending=true;$('bnext').disabled=true;
  try {const data=await duelRequest(action,{room:B.room,token:B.token,match:B.snapshot.match||1,...extra});if(epoch===blitzEpoch){renderDuel(data);$('berror').textContent='';}}
  catch(error){if(epoch===blitzEpoch){$('berror').textContent=error.message;if(B.phase==='question'&&performance.now()<B.deadline&&!B.snapshot.answered){B.selected=null;[...$('boptions').children].forEach(b=>b.disabled=false);}}}
  finally{if(epoch===blitzEpoch){B.pending=false;$('bnext').disabled=false;if(B.phase==='question'&&!B.snapshot.answered&&B.selected===null&&performance.now()>=B.startsAt&&performance.now()<B.deadline)[...$('boptions').children].forEach(button=>button.disabled=false);}}
}
function renderDuel(data) {
  const previous=B.snapshot, changed=!previous||previous.round!==data.round||previous.phase!==data.phase||previous.match!==data.match;
  if(previous&&previous.match!==data.match)closeBlitzOutcome();
  B.snapshot=data;B.phase=data.phase;$('btitle').textContent='Блітз · Дуель';$('broomcode').textContent='Кімната '+data.room;
  renderBlitzPlayers(data.players);$('bnext').hidden=true;$('breplay').hidden=true;
  if(data.phase==='waiting'){
    stopBlitzClock();$('bround').hidden=true;$('bstatus').textContent=data.players.length<2?'Надішли другу запрошення. Очікуємо другого гравця.':data.ready?'Ти готовий. Чекаємо суперника.':'Обидва гравці мають підтвердити готовність.';
    $('bnext').hidden=data.players.length<2||data.ready;$('bnext').textContent='Готовий';return;
  }
  if(data.phase==='cancelled'){closeBlitzOutcome();stopBlitzClock();$('bround').hidden=true;$('bstatus').textContent='Суперник вийшов із дуелі.';$('breplay').hidden=false;$('bhome').hidden=false;$('breplay').disabled=false;$('breplay').textContent='Зіграти ще раз';rememberDuel(null);return;}
  if(changed&&data.question){B.selected=null;renderBlitzQuestion(data.question,data.round,data.total);}
  if(data.phase==='question'){
    // Anchor to server time; repeated snapshots cannot extend the same deadline.
    const deadline=performance.now()+Math.max(0,data.deadline-data.serverNow-(data.latency||0));
    B.deadline=changed?deadline:Math.min(B.deadline,deadline);
    B.startsAt=performance.now()+Math.max(0,data.startsAt-data.serverNow-(data.latency||0));
    if(changed)playSound('click');
    if(data.answered){B.selected=data.selection;lockBlitzOptions();$('bstatus').textContent='Відповідь прийнято. Очікуємо суперника.';}
    else $('bstatus').textContent='Обери відповідь. До завершення раунду суперник її не бачить.';
    if(performance.now()<B.startsAt)lockBlitzOptions();
    startBlitzClock(B.deadline,()=>{lockBlitzOptions();$('bstatus').textContent='Час вийшов. Очікуємо результат сервера.';},B.startsAt,()=>{if(!B.snapshot.answered&&!B.pending)[...$('boptions').children].forEach(b=>b.disabled=false);});return;
  }
  stopBlitzClock();markBlitzAnswer(data.correct,data.selection);
  $('bseconds').textContent='—';$('btimebar').style.width='0%';
  $('bfeedback').textContent=(data.selection===null?'Без відповіді. ':data.selection===data.correct?'Правильно! +100. ':'Цього разу ні. ')+'Правильна відповідь: '+data.question.options[data.correct];
  if(changed)playSound(data.selection===data.correct?'perfect':'error');
  if(data.phase==='end'){
    const high=Math.max(...data.players.map(p=>p.score)),winners=data.players.filter(p=>p.score===high);
    $('bstatus').textContent=winners.length===2?'Дуель завершено — нічия!':'Переможець: '+winners[0].name+'!';
    $('breplay').hidden=false;$('bhome').hidden=false;$('breplay').textContent=data.rematch?'Очікуємо реваншу…':'Реванш';$('breplay').disabled=!!data.rematch;
    $('boutcome-replay').textContent=data.rematch?'Очікуємо суперника…':'Реванш';$('boutcome-replay').disabled=!!data.rematch;
    if(changed)showBlitzOutcome(data.players);
  }else {$('bstatus').textContent=data.ready?'Ти готовий до наступного раунду. Чекаємо суперника.':'Результати раунду';$('bnext').hidden=data.ready;$('bnext').textContent='Готовий далі';}
}
function blitzOutcome(players) {
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
$('boutcome-replay').onclick=()=>duelAction('rematch');
$('boutcome-home').onclick=()=>navigate(showHome);
$('boutcome').addEventListener('click',event=>{if(event.target===$('boutcome')){const r=$('boutcome').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeBlitzOutcome();}});
$('boutcome').addEventListener('close',()=>{if(B?.phase==='end')$('breplay').focus();});
function renderBlitzTopics(){
 const box=$('blitz-topic-buttons');box.replaceChildren();
 [['','Усі теми'],['Футбол','Футбол'],['Фільми','Фільми'],['Музика','Музика'],['Серіали','Серіали'],['Аніме','Аніме']].forEach(([name,label])=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',name?blitzSelection?.family===name:!blitzSelection);b.onclick=()=>{if(!name){blitzSelection=null;renderBlitzTopics();}else if(name==='Аніме'){blitzSelection={family:name,ids:[]};renderBlitzTopics();}else openTopicPicker(GROUPS.find(g=>g.name===name),'blitz');};box.append(b);});
 const more=document.createElement('button');more.textContent='Усі категорії';more.onclick=()=>showMenu('blitz');box.append(more);
 $('blitz-topic-label').textContent=blitzSelection?blitzSelection.family+(blitzSelection.ids.length?' · '+blitzSelection.ids.map(id=>TOPIC_OPTIONS[blitzSelection.family]?.find(x=>x[0]===id)?.[1]||id).join(' + '):' · усе разом'):'Питання з усіх тем. У дуелі добірку обирає автор кімнати.';
}
$('bsolo').onclick=startSoloBlitz;
$('bcreate').onclick=()=>connectDuel('create');$('bjoin').onclick=()=>connectDuel('join');$('bresume').onclick=()=>connectDuel('resume');
$('bnext').onclick=()=>B?.online?duelAction('ready',{round:B.snapshot.round}):nextSoloBlitz();
$('bhome').onclick=()=>navigate(showHome);
$('breplay').onclick=()=>B?.online&&B.phase==='end'?duelAction('rematch'):showBlitzSetup();
$('bcopy').onclick=async()=>{const link=new URL(location.href);link.search='';link.hash='';link.searchParams.set('duel',B.room);try{await navigator.clipboard.writeText(link.href);toast('Запрошення скопійовано');}catch(_){$('berror').textContent='Код для друга: '+B.room;}};
$('mode-blitz').onclick=showBlitzSetup;
if(typeof location!=='undefined'){const invited=new URL(location.href).searchParams.get('duel');if(invited&&/^[A-Z2-9]{6}$/i.test(invited)){showBlitzSetup();$('bcode').value=invited.toUpperCase();}}
