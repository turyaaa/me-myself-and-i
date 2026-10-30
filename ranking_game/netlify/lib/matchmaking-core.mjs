import {DuelError,processDuel,provisionMatchedDuel} from './duel-core.mjs';
export const QUEUE_KEY='matchmaking/queue-v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const validUuid=v=>typeof v==='string'&&UUID.test(v);
const WAIT_LEASE=20000,PEER_GRACE=25000,MATCH_LIFE=30*60000,HISTORY_LIFE=5*60000;
function prune(q,now){
 q.cancelled=q.cancelled||{};for(const [id,tickets]of Object.entries(q.cancelled)){q.cancelled[id]=tickets.filter(t=>t.expires>now);if(!q.cancelled[id].length)delete q.cancelled[id];}
 for(const [id,match]of Object.entries(q.matches))if(match.expires<=now)delete q.matches[id];
 for(const [id,e]of Object.entries(q.entries))if(e.matchId?(!q.matches[e.matchId]||q.matches[e.matchId].status!=='active'):e.seen+WAIT_LEASE<=now)delete q.entries[id];
}
function endMatch(q,match,now,status,reason){
 if(match.status!=='active')return;
 match.status=status;match.reason=reason;match.expires=now+HISTORY_LIFE;
 for(const user of match.users)if(q.entries[user.id]?.matchId===match.id)delete q.entries[user.id];
}
async function transact(store,change,clock){
 for(let attempt=0;attempt<20;attempt++){
  const entry=await store.getWithMetadata(QUEUE_KEY,{type:'json',consistency:'strong'}),now=clock();
  if(entry?.data&&!entry.etag)throw new DuelError('Пошук тимчасово недоступний.',503);
  const q=entry?.data||{version:1,entries:{},matches:{}};prune(q,now);const result=change(q,now);
  const saved=await store.setJSON(QUEUE_KEY,q,entry?.data?{onlyIfMatch:entry.etag}:{onlyIfNew:true});
  if(saved.modified){if(!saved.etag)throw new DuelError('Пошук тимчасово недоступний.',503);return structuredClone(result);}
 }
 throw new DuelError('Черга оновлюється. Спробуй ще раз.',409);
}
function ownMatch(q,id,userId){const match=q.matches[id];if(!match||!match.users.some(p=>p.id===userId))throw new DuelError('Матч не знайдено або його час минув.',404);return match;}
function queueView(q,user,now){const e=q.entries[user.id];return e?.matchId?{status:'matched',ticket:e.ticket,match:q.matches[e.matchId]}:e?{status:'searching',ticket:e.ticket,joinedAt:e.joinedAt,serverNow:now}:{status:'idle'};}
async function queueAction(input,user,store,clock){
 return transact(store,(q,now)=>{
  const e=q.entries[user.id];
  if(input.action==='cancel'){
   q.cancelled[user.id]=[...(q.cancelled[user.id]||[]),{ticket:input.ticket,expires:now+30000}].slice(-16);
   if(!e||e.ticket!==input.ticket)return {status:'idle'};
   if(e.matchId)endMatch(q,q.matches[e.matchId],now,'cancelled','search_cancelled');else delete q.entries[user.id];
   return {status:'idle'};
  }
  if(input.action==='search'){
   if(q.cancelled[user.id]?.some(t=>t.ticket===input.ticket))return {status:'idle'};
   if(e?.matchId)return queueView(q,user,now);
   if(!e){if(Object.keys(q.entries).length>=500||Object.values(q.matches).filter(m=>m.status==='active').length>=200)throw new DuelError('Черга зараз заповнена. Спробуй трохи пізніше.',503);
    q.entries[user.id]={ticket:input.ticket,name:user.name,joinedAt:now,seen:now};
   }
  }else if(!e||e.ticket!==input.ticket)return {status:'idle'};
  const mine=q.entries[user.id];if(mine.matchId)return queueView(q,user,now);mine.seen=now;
  const other=Object.entries(q.entries).filter(([id,x])=>id!==user.id&&!x.matchId&&x.seen+WAIT_LEASE>now).sort((a,b)=>a[1].joinedAt-b[1].joinedAt||a[0].localeCompare(b[0]))[0];
  if(other){const id=crypto.randomUUID(),users=[{id:other[0],name:other[1].name},{id:user.id,name:mine.name}];
   q.matches[id]={id,users,status:'active',created:now,expires:now+MATCH_LIFE,seen:Object.fromEntries(users.map(p=>[p.id,now]))};mine.matchId=id;other[1].matchId=id;
  }
  return queueView(q,user,now);
 },clock);
}
function cancelledView(match,user,now){return {status:'matched',automatic:true,matchId:match.id,room:'M'+match.id.replaceAll('-',''),phase:'cancelled',round:0,total:15,match:1,serverNow:now,players:match.users.map(p=>({name:p.name,score:0,you:p.id===user.id})),question:null,message:match.reason==='peer_disconnected'?'Суперник втратив зв’язок. Можна знайти іншого.':'Матч скасовано. Можна почати новий пошук.'};}
export async function processMatchmaking(input,store,bank,user,clock=Date.now){
 if(!user||!validUuid(user.id)||typeof user.name!=='string'||!user.name.trim())throw new DuelError('Увійди у свій акаунт.',401);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new DuelError('Некоректний запит.');
 if(['search','poll','cancel'].includes(input.action)){
  if(!validUuid(input.ticket))throw new DuelError('Некоректний запит пошуку.');
  const view=await queueAction(input,user,store,clock);if(view.status!=='matched')return view;
  input={action:'state',matchId:view.match.id};
 }
 if(!['state','answer','ready','leave'].includes(input.action)||!validUuid(input.matchId))throw new DuelError('Некоректна дія матчу.');
 const match=await transact(store,(q,now)=>{
  const m=ownMatch(q,input.matchId,user.id);
  if(input.action==='leave')endMatch(q,m,now,'cancelled','player_left');
  else if(m.status==='active'){m.seen[user.id]=now;const peer=m.users.find(p=>p.id!==user.id);if(m.seen[peer.id]+PEER_GRACE<=now)endMatch(q,m,now,'cancelled','peer_disconnected');}
  return m;
 },clock);
 if(match.status==='cancelled')return cancelledView(match,user,clock());
 const room=await provisionMatchedDuel(match,store,bank,clock);
 const data=await processDuel({action:input.action==='leave'?'state':input.action,room,round:input.round,index:input.index,match:1},store,bank,clock,user.id);
 if(data.phase==='end')await transact(store,(q,now)=>{const m=ownMatch(q,match.id,user.id);endMatch(q,m,now,'finished','completed');return null;},clock);
 return {...data,status:'matched',automatic:true,matchId:match.id};
}
export async function pruneMatchmaking(store,clock=Date.now){await transact(store,()=>null,clock);}
