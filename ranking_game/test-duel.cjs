const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto'),{TextEncoder}=require('node:util'),path=require('node:path');
async function run(){
 const source=fs.readFileSync(path.join(__dirname,'netlify/lib/duel-core.mjs'),'utf8').replace(/^export /gm,'');
 const ctx=vm.createContext({crypto:webcrypto,TextEncoder,Date,console,Uint8Array,Uint32Array});
 vm.runInContext(source+'\nglobalThis.api={processDuel,makePlan,DuelError};',ctx);
 const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'netlify/lib/question-bank.mjs'),'utf8').split('export default ')[1].trim().replace(/;$/,''));
 const records=new Map();let version=0,conflicts=0,readBarrier=null;
 const store={
  async getWithMetadata(key){const x=records.get(key),snapshot=x?structuredClone(x):null;if(readBarrier)await new Promise(resolve=>{readBarrier.push(resolve);if(readBarrier.length===2){const waiting=readBarrier;readBarrier=null;waiting.forEach(fn=>fn());}});return snapshot;},
  async setJSON(key,data,options){await Promise.resolve();const old=records.get(key);if((options.onlyIfNew&&old)||(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)){conflicts++;return {modified:false};}const etag=String(++version);records.set(key,{data:structuredClone(data),etag});return {modified:true,etag};}
 };
 let now=1000000;const call=input=>ctx.api.processDuel(input,store,bank,()=>now);
 const a=await call({action:'create',name:'Аня'});
 assert(a.token&&a.phase==='waiting');assert(!JSON.stringify(a).includes('secretHash'));assert.equal(a.question,null);
 const b=await call({action:'join',room:a.room,name:'Богдан'});
 await assert.rejects(()=>call({action:'join',room:a.room,name:'Третій'}));
 await assert.rejects(()=>call({action:'state',room:a.room,token:'0'.repeat(48)}));
 const input=(action,p,extra={})=>({action,room:a.room,token:p.token,...extra});
 let round=0;
 while(round<15){
  readBarrier=[];
  await Promise.all([call(input('ready',a,{round})),call(input('ready',b,{round}))]);round++;
  const state=await call(input('state',a));assert.equal(state.round,round);assert.equal(state.total,15);assert.equal(state.startsAt-now,round===1?3000:2000);assert.equal(state.phase,'question');assert(!Object.hasOwn(state,'correct'));assert.equal(state.deadline-state.startsAt,10000);
  assert.equal(new Set(state.question.options).size,4);
  await assert.rejects(()=>call(input('answer',a,{round,index:0}))); // synchronized start not yet reached
  now=state.startsAt;
  const correct=records.get('room/'+a.room).data.plan[round-1].correct;
  const wrong=(correct+1)%4;
  if(round===2){
   now=state.deadline;
   const late=await call(input('answer',a,{round,index:correct}));
   assert.equal(late.phase,'result');assert.equal(late.selection,null);
  }else{
   const first=await call(input('answer',a,{round,index:correct}));assert.equal(first.phase,'question');assert(!Object.hasOwn(first,'correct'));
   const opponent=await call(input('state',b));assert.equal(opponent.selection,null);assert.equal(opponent.answered,false);
   await call(input('answer',a,{round,index:wrong})); // duplicate cannot replace first answer
   const revealed=await call(input('answer',b,{round,index:wrong}));assert.equal(revealed.correct,correct);
  }
  const result=await call(input('state',a));assert.equal(result.phase,round===15?'end':'result');
  assert.equal(result.players[0].score,(round-(round>=2?1:0))*100);assert.equal(result.players[1].score,0);
 }
 const final=await call(input('state',a));assert.equal(final.players[0].score,1400);
 await call(input('answer',a,{round:15,index:0}));assert.equal((await call(input('state',a))).players[0].score,1400);
 const oldPlan=structuredClone(records.get('room/'+a.room).data.plan);
 const voting=await call(input('rematch',a,{match:1}));assert.equal(voting.phase,'end');assert.equal(voting.rematch,true);assert.equal(voting.players[0].rematch,true);
 const rematch=await call(input('rematch',b,{match:1}));assert.equal(rematch.room,a.room);assert.equal(rematch.match,2);assert.equal(rematch.round,1);assert.equal(rematch.phase,'question');assert.equal(rematch.startsAt-now,3000);assert(rematch.players.every(p=>p.score===0));
 assert.equal(rematch.players.map(p=>p.name).join(','),'Аня,Богдан');
 assert(records.get('room/'+a.room).data.plan.every(q=>!oldPlan.some(old=>old.category===q.category&&old.prompt===q.prompt)));
 now=rematch.startsAt;
 await call(input('answer',a,{match:1,round:1,index:0}));assert.equal((await call(input('state',a))).answered,false);
 await call(input('rematch',b,{match:1}));assert.equal((await call(input('state',a))).match,2);
 const rematchCorrect=records.get('room/'+a.room).data.plan[0].correct;
 await call(input('answer',a,{match:2,round:1,index:rematchCorrect}));await call(input('answer',b,{match:2,round:1,index:rematchCorrect}));
 const tied=await call(input('state',a));assert.equal(tied.phase,'result');assert(tied.players.every(p=>p.score===100));
 const c=await call({action:'create',name:'Віра'}),d=await call({action:'join',room:c.room,name:'Данило'});
 await call({action:'leave',room:c.room,token:d.token});assert.equal((await call({action:'state',room:c.room,token:c.token})).phase,'cancelled');
 const e=await call({action:'create',name:'Єва'});now+=1800001;await assert.rejects(()=>call({action:'state',room:e.room,token:e.token}));
 await assert.rejects(()=>call({action:'create',name:'x'.repeat(25)}));
 assert(conflicts>0,'concurrent ready requests exercised ETag retry');
 // A storage failure reporting modified=true without an ETag must not be accepted.
 await assert.rejects(()=>ctx.api.processDuel({action:'create',name:'Test'},{setJSON:async()=>({modified:true})},bank,()=>now));
 // Rooms created by the previous ten-question release still finish normally.
 const legacyA=await call({action:'create',name:'Old A'});
 await call({action:'join',room:legacyA.room,name:'Old B'});
 const legacy=records.get('room/'+legacyA.room).data;
 legacy.plan=legacy.plan.slice(0,10);legacy.round=10;legacy.phase='question';legacy.startsAt=now-10000;legacy.deadline=now;legacy.answers=Array.from({length:10},()=>({}));
 const legacyEnd=await call({action:'state',room:legacyA.room,token:legacyA.token});
 assert.equal(legacyEnd.phase,'end');assert.equal(legacyEnd.total,10);
 const themed=await call({action:'create',name:'Кіноман',selection:{family:'Фільми',ids:['potter','starwars']}});
 const themedPlan=records.get('room/'+themed.room).data.plan;assert.equal(themedPlan.length,15);assert(themedPlan.every(q=>/Star Wars|Гаррі Поттер/.test(q.category)));
 await assert.rejects(()=>call({action:'create',name:'Bad',selection:{family:'Фільми',ids:['injected']}}));
 const rap=await call({action:'create',name:'Rap',selection:{family:'Музика',ids:['rap']}});assert.equal(rap.total,15);
 const story=await call({action:'create',name:'BB',selection:{family:'Серіали',ids:['breakingbad']}});assert.equal(story.total,15);assert(records.get('room/'+story.room).data.plan.every(q=>q.category.includes('Breaking Bad')));
 const allSeries=await call({action:'create',name:'All series',selection:{family:'Серіали',ids:['breakingbad','got','friends','stranger','saul','office']}});assert.equal(allSeries.total,15);
 const geo=await call({action:'create',name:'Geo',selection:{family:'Географія',ids:[]}});assert.equal(geo.total,15);
 const football=await call({action:'create',name:'Football',selection:{family:'Футбол',ids:['fb-offside','fb-referee','fb-data']}});assert.equal(football.total,15);assert(records.get('room/'+football.room).data.plan.every(q=>q.category==='Футбол'));
 const allFootball=await call({action:'create',name:'Football all',selection:{family:'Футбол',ids:[]}});assert.equal(allFootball.total,15);assert(records.get('room/'+allFootball.room).data.plan.every(q=>q.category==='Футбол'));
 for(const record of records.values())for(const question of record.data.plan||[]){
  const c=bank.find(c=>c.title===question.category),item=c?.items.find(i=>i[0]===question.prompt);
  if(c?.kind==='trivia')assert.deepEqual([...question.options].sort(),[item[1],...item[3]].sort());
 }
 // Exercise the actual HTTP adapter with injected storage, without Netlify credentials.
 ctx.getStore=()=>store;ctx.bank=bank;
 ctx.Response=class {constructor(body,options){this.body=body;this.status=options.status;this.headers=options.headers;}json(){return JSON.parse(this.body);}};
 const adapter=fs.readFileSync(path.join(__dirname,'netlify/functions/duel.mjs'),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default async function','async function').replace('export const config','const config');
 vm.runInContext(adapter+'\nglobalThis.handler=handler;',ctx);ctx.URL=URL;
 const request=(body,options={})=>({method:options.method||'POST',url:'https://game.example/api/duel',headers:{get:key=>({'content-type':'application/json',origin:'https://game.example',...options.headers}[key]||null)},text:async()=>body});
 assert.equal((await ctx.handler(request('{}',{method:'GET'}))).status,405);
 assert.equal((await ctx.handler(request('{}',{headers:{origin:'https://attacker.example'}}))).status,403);
 assert.equal((await ctx.handler(request('{}',{headers:{'content-type':'text/plain'}}))).status,415);
 assert.equal((await ctx.handler(request('invalid'))).status,400);
 assert.equal((await ctx.handler(request('x'.repeat(2049)))).status,413);
 const createdHTTP=await ctx.handler(request(JSON.stringify({action:'create',name:'HTTP player'})));
 assert.equal(createdHTTP.status,200);assert(createdHTTP.json().token);assert.equal(createdHTTP.headers['Cache-Control'],'no-store');
 console.log(JSON.stringify({duelRounds:15,rematchSameRoom:true,rematchFreshQuestions:true,staleMatchRejected:true,concurrentReady:true,privacy:true,strictDeadline:true,idempotentAnswers:true,reconnect:true,expiry:true,storageFailures:true,casConflicts:conflicts}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
