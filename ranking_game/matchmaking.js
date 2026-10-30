// One public queue. Membership and game actions are authenticated on Netlify.
const MM={phase:'idle',epoch:0,poll:null,clock:null,abort:null,ticket:null,accountId:null,started:0,authError:false};
function searchMemory(value){try{if(value)sessionStorage.setItem('ranking_matchmaking',JSON.stringify(value));else sessionStorage.removeItem('ranking_matchmaking');}catch(_){} }
function savedSearch(){try{const value=JSON.parse(sessionStorage.getItem('ranking_matchmaking')||'null');return value?.accountId===L.user?.id&&typeof value.ticket==='string'?value:null;}catch(_){return null;} }
function renderMatchmakingAuth(){
 const searching=MM.phase==='searching',starting=MM.phase==='starting';
 $('bfind').hidden=searching;$('bfind').disabled=starting;$('bfind').textContent=starting?'Підключаємо…':!L.user||MM.authError?'Увійти для пошуку':'Знайти суперника';
 $('bsearch-panel').hidden=!(searching||starting);
 for(const id of ['bsolo','bcreate','bjoin','bresume'])$(id).disabled=searching||starting;
}
async function automaticRequest(action,payload={},options={}){
 if(typeof location==='undefined'||!/^https?:$/.test(new URL(location.href).protocol))throw Error('Онлайн-пошук доступний на сайті гри.');
 const client=await bootLibrary(),{data,error}=await client.auth.getSession();
 if(error||!data.session?.access_token||options.accountId&&data.session.user.id!==options.accountId){const failure=Error('Для пошуку й матчу увійди у свій акаунт.');failure.status=401;throw failure;}
 const sent=performance.now();let response;
 try{response=await fetch('/api/matchmaking',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action,...payload}),cache:'no-store',signal:options.signal||AbortSignal.timeout(12000)});}catch(error){if(error.name==='AbortError')throw error;throw Error('Немає зв’язку. Перевір інтернет.');}
 let result;try{result=await response.json();}catch(_){throw Error('Пошук зараз недоступний. Спробуй трохи пізніше.');}
 if(!response.ok){const failure=Error(result.error||'Не вдалося виконати дію.');failure.status=response.status;throw failure;}
 result.latency=Math.max(0,performance.now()-sent-(Number(result.processingMs)||0))/2;return result;
}
function cleanupMatchmaking(cancel=true){
 const previous={ticket:MM.ticket,accountId:MM.accountId,active:['starting','searching'].includes(MM.phase)};
 MM.epoch++;if(MM.poll!==null)clearTimeout(MM.poll);if(MM.clock!==null)clearInterval(MM.clock);MM.poll=null;MM.clock=null;MM.abort?.abort();MM.abort=null;MM.phase='idle';MM.ticket=null;MM.accountId=null;
 if(previous.active){searchMemory(null);if(cancel&&previous.ticket&&previous.accountId)automaticRequest('cancel',{ticket:previous.ticket},{accountId:previous.accountId}).catch(()=>{});}
 renderMatchmakingAuth();
}
function cancelAutomaticSearch(){cleanupMatchmaking();$('berror').textContent='Пошук скасовано.';}
function renderSearchTime(){
 const elapsed=Math.max(0,Math.floor((performance.now()-MM.started)/1000));$('bsearch-time').textContent=Math.floor(elapsed/60)+':'+String(elapsed%60).padStart(2,'0');
 const message=elapsed>=60?'Поки немає суперника. Пошук триває…':'Шукаємо суперника…';if($('bsearch-status').textContent!==message)$('bsearch-status').textContent=message;
}
function adoptAutomaticMatch(data){
 MM.phase='idle';cleanupMatchmaking(false);cleanupBlitz();
 B={online:true,automatic:true,accountId:L.user.id,matchId:data.matchId,phase:data.phase,room:data.room,selected:null,pending:false};
 searchMemory({ticket:crypto.randomUUID(),accountId:B.accountId,matchId:B.matchId});
 $('bsetup').hidden=true;$('barena').hidden=false;$('broom').hidden=true;$('berror').textContent='';renderDuel(data);scheduleDuelPoll();
}
async function pollAutomaticSearch(epoch,action='poll'){
 if(epoch!==MM.epoch)return;
 try{const result=await automaticRequest(action,{ticket:MM.ticket},{accountId:MM.accountId,signal:MM.abort.signal});if(epoch!==MM.epoch)return;
  if(result.status==='matched'){adoptAutomaticMatch(result);return;}
  if(result.status==='idle'){cleanupMatchmaking(false);searchMemory(null);$('berror').textContent='Пошук завершено. Можна почати знову.';return;}
  if(result.ticket)MM.ticket=result.ticket;searchMemory({ticket:MM.ticket,accountId:MM.accountId});MM.phase='searching';
  if(Number.isFinite(result.joinedAt)&&Number.isFinite(result.serverNow))MM.started=performance.now()-Math.max(0,result.serverNow-result.joinedAt);
  if(MM.clock===null)MM.clock=setInterval(renderSearchTime,1000);renderSearchTime();renderMatchmakingAuth();$('berror').textContent='';
 }catch(error){if(epoch!==MM.epoch)return;if(error.name==='AbortError')return;$('berror').textContent=error.message;
  if([400,401,403,404,410].includes(error.status)){MM.authError=error.status===401;cleanupMatchmaking();return;}
 }
 if(epoch===MM.epoch&&['starting','searching'].includes(MM.phase))MM.poll=setTimeout(()=>pollAutomaticSearch(epoch),1500);
}
async function startAutomaticSearch(){
 if(['starting','searching'].includes(MM.phase))return;
 if(!L.user||MM.authError){showAuth('login');return;}
 cleanupBlitz();B={phase:'setup',online:false};const saved=savedSearch();MM.ticket=saved?.ticket||crypto.randomUUID();MM.accountId=L.user.id;MM.started=performance.now();MM.phase='starting';MM.abort=new AbortController();$('berror').textContent='';renderMatchmakingAuth();
 const epoch=++MM.epoch;searchMemory({ticket:MM.ticket,accountId:MM.accountId});await pollAutomaticSearch(epoch,'search');
}
function readyAutomaticMatch(data){
 if(!B?.automatic||data.ready||B.pending||B.autoReadyScheduled)return;B.autoReadyScheduled=true;const epoch=blitzEpoch;
 setTimeout(()=>{if(epoch!==blitzEpoch||!B?.automatic)return;B.autoReadyScheduled=false;duelAction('ready',{round:data.round});},0);
}
function replayBlitz(){
 if(B?.automatic){showBlitzSetup();startAutomaticSearch();}
 else if(B?.online&&B.phase==='end')duelAction('rematch');else showBlitzSetup();
}
function syncMatchmakingIdentity(user){
 MM.authError=false;
 if(MM.accountId&&MM.accountId!==user?.id){cleanupMatchmaking(false);searchMemory(null);}
 if(B?.automatic&&B.accountId!==user?.id){cleanupBlitz();searchMemory(null);if(!$('blitz').hidden)showBlitzSetup();}
 renderMatchmakingAuth();
}
$('bfind').onclick=startAutomaticSearch;$('bsearch-cancel').onclick=cancelAutomaticSearch;
