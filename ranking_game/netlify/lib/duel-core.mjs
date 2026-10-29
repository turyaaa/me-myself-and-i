// Pure room logic. Each room is one atomically replaced document, not separate
// score counters: ETags prevent two simultaneous answers from losing a write.
export class DuelError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const COUNT=10, LIMIT=10000, LIFE=30*60*1000;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const nameOf=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>24)throw new DuelError('Введи нік від 1 до 24 символів.');return v.trim();};
const format=(v,unit)=>unit==='р.'?String(v):v.toLocaleString('uk-UA',{maximumFractionDigits:3});
export function makePlan(bank){
  return shuffle(bank.filter(c=>new Set(c.items.map(i=>i[1])).size>=4)).slice(0,COUNT).map(c=>{
    const [prompt,answer]=shuffle(c.items)[0];
    const values=shuffle([answer,...shuffle([...new Set(c.items.map(i=>i[1]))].filter(v=>v!==answer)).slice(0,3)]);
    return {id:crypto.randomUUID(),category:c.title,prompt,options:values.map(v=>format(v,c.unit)+' '+c.unit),correct:values.indexOf(answer)};
  });
}
function settle(room,now){
  if(room.phase!=='question')return false;
  const submissions=room.answers[room.round-1];
  if(now<room.deadline&&!room.players.every(p=>Object.hasOwn(submissions,p.id)))return false;
  const correct=room.plan[room.round-1].correct;
  for(const p of room.players)if(submissions[p.id]===correct)p.score+=100;
  room.ready=[];room.phase=room.round===COUNT?'end':'result';return true;
}
function beginRound(room,now){room.round++;room.phase='question';room.startsAt=now+2000;room.deadline=room.startsAt+LIMIT;room.ready=[];room.answers.push({});}
export function projectRoom(room,who,now){
  const current=room.plan[room.round-1],answers=room.answers[room.round-1]||{};
  const answered=Object.hasOwn(answers,who.id),revealed=['result','end'].includes(room.phase);
  const publicQuestion=current?{id:current.id,category:current.category,prompt:current.prompt,options:current.options}:null;
  return {room:room.code,phase:room.phase,round:room.round,total:COUNT,serverNow:now,startsAt:room.startsAt||null,deadline:room.deadline||null,
    players:room.players.map(p=>({name:p.name,score:p.score,you:p.id===who.id})),
    ready:room.ready.includes(who.id),answered,selection:answered?answers[who.id]:null,
    question:publicQuestion,...(revealed?{correct:current.correct}:{}),expires:room.expires};
}
function actionOnRoom(room,who,input,now){
  let changed=settle(room,now);
  if(input.action==='state')return changed;
  if(input.action==='leave'){
    if(!['end','cancelled'].includes(room.phase)){room.phase='cancelled';changed=true;}return changed;
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
      const room={code,created:now,expires:now+LIFE,phase:'waiting',round:0,deadline:null,players:[player],ready:[],answers:[],plan:makePlan(bank)};
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
      changed=actionOnRoom(room,who,input,now);
    }
    if(!changed)return projectRoom(room,who,now);
    if(!entry.etag)throw new DuelError('Не вдалося перевірити версію кімнати.',503);
    const result=await store.setJSON('room/'+input.room,room,{onlyIfMatch:entry.etag});
    if(result.modified){if(!result.etag)throw new DuelError('Сховище тимчасово недоступне.',503);return {...projectRoom(room,who,clock()),...(joining?{token:secret}:{})};}
  }
  throw new DuelError('Кімната оновлюється. Повтори дію.',409);
}
