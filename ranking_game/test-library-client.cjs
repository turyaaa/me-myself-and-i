const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const nodes=new Map();
function element(){return {hidden:true,children:[],dataset:{},attributes:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},textContent:'',value:'',offsetWidth:1,setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},replaceChildren(...items){this.children=items},querySelector(){return element()},querySelectorAll(){return []},addEventListener(){},focus(){},insertAdjacentHTML(){},set innerHTML(v){this.children=[]}};}
const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},storage=new Map();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const categories=Array.from({length:5},(_,i)=>({name:'Категорія '+i,qs:Array.from({length:5},(_,j)=>['Q'+j,'A'+j])}));
let session={user:{id:a}},authListener,clientOptions,oauthOptions,stale=false,version=0,reads=[];
const rows=[{id:'11111111-1111-4111-8111-111111111111',owner_id:b,title:'<img src=x onerror=alert(1)>',description:'Текст від автора',author_name:'Інший автор',categories,status:'published',category_count:5,created_at:'2026-10-30T00:00:00Z',updated_at:'2026-10-30T00:00:00Z'}];
class Query{
 constructor(){this.filters=[];this.op='read';}
 select(columns){this.columns=columns;if(this.op==='read')reads.push(columns);return this;}
 eq(k,v){this.filters.push([k,v]);return this;}
 order(){return this;}ilike(){return this;}
 update(data){this.op='update';this.data=data;return this;}
 insert(data){this.op='insert';this.data=data;return this;}
 delete(){this.op='delete';return this;}
 async range(lo,hi){let data=rows.filter(r=>this.filters.every(([k,v])=>r[k]===v));return {data:structuredClone(data.slice(lo,hi+1)),count:data.length,error:null};}
 async maybeSingle(){
  let row=rows.find(r=>this.filters.every(([k,v])=>r[k]===v));
  if(this.op==='insert'){row={...structuredClone(this.data),id:'22222222-2222-4222-8222-222222222222',category_count:this.data.categories.length,created_at:'2026-10-30T00:00:00Z',updated_at:'v'+(++version)};rows.push(row);}
  if(this.op==='update'){if(stale)return {data:null,error:null};if(row)Object.assign(row,structuredClone(this.data),{updated_at:'v'+(++version)});}
  if(this.op==='delete'&&row)rows.splice(rows.indexOf(row),1);
  return {data:row?structuredClone(row):null,error:null};
 }
}
const client={from:()=>new Query(),auth:{getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:session?.user},error:null}),onAuthStateChange:fn=>{authListener=fn},signInWithOAuth:async options=>{oauthOptions=options;return {error:null}},signOut:async()=>{session=null;authListener('SIGNED_OUT',null);return {error:null}}}};
const ctx=vm.createContext({console,Math,Date,Number,JSON,Error,Set,Map,Array,Object,String,parseFloat,isFinite,Intl,URL,structuredClone,AbortSignal,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
 document:{getElementById:get,documentElement:{dataset:{}},body:element(),createElement:element,addEventListener(){},querySelectorAll:()=>[]},
 window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:true}),supabase:{createClient:(url,key,options)=>{clientOptions=options;return client;}}},
 location:{href:'https://therankinggame.netlify.app/'},history:{replaceState(){}},navigator:{clipboard:{writeText:async()=>{}}},
 performance:{now:()=>0},matchMedia:()=>({matches:true}),requestAnimationFrame:()=>{},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},confirm:()=>true,
 fetch:async()=>({ok:true,json:async()=>({external:{google:true}})})});
vm.runInContext(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
async function run(){
 await vm.runInContext('showLibrary()',ctx);assert.equal(clientOptions.auth.flowType,'pkce');assert.equal(get('lib-cards').children.length,1);assert.equal(get('lib-cards').children[0].children[0].textContent,rows[0].title);assert(!reads[0].includes('categories'));
 await get('lib-google').onclick();assert.equal(oauthOptions.provider,'google');assert.equal(oauthOptions.options.redirectTo,'https://therankinggame.netlify.app/');
 ctx.inputDraft={title:'Наша гра',description:'Для компанії',author_name:'Автор',categories:structuredClone(categories)};
 vm.runInContext('composeLibraryQuiz(inputDraft)',ctx);await vm.runInContext('saveLibraryQuiz(true)',ctx);const own=rows.find(r=>r.owner_id===a);assert(own);assert.equal(own.status,'published');assert.equal(get('lib-detail').hidden,false);assert.equal(get('lib-publish').disabled,false);
 ctx.ownRow=structuredClone(own);vm.runInContext('composeLibraryQuiz(ownRow);L.draft.title="Нова назва"',ctx);stale=true;await vm.runInContext('saveLibraryQuiz(true)',ctx);assert(get('lib-status').textContent.includes('іншій вкладці'));assert.equal(vm.runInContext('L.draft.title',ctx),'Нова назва');assert.equal(own.title,'Наша гра');stale=false;
 session={user:{id:b}};authListener('SIGNED_IN',session);assert.equal(get('lib-compose').hidden,true);assert.equal(get('lib-detail').children.length,0);assert.equal(vm.runInContext('L.draft',ctx),null);
 vm.runInContext('composeLibraryQuiz(ownRow)',ctx);await vm.runInContext('saveLibraryQuiz(true)',ctx);assert(get('lib-status').textContent.includes('іншому акаунту'));assert.equal(rows.length,2);
 await get('lib-signout').onclick();assert.equal(vm.runInContext('L.user',ctx),null);assert.equal(get('lib-signout').hidden,true);
 const result={pkce:true,googleRedirect:true,publicBrowse:true,untrustedTitlesAsText:true,publishOwnerAttached:true,staleEditPreservesDraft:true,accountSwitchClearsPrivateUI:true,foreignDraftSaveBlocked:true,signOut:true};fs.writeFileSync(path.join(__dirname,'library-client-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
