import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import vm from 'node:vm';
import {processMatchmaking,QUEUE_KEY,pruneMatchmaking} from './netlify/lib/matchmaking-core.mjs';import {processDuel,DuelError} from './netlify/lib/duel-core.mjs';import {authenticateMatchRequest} from './netlify/lib/matchmaking-auth.mjs';import bank from './netlify/lib/question-bank.mjs';
function memoryStore(){const records=new Map();let n=0;return {records,async getWithMetadata(key){await Promise.resolve();return records.has(key)?structuredClone(records.get(key)):null;},async setJSON(key,data,opts={}){await Promise.resolve();const old=records.get(key);if(opts.onlyIfNew&&old||opts.onlyIfMatch&&opts.onlyIfMatch!==old?.etag)return {modified:false};const entry={data:structuredClone(data),etag:String(++n)};records.set(key,entry);return {modified:true,etag:entry.etag};}};}
const user=n=>({id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),name:'Гравець '+n});const ticket=()=>crypto.randomUUID();let now=100000;const a=user(1),b=user(2),c=user(3),d=user(4),tA=ticket(),tB=ticket(),store=memoryStore();
const call=(input,who=a,s=store)=>processMatchmaking(input,s,bank,who,()=>now);
assert.equal((await call({action:'search',ticket:tA})).status,'searching');
const found=await call({action:'search',ticket:tB},b),id=found.matchId;assert.equal(found.status,'matched');assert.equal(found.phase,'waiting');assert.equal(found.players.length,2);assert(!JSON.stringify(found).includes('accountId'));assert(!JSON.stringify(found).includes('correct'));
const first=await call({action:'poll',ticket:tA});assert.equal(first.matchId,id);assert.equal(first.room,found.room);
await assert.rejects(()=>call({action:'state',matchId:id},c));await assert.rejects(()=>processDuel({action:'state',room:first.room,accountId:a.id,token:'0'.repeat(48)},store,bank,()=>now));await assert.rejects(()=>call({action:'search',ticket:[ticket()]}));
await call({action:'search',ticket:ticket()},a);assert.equal(Object.values(store.records.get(QUEUE_KEY).data.matches).length,1);
for(let round=1;round<=15;round++){
 await Promise.all([call({action:'ready',matchId:id,round:round-1}),call({action:'ready',matchId:id,round:round-1},b)]);
 const state=await call({action:'state',matchId:id});assert.equal(state.round,round);assert.equal(state.startsAt-now,round===1?3000:2000);assert.equal(state.deadline-state.startsAt,10000);assert(!Object.hasOwn(state,'correct'));
 await assert.rejects(()=>call({action:'answer',matchId:id,round,index:0}));now=state.startsAt;
 const plan=store.records.get('room/'+state.room).data.plan,correct=plan[round-1].correct;
 const answer=await call({action:'answer',matchId:id,round,index:correct});assert(!Object.hasOwn(answer,'correct'));
 const hidden=await call({action:'state',matchId:id},b);assert.equal(hidden.selection,null);
 const result=await call({action:'answer',matchId:id,round,index:(correct+1)%4},b);assert.equal(result.correct,correct);assert.equal(result.phase,round===15?'end':'result');
}
const final=await call({action:'state',matchId:id});assert.equal(final.players.find(p=>p.you).score,1500);assert.equal(Object.keys(store.records.get(QUEUE_KEY).data.entries).length,0);
assert.equal((await call({action:'search',ticket:ticket()})).status,'searching');assert.equal((await call({action:'state',matchId:id},b)).phase,'end');

const races=memoryStore();await Promise.all([a,b,c,d].map(who=>call({action:'search',ticket:ticket()},who,races)));const paired=Object.values(races.records.get(QUEUE_KEY).data.matches);assert.equal(paired.length,2);assert.equal(new Set(paired.flatMap(m=>m.users.map(p=>p.id))).size,4);
const tabs=memoryStore();await Promise.all(Array.from({length:12},()=>call({action:'search',ticket:ticket()},a,tabs)));assert.equal(Object.keys(tabs.records.get(QUEUE_KEY).data.entries).length,1);
const cancelStore=memoryStore(),old=ticket(),fresh=ticket();await call({action:'cancel',ticket:old},a,cancelStore);assert.equal((await call({action:'search',ticket:old},a,cancelStore)).status,'idle');await call({action:'search',ticket:fresh},a,cancelStore);await call({action:'cancel',ticket:old},a,cancelStore);assert.equal((await call({action:'poll',ticket:fresh},a,cancelStore)).status,'searching');
const cancelledPair=await call({action:'search',ticket:ticket()},b,cancelStore);await call({action:'cancel',ticket:fresh},a,cancelStore);assert.equal((await call({action:'state',matchId:cancelledPair.matchId},b,cancelStore)).phase,'cancelled');
const leases=memoryStore(),leaseTicket=ticket();await call({action:'search',ticket:leaseTicket},a,leases);now+=20001;assert.equal((await call({action:'poll',ticket:leaseTicket},a,leases)).status,'idle');await call({action:'search',ticket:ticket()},a,leases);const disconnect=await call({action:'search',ticket:ticket()},b,leases);now+=25001;assert.equal((await call({action:'state',matchId:disconnect.matchId},a,leases)).phase,'cancelled');
now+=31*60000;await pruneMatchmaking(leases,()=>now);assert.equal(Object.keys(leases.records.get(QUEUE_KEY).data.matches).length,0);
await assert.rejects(()=>processMatchmaking({action:'search',ticket:ticket()},{getWithMetadata:async()=>null,setJSON:async()=>({modified:true})},bank,a,()=>now),e=>e.status===503);

const settings={url:'https://project.supabase.co',key:'sb_publishable_test'},headers=auth=>({get:k=>k==='authorization'?auth:null});let authCalls=0;
const jwt=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({exp:9999999999})).toString('base64url')+'.signature';
const verify=async url=>{authCalls++;return {ok:true,json:async()=>String(url).includes('/auth/')?{id:a.id,aud:'authenticated'}:[{nickname:'Профільний нік'}]};};
await assert.rejects(()=>authenticateMatchRequest({headers:headers('')},settings,verify));const identity=await authenticateMatchRequest({headers:headers('Bearer '+jwt)},settings,verify,()=>now);assert.equal(identity.name,'Профільний нік');await authenticateMatchRequest({headers:headers('Bearer '+jwt)},settings,verify,()=>now);assert.equal(authCalls,2);
await assert.rejects(()=>authenticateMatchRequest({headers:headers('Bearer '+jwt+'bad')},settings,async()=>({ok:false}),()=>now));
// Actual HTTP adapter: no anonymous search, same-origin JSON only, and body IDs ignored.
const httpStore=memoryStore(),ctx=vm.createContext({getStore:()=>httpStore,DuelError,processMatchmaking,authenticateMatchRequest:async request=>{if(request.headers.get('authorization')!=='Bearer valid')throw new DuelError('Увійди',401);return a;},bank,settings,Response,URL,console});
const source=(await readFile(new URL('./netlify/functions/matchmaking.mjs',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace('export default async function','async function').replace('export const config','const config');vm.runInContext(source+'\nglobalThis.handle=handler;',ctx);
const req=(body,extra={})=>({method:extra.method||'POST',url:'https://game.example/api/matchmaking',headers:{get:key=>({'content-type':'application/json',origin:'https://game.example',authorization:'Bearer valid',...extra.headers}[key]||null)},text:async()=>body});
assert.equal((await ctx.handle(req('{}',{method:'GET'}))).status,405);assert.equal((await ctx.handle(req('{}',{headers:{origin:'https://other.example'}}))).status,403);assert.equal((await ctx.handle(req('{}',{headers:{authorization:''}}))).status,401);assert.equal((await ctx.handle(req('x'.repeat(2049)))).status,413);
const admitted=await ctx.handle(req(JSON.stringify({action:'search',ticket:ticket(),userId:b.id,name:'Fake name'})));assert.equal(admitted.status,200);assert.equal(httpStore.records.get(QUEUE_KEY).data.entries[a.id].name,a.name);assert(!httpStore.records.get(QUEUE_KEY).data.entries[b.id]);
const report={atomicPairing:true,noSelfMatch:true,singleQueueEntryAcrossTabs:true,oneRoomPerPair:true,privateQuestions:true,guestCannotAccessAutomaticRoom:true,foreignAccountRejected:true,fifteenRounds:true,initialCountdownSeconds:3,waitingLeaseExpiry:true,disconnectCancellation:true,staleCancellationSafe:true,cancelBeforeJoinSafe:true,finishedPlayersCanSearchAgain:true,authenticationVerifiedServerSide:true,requestUserIdIgnored:true,httpGuards:true};await writeFile(new URL('./matchmaking-test-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
