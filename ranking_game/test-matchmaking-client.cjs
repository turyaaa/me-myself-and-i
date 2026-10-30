const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const nodes=new Map();let timerId=0;const timers=new Map(),memory=new Map();let gameNow=100000;const pending=[];let gameCall,gameStore;
function element(){return {hidden:true,children:[],dataset:{},attributes:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},textContent:'',value:'',offsetWidth:1,setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},replaceChildren(...items){this.children=items},querySelector(){return element()},querySelectorAll(){return []},addEventListener(){},focus(){},insertAdjacentHTML(){},set innerHTML(v){this.children=[]}};}
const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},storage=new Map();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const categories=Array.from({length:5},(_,i)=>({name:'Категорія '+i,qs:Array.from({length:5},(_,j)=>['Q'+j,'A'+j])}));
let session={user:{id:a},access_token:'verified-a'},authListener,clientOptions,oauthOptions,stale=false,version=0,reads=[];
const profiles=[a,b].map(id=>({id,nickname:'Гравець '+id.slice(-1),created_at:'2026-10-30T00:00:00Z',updated_at:'p0'}));let signupOptions,recoveryOptions,passwordChanged,admin=false;
const rows=[{id:'11111111-1111-4111-8111-111111111111',owner_id:b,title:'<img src=x onerror=alert(1)>',description:'Текст від автора',author_name:'Інший автор',categories,status:'published',category_count:5,created_at:'2026-10-30T00:00:00Z',updated_at:'2026-10-30T00:00:00Z'}];
class Query{
 constructor(table){this.table=table;this.filters=[];this.op='read';}
 select(columns){this.columns=columns;if(this.op==='read')reads.push(columns);return this;}
 eq(k,v){this.filters.push([k,v]);return this;}
 order(){return this;}ilike(){return this;}
 update(data){this.op='update';this.data=data;return this;}
 insert(data){this.op='insert';this.data=data;return this;}
 delete(){this.op='delete';return this;}
 async range(lo,hi){let data=rows.filter(r=>this.filters.every(([k,v])=>r[k]===v));return {data:structuredClone(data.slice(lo,hi+1)),count:data.length,error:null};}
 async maybeSingle(){
  const source=this.table==='profiles'?profiles:rows;let row=source.find(r=>this.filters.every(([k,v])=>r[k]===v));
  if(this.op==='insert'){row={...structuredClone(this.data),id:'22222222-2222-4222-8222-222222222222',category_count:this.data.categories.length,created_at:'2026-10-30T00:00:00Z',updated_at:'v'+(++version)};rows.push(row);}
  if(this.op==='update'){if(stale)return {data:null,error:null};if(row)Object.assign(row,structuredClone(this.data),{updated_at:'v'+(++version)});}
  if(this.op==='delete'&&row)rows.splice(rows.indexOf(row),1);
  return {data:row?structuredClone(row):null,error:null};
 }
}
const client={from:table=>new Query(table),rpc:async name=>({data:name==='is_game_admin'?admin:[],error:null}),auth:{getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:session?.user},error:null}),onAuthStateChange:fn=>{authListener=fn},signInWithOAuth:async options=>{oauthOptions=options;return {error:null}},signUp:async options=>{signupOptions=options;return {data:{session:null},error:null}},signInWithPassword:async()=>{session={user:{id:a,email:'player@example.com'}};authListener('SIGNED_IN',session);return {data:session,error:null}},resetPasswordForEmail:async(email,options)=>{recoveryOptions={email,options};return {error:null}},updateUser:async options=>{passwordChanged=options.password;return {data:{user:session.user},error:null}},signOut:async()=>{session=null;authListener('SIGNED_OUT',null);return {error:null}}}};
const ctx=vm.createContext({console,Math,Date,Number,JSON,Error,Set,Map,Array,Object,String,parseFloat,isFinite,Intl,URL,structuredClone,AbortSignal,AbortController,crypto:require('node:crypto').webcrypto,
 sessionStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
 document:{getElementById:get,documentElement:{dataset:{}},body:element(),createElement:element,addEventListener(){},querySelectorAll:()=>[]},
 window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:true}),supabase:{createClient:(url,key,options)=>{clientOptions=options;return client;}}},
 location:{href:'https://therankinggame.netlify.app/'},history:{replaceState(){}},navigator:{clipboard:{writeText:async()=>{}}},
 performance:{now:()=>gameNow},matchMedia:()=>({matches:true}),requestAnimationFrame:()=>{},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),setInterval:()=>++timerId,clearInterval(){},confirm:()=>true,
 fetch:async(url,options)=>{if(url!=='/api/matchmaking')return {ok:true,json:async()=>({external:{google:true}})};const who=options.headers.Authorization==='Bearer verified-a'?{id:a,name:'Гравець 1'}:{id:b,name:'Гравець 2'};const task=gameCall(JSON.parse(options.body),gameStore,who);pending.push(task);const result=await task;return {ok:true,json:async()=>result};}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);

async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
async function run(){
 const {processMatchmaking}=await import('./netlify/lib/matchmaking-core.mjs');const {default:bank}=await import('./netlify/lib/question-bank.mjs');
 const records=new Map();let version=0;gameStore={records,async getWithMetadata(k){return structuredClone(records.get(k)||null)},async setJSON(k,data,opts={}){const old=records.get(k);if(opts.onlyIfNew&&old||opts.onlyIfMatch&&old?.etag!==opts.onlyIfMatch)return {modified:false};const etag=String(++version);records.set(k,{data:structuredClone(data),etag});return {modified:true,etag}}};
 gameCall=(input,store,who)=>processMatchmaking(input,store,bank,who,()=>gameNow);
 await vm.runInContext('bootLibrary()',ctx);vm.runInContext('showBlitzSetup()',ctx);assert.equal(get('bfind').textContent,'Знайти суперника');
 await get('bfind').onclick();assert.equal(vm.runInContext('MM.phase',ctx),'searching');assert.equal(get('bsearch-panel').hidden,false);assert.equal(get('bsolo').disabled,true);assert.equal(get('bcreate').disabled,true);
 const oldTicket=vm.runInContext('MM.ticket',ctx);get('bsearch-cancel').onclick();await Promise.all(pending);await flush();assert.equal(get('bsearch-panel').hidden,true);assert.equal(get('bcreate').disabled,false);assert.equal(memory.has('ranking_matchmaking'),false);
 assert.equal((await gameCall({action:'poll',ticket:oldTicket},gameStore,{id:a,name:'Гравець 1'})).status,'idle');
 await get('bfind').onclick();const found=await gameCall({action:'search',ticket:crypto.randomUUID()},gameStore,{id:b,name:'Гравець 2'});
 await vm.runInContext('pollAutomaticSearch(MM.epoch)',ctx);assert.equal(vm.runInContext('B.automatic',ctx),true);assert.equal(vm.runInContext('B.matchId',ctx),found.matchId);assert.equal(get('barena').hidden,false);assert.equal(get('broom').hidden,true);assert.equal(get('btitle').textContent,'Блітз · Онлайн');
 const ready=[...timers.values()].filter(t=>t.ms===0&&String(t.fn).includes('autoReadyScheduled'));assert.equal(ready.length,1,'automatically confirms ready');ready[0].fn();await flush();await Promise.all(pending);await flush();
 await gameCall({action:'ready',matchId:found.matchId,round:0},gameStore,{id:b,name:'Гравець 2'});
 ctx.snapshot=await vm.runInContext("duelRequest('state')",ctx);vm.runInContext('renderDuel(snapshot)',ctx);assert.equal(ctx.snapshot.startsAt-gameNow,3000);assert.equal(get('bcountdown-digit').textContent,'3');assert(get('boptions').children.every(button=>button.disabled));
 assert(!JSON.stringify(ctx.snapshot).includes('correct'));gameNow=ctx.snapshot.startsAt;
 const plan=records.get('room/'+found.room).data.plan;await vm.runInContext('duelAction("answer",{round:1,index:'+plan[0].correct+'})',ctx);assert.equal(vm.runInContext('B.snapshot.answered',ctx),true);
 const leave=await vm.runInContext("duelRequest('leave')",ctx);vm.runInContext('renderDuel('+JSON.stringify(leave)+')',ctx);assert.equal(get('breplay').textContent,'Знайти нового суперника');
 vm.runInContext('showBlitzSetup()',ctx);await get('bfind').onclick();session=null;authListener('SIGNED_OUT',null);await flush();assert.equal(vm.runInContext('MM.phase',ctx),'idle');assert.equal(memory.has('ranking_matchmaking'),false);assert.equal(get('bfind').textContent,'Увійти для пошуку');
 await get('bfind').onclick();assert.equal(get('account').hidden,false);
 const result={realHtmlFlow:true,authenticatedSearch:true,cancellation:true,controlsLockedDuringSearch:true,serverMatchAdopted:true,automaticReady:true,countdownThreeSeconds:true,answerPrivate:true,cancelledMatchReplay:true,logoutCancelsSearch:true,guestSignInPrompt:true};fs.writeFileSync('matchmaking-client-test-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
