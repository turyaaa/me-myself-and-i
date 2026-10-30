// Pure room logic. Each room is one atomically replaced document, not separate
// score counters: ETags prevent two simultaneous answers from losing a write.
export class DuelError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const COUNT=15, LIMIT=10000, LIFE=30*60*1000;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const nameOf=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>24)throw new DuelError('Введи нік від 1 до 24 символів.');return v.trim();};
const format=(v,unit)=>unit==='р.'?String(v):v.toLocaleString('uk-UA',{maximumFractionDigits:3});
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

function blitzPlan(cats,previous=[]){
 const eligible=shuffle(cats.filter(c=>new Set(c.items.map(i=>i[1])).size>=4)),chosen=[],seen=new Set();
 while(chosen.length<15){let added=false;
  for(const c of eligible){
   const available=c.items.filter(i=>!seen.has(c.title+'|'+i[0]));
   const fresh=available.filter(i=>!previous.some(q=>q.category===c.title&&q.prompt===i[0]));
   if(!available.length)continue;
   const item=shuffle(fresh.length?fresh:available)[0];seen.add(c.title+'|'+item[0]);
   const values=c.kind==='trivia'?shuffle([item[1],...shuffle([...new Set(c.items.map(i=>i[1]))].filter(v=>v!==item[1])).slice(0,3)]):blitzValues(c.items,item[1],c.unit==='р.');
   chosen.push({id:c.title+'|'+item[0],category:c.title,prompt:item[0],options:c.kind==='trivia'?values:blitzLabels(values,c.unit),correct:values.indexOf(item[1])});added=true;
   if(chosen.length===15)break;
  }if(!added)break;
 }return chosen;
}
export function makePlan(bank,previous=[]){return blitzPlan(bank,previous).map(q=>({...q,id:crypto.randomUUID()}));}
function selectBank(bank,selection){
 if(selection===null||selection===undefined)return bank;
 const allowed={"Фільми":['potter','starwars','marvel'],"Музика":['rock','rap','pop'],"Аніме":[],"Серіали":["breakingbad","got","friends","stranger","saul","office"]};
 if(!selection||typeof selection!=='object'||!Object.hasOwn(allowed,selection.family)||!Array.isArray(selection.ids)||selection.ids.length>4||selection.ids.some(id=>!allowed[selection.family].includes(id)))throw new DuelError('Некоректна добірка.');
 return bank.filter(c=>c.topicFamily===selection.family).map(c=>({...c,items:c.items.filter(i=>!selection.ids.length||selection.ids.some(id=>i[2]?.includes(id)))}));
}
function settle(room,now){
  if(room.phase!=='question')return false;
  const submissions=room.answers[room.round-1];
  if(now<room.deadline&&!room.players.every(p=>Object.hasOwn(submissions,p.id)))return false;
  const correct=room.plan[room.round-1].correct;
  for(const p of room.players)if(submissions[p.id]===correct)p.score+=100;
  room.ready=[];room.phase=room.round===room.plan.length?'end':'result';return true;
}
function beginRound(room,now){room.round++;room.phase='question';room.startsAt=now+(room.round===1?5000:2000);room.deadline=room.startsAt+LIMIT;room.ready=[];room.answers.push({});}
export function projectRoom(room,who,now){
  const current=room.plan[room.round-1],answers=room.answers[room.round-1]||{};
  const answered=Object.hasOwn(answers,who.id),revealed=['result','end'].includes(room.phase);
  const publicQuestion=current?{id:current.id,category:current.category,prompt:current.prompt,options:current.options}:null;
  return {room:room.code,phase:room.phase,round:room.round,total:room.plan.length,serverNow:now,startsAt:room.startsAt||null,deadline:room.deadline||null,
    selection:room.selection||null,match:room.match||1,rematch:(room.rematch||[]).includes(who.id),
    players:room.players.map(p=>({name:p.name,score:p.score,you:p.id===who.id,ready:room.ready.includes(p.id),rematch:(room.rematch||[]).includes(p.id)})),
    ready:room.ready.includes(who.id),answered,selection:answered?answers[who.id]:null,
    question:publicQuestion,...(revealed?{correct:current.correct}:{}),expires:room.expires};
}
function actionOnRoom(room,who,input,now,bank){
  let changed=settle(room,now);
  if(input.action==='state')return changed;
  if(['answer','ready','rematch'].includes(input.action)&&(input.match!==undefined||room.match>1)&&input.match!==(room.match||1))return changed;
  if(input.action==='rematch'){
    if(room.phase!=='end')return changed;
    room.rematch=room.rematch||[];
    if(!room.rematch.includes(who.id)){room.rematch.push(who.id);changed=true;}
    if(room.rematch.length===2){const previous=room.plan;room.plan=makePlan(selectBank(bank,room.selection),previous);room.match=(room.match||1)+1;room.phase='waiting';room.round=0;room.answers=[];room.ready=[];room.rematch=[];room.players.forEach(p=>p.score=0);room.expires=now+LIFE;beginRound(room,now);}
    return changed;
  }
  if(input.action==='leave'){
    if(room.phase!=='cancelled'){room.phase='cancelled';changed=true;}return changed;
  }
  if(input.action==='ready'){
    if(!Number.isInteger(input.round)||input.round!==room.round)throw new DuelError('Раунд уже змінився. Оновлюємо стан.',409);
    if(!['waiting','result'].includes(room.phase))return changed;
    if(room.players.length!==2)throw new DuelError('Чекаємо другого гравця.',409);
    if(!room.ready.includes(who.id)){room.ready.push(who.id);changed=true;}
    if(room.ready.length===2)beginRound(room,now);
    return changed;
  }
  if(input.action==='answer'){
    if(!Number.isInteger(input.round)||input.round!==room.round)throw new DuelError('Це питання вже завершено.',409);
    if(!Number.isInteger(input.index)||input.index<0||input.index>3)throw new DuelError('Некоректний варіант відповіді.');
    if(room.phase==='question'&&now<room.startsAt)throw new DuelError('Раунд ще не почався.',409);
    // A retry is harmless and cannot replace the first accepted answer.
    if(room.phase!=='question'||Object.hasOwn(room.answers[room.round-1],who.id))return changed;
    room.answers[room.round-1][who.id]=input.index;
    settle(room,now);return true;
  }
  throw new DuelError('Невідома дія.');
}
export async function processDuel(input,store,bank,clock=Date.now){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new DuelError('Некоректний запит.');
  if(input.action==='create'){
    const name=nameOf(input.name),secret=token(),id=crypto.randomUUID(),secretHash=await hash(secret);
    for(let attempt=0;attempt<5;attempt++){
      const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join('');
      const now=clock(),player={id,name,secretHash,score:0};
      const room={code,created:now,expires:now+LIFE,phase:'waiting',round:0,deadline:null,players:[player],ready:[],answers:[],selection:input.selection||null,plan:makePlan(selectBank(bank,input.selection))};
      if(room.plan.length!==COUNT)throw new DuelError('Недостатньо питань для дуелі.',503);
      const result=await store.setJSON('room/'+code,room,{onlyIfNew:true});
      if(result.modified){if(!result.etag)throw new DuelError('Сховище тимчасово недоступне.',503);return {...projectRoom(room,player,clock()),token:secret};}
    }
    throw new DuelError('Спробуй створити кімнату ще раз.',503);
  }
  if(typeof input.room!=='string'||! /^[A-Z2-9]{6}$/.test(input.room))throw new DuelError('Код кімнати має містити 6 символів.');
  const joining=input.action==='join';
  const joinPlayer=joining?{id:crypto.randomUUID(),name:nameOf(input.name),score:0,secretHash:null}:null;
  const secret=joining?token():input.token;
  if(typeof secret!=='string'||! /^[a-f0-9]{48}$/.test(secret))throw new DuelError('Немає доступу до цієї дуелі.',401);
  const secretHash=await hash(secret);if(joining)joinPlayer.secretHash=secretHash;
  // Retry the entire transition against the latest room, never blindly overwrite.
  for(let attempt=0;attempt<10;attempt++){
    const entry=await store.getWithMetadata('room/'+input.room,{type:'json',consistency:'strong'});
    if(!entry?.data)throw new DuelError('Кімнату не знайдено або її час минув.',404);
    const room=entry.data,now=clock();
    if(room.expires<=now)throw new DuelError('Час кімнати минув. Створи нову дуель.',410);
    let who,changed;
    if(joining){
      if(room.phase!=='waiting'||room.players.length>=2)throw new DuelError('Кімната вже зайнята або гра почалася.',409);
      room.players.push(joinPlayer);who=joinPlayer;changed=true;
    }else{
      who=room.players.find(p=>p.secretHash===secretHash);
      if(!who)throw new DuelError('Немає доступу до цієї дуелі.',401);
      changed=actionOnRoom(room,who,input,now,bank);
    }
    if(!changed)return projectRoom(room,who,now);
    if(!entry.etag)throw new DuelError('Не вдалося перевірити версію кімнати.',503);
    const result=await store.setJSON('room/'+input.room,room,{onlyIfMatch:entry.etag});
    if(result.modified){if(!result.etag)throw new DuelError('Сховище тимчасово недоступне.',503);return {...projectRoom(room,who,clock()),...(joining?{token:secret}:{})};}
  }
  throw new DuelError('Кімната оновлюється. Повтори дію.',409);
}
