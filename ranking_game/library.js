// Accounts are supplied by Supabase Auth; database RLS owns all permissions.
const L={client:null,user:null,boot:null,view:'public',page:0,search:'',epoch:0,draft:null,category:0,busy:false};
const LIB_COLUMNS='id,owner_id,title,description,author_name,status,category_count,created_at,updated_at';
function libMessage(message,error=false){$('lib-status').textContent=message;$('lib-status').className=error?'sub lib-status-error':'sub';}
function libButton(label,action,cls=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=action;return b;}
function renderLibraryAuth(){
 $('lib-account').textContent='Sign in';$('lib-user').textContent=L.user?'Вхід виконано. Публікуй вікторини під обраним ніком.':'Акаунт потрібен для збереження й публікації. Грати можна без реєстрації.';
 $('lib-google').hidden=!!L.user;$('lib-signout').hidden=!L.user;
 renderAccountLinks();
}
async function bootLibrary(){
 if(L.boot)return L.boot;
 L.boot=(async()=>{
  if(!LIBRARY_CONFIG.url||!LIBRARY_CONFIG.key)throw Error('Публічна бібліотека ще не підключена. Поки можна створювати вікторини й грати локально.');
  if(!window.supabase?.createClient)throw Error('Не завантажився модуль входу. Перевір з’єднання й онови сторінку.');
  L.client=window.supabase.createClient(LIBRARY_CONFIG.url,LIBRARY_CONFIG.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  L.client.auth.onAuthStateChange((event,session)=>{const changed=L.user?.id!==session?.user?.id;L.user=session?.user||null;accountIdentityChanged(event,L.user);renderLibraryAuth();if(changed){L.epoch++;if(L.draft?.owner_id&&L.draft.owner_id!==L.user?.id){L.draft=null;$('lib-compose').hidden=true;}$('lib-detail').replaceChildren();$('lib-detail').hidden=true;$('lib-browse').hidden=false;if(!L.user)L.view='public';if(!$('library').hidden)setTimeout(()=>loadLibrary(),0);}});
  const {data,error}=await L.client.auth.getSession();if(error)throw error;L.user=data.session?.user||null;accountIdentityChanged('INITIAL_SESSION',L.user);
  renderLibraryAuth();
  if(typeof location!=='undefined'&&new URL(location.href).searchParams.has('code')){const url=new URL(location.href);url.searchParams.delete('code');history.replaceState(null,'',url);}
  return L.client;
 })().catch(error=>{L.boot=null;throw error;});return L.boot;
}
function libraryError(error){
 const code=error?.code;
 if(code==='42P01'||code==='PGRST205')return 'Бібліотека ще налаштовується. Спробуй трохи пізніше.';
 if(code==='42501')return 'Немає доступу до цієї дії. Увійди в акаунт автора.';
 if(code==='23514')return 'Перевір заповнення: для публікації потрібно мінімум 5 повних категорій.';
 if(code==='over_request_rate_limit')return 'Забагато спроб входу. Зачекай і спробуй ще раз.';
 return error instanceof Error&&!code?error.message:'Не вдалося виконати дію. Перевір з’єднання та спробуй ще раз.';
}
async function showLibrary(){
 show('library');$('lib-browse').hidden=false;$('lib-detail').hidden=true;$('lib-compose').hidden=true;renderLibraryAuth();await loadLibrary();
}
async function loadLibrary(){
 const epoch=++L.epoch;const view=L.view;
 $('lib-public').setAttribute('aria-pressed',String(view==='public'));$('lib-mine').setAttribute('aria-pressed',String(view==='mine'));
 $('lib-cards').replaceChildren();$('lib-next').hidden=true;$('lib-prev').hidden=true;$('lib-page').textContent='';libMessage('Завантажуємо вікторини…');
 try{
  const client=await bootLibrary();if(epoch!==L.epoch)return;
  if(view==='mine'&&!L.user){$('lib-auth').hidden=false;libMessage('Увійди, щоб бачити свої збережені вікторини.');return;}
  let query=client.from('quizzes').select(LIB_COLUMNS,{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false});
  query=view==='mine'?query.eq('owner_id',L.user.id):query.eq('status','published');
  if(L.search)query=query.ilike('title','%'+L.search.replace(/[\\%_]/g,'\\$&')+'%');
  const {data,error,count}=await query.range(L.page*12,L.page*12+11);if(error)throw error;if(epoch!==L.epoch)return;
  const box=$('lib-cards');box.replaceChildren();for(const row of data||[]){const card=document.createElement('article');card.className='lib-card';const title=document.createElement('h3');title.textContent=row.title;const meta=document.createElement('small');meta.textContent=row.author_name+' · '+row.category_count+' категорій'+(row.status==='draft'?' · Приватна':'');const desc=document.createElement('p');desc.textContent=row.description;card.append(title,meta,desc,libButton('Відкрити',()=>openLibraryQuiz(row.id)));box.append(card);}
  libMessage(data?.length?'':'Поки немає вікторин'+(L.search?' за цим запитом.':'. Створи першу для своєї компанії!'));
  $('lib-prev').hidden=L.page===0;$('lib-next').hidden=(L.page+1)*12>=(count||0);$('lib-page').textContent=count?'Сторінка '+(L.page+1):'';
 }catch(error){if(epoch===L.epoch)libMessage(libraryError(error),true);}
}
function cleanLibraryQuiz(input,publish=false){
 const str=(x,max,required=false)=>{if(typeof x!=='string'||x.length>max||(required&&!x.trim()))throw Error('Перевір довжину та заповнення полів.');return x.trim();};
 const title=str(input.title,80,true),description=str(input.description||'',600),author_name=str(input.author_name,40,true);
 if(!Array.isArray(input.categories)||input.categories.length<1||input.categories.length>30)throw Error('Додай від 1 до 30 категорій.');
 const categories=input.categories.map(c=>{if(!c||!Array.isArray(c.qs)||c.qs.length!==5)throw Error('У кожній категорії має бути п’ять рівнів питань.');return {name:str(c.name,80,true),qs:c.qs.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('Неправильний формат питання.');return [str(p[0],1000,publish),str(p[1],500,publish)];})};});
 if(new Set(categories.map(c=>c.name.toLocaleLowerCase('uk'))).size!==categories.length)throw Error('Назви категорій мають відрізнятися.');
 if(publish&&categories.length<5)throw Error('Для публікації потрібно щонайменше 5 категорій.');
 return {title,description,author_name,categories,status:publish?'published':'draft'};
}
async function openLibraryQuiz(id){
 const epoch=++L.epoch;libMessage('Завантажуємо вікторину…');
 try{const client=await bootLibrary();const {data:row,error}=await client.from('quizzes').select('*').eq('id',id).maybeSingle();if(error)throw error;if(epoch!==L.epoch)return;if(!row)throw Error('Ця вікторина недоступна або знята з публікації.');
  if(L.user)await loadAccountProfile().catch(()=>null);if(epoch!==L.epoch)return;
  cleanLibraryQuiz(row,row.status==='published');$('lib-browse').hidden=true;$('lib-compose').hidden=true;const box=$('lib-detail');box.hidden=false;box.replaceChildren();
  const title=document.createElement('h3');title.textContent=row.title;const desc=document.createElement('p');desc.textContent=row.description;const by=document.createElement('p');by.className='sub';by.textContent='Автор: '+row.author_name+' · '+row.category_count+' категорій';
  const list=document.createElement('ul');row.categories.forEach(c=>{const li=document.createElement('li');li.textContent=c.name;list.append(li);});
  box.append(title,by,desc,list,libButton('Обрати категорії й грати',()=>playLibraryQuiz(row),'wbtn'));
  if(row.status==='published')box.append(libButton('Скопіювати посилання',async()=>{try{const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('quiz',row.id);await navigator.clipboard.writeText(url.href);libMessage('Посилання скопійовано.');}catch(_){libMessage('Не вдалося скопіювати посилання.',true);}},'wbtn alt'));
  if(L.user?.id===row.owner_id){box.append(libButton('Редагувати',()=>composeLibraryQuiz(row),'wbtn alt'));if(row.status==='published')box.append(libButton('Зняти з публікації',()=>unpublishLibraryQuiz(row),'wbtn alt'));box.append(libButton('Видалити мою вікторину',()=>deleteLibraryQuiz(row),'wbtn alt'));}
  if(row.moderation_hidden){const note=document.createElement('p');note.className='sub';note.textContent='Публікацію приховано адміністратором. Можна редагувати й грати локально; повторна публікація стане доступною після зняття обмеження.';box.append(note);}
  if(A.admin&&row.status==='published')box.append(libButton('Приховати з бібліотеки · Адмін',()=>moderateQuiz(row.id,true),'wbtn alt'));
  box.append(libButton('До бібліотеки',showLibrary,'wbtn alt'));libMessage('');
 }catch(error){if(epoch===L.epoch)libMessage(libraryError(error),true);}
}
function emptyLibraryCategory(){return {name:'',qs:Array.from({length:5},()=>['',''])};}
function persistLibraryDraft(){
 if(!L.draft)return;const key='ranking_library_draft_'+(L.draft.owner_id||L.user?.id||'guest');const ok=store.set(key,JSON.stringify(L.draft));$('lib-draft-state').textContent=ok?'Чернетку збережено в цьому браузері.':'Браузер не дозволив зберегти чернетку. Збережи її в акаунт перед виходом.';
}
function composeLibraryQuiz(row=null){
 if(row)L.draft=JSON.parse(JSON.stringify(row));
 else {let saved;try{saved=JSON.parse(store.get('ranking_library_draft_'+(L.user?.id||'guest'))||store.get('ranking_library_draft_guest')||'null');}catch(_){}L.draft=saved?.categories&&(!saved.owner_id||saved.owner_id===L.user?.id)?saved:{title:'',description:'',author_name:'',categories:Array.from({length:5},(_,i)=>({...emptyLibraryCategory(),name:'Категорія '+(i+1)}))};}
 L.category=0;$('lib-browse').hidden=true;$('lib-detail').hidden=true;$('lib-compose').hidden=false;
 if(A.profile?.id===L.user?.id)L.draft.author_name=A.profile.nickname;
 for(const [id,key] of [['lib-title','title'],['lib-description','description'],['lib-author','author_name']]){const input=$(id);input.value=L.draft[key]||'';input.oninput=()=>{L.draft[key]=input.value;persistLibraryDraft();};}
 $('lib-save').textContent=L.draft.status==='published'?'Зберегти приватно й зняти з публікації':'Зберегти приватно';
 $('lib-publish').disabled=!!L.draft.moderation_hidden;
 renderLibraryCategories();persistLibraryDraft();libMessage('');
}
function renderLibraryCategories(){
 const tabs=$('lib-category-tabs');tabs.replaceChildren();L.draft.categories.forEach((c,i)=>{const b=libButton(c.name||'Категорія '+(i+1),()=>{L.category=i;renderLibraryCategories();});b.setAttribute('aria-pressed',String(i===L.category));tabs.append(b);});
 const category=L.draft.categories[L.category],box=$('lib-category-editor');box.replaceChildren();
 const label=document.createElement('label');label.textContent='Назва категорії';const name=document.createElement('input');name.className='fld';name.maxLength=80;name.value=category.name;name.oninput=()=>{category.name=name.value;tabs.children[L.category].textContent=name.value||'Категорія '+(L.category+1);persistLibraryDraft();};label.append(name);box.append(label);
 category.qs.forEach((pair,i)=>{const row=document.createElement('div');row.className='lib-question';const pts=document.createElement('strong');pts.textContent=(i+1)*100+' балів';const q=document.createElement('textarea');q.className='fld';q.rows=2;q.maxLength=1000;q.value=pair[0];q.placeholder='Питання';q.setAttribute('aria-label','Питання на '+(i+1)*100+' балів');q.oninput=()=>{pair[0]=q.value;persistLibraryDraft();};const a=document.createElement('input');a.className='fld';a.maxLength=500;a.value=pair[1];a.placeholder='Відповідь для ведучого';a.setAttribute('aria-label','Відповідь на '+(i+1)*100+' балів');a.oninput=()=>{pair[1]=a.value;persistLibraryDraft();};row.append(pts,q,a);box.append(row);});
 const remove=libButton('Видалити категорію',()=>{if(!confirm('Видалити цю категорію з чернетки?'))return;L.draft.categories.splice(L.category,1);L.category=Math.max(0,L.category-1);persistLibraryDraft();renderLibraryCategories();},'alt');remove.disabled=L.draft.categories.length<=1;box.append(remove);
}
async function saveLibraryQuiz(publish){
 if(L.busy)return;L.busy=true;$('lib-save').disabled=true;$('lib-publish').disabled=true;
 const controls=[...$('lib-compose').querySelectorAll('input,textarea,button')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
 const draft=L.draft;
 try{const client=await bootLibrary();const {data:identity,error:authError}=await client.auth.getUser();if(authError||!identity.user){$('lib-auth').hidden=false;throw Error('Увійди, щоб зберегти вікторину в акаунт. Чернетка залишається в цьому браузері.');}const user=identity.user;
  const profile=await loadAccountProfile();if(!profile)throw Error('Спершу відкрий свій профіль.');const data=cleanLibraryQuiz({...draft,author_name:profile.nickname},publish);
  if(draft.owner_id&&draft.owner_id!==user.id)throw Error('Ця чернетка належить іншому акаунту. Увійди як її автор.');
  let query;if(draft.id){query=client.from('quizzes').update(data).eq('id',draft.id).eq('owner_id',user.id).eq('updated_at',draft.updated_at);}else query=client.from('quizzes').insert({...data,owner_id:user.id});
  const {data:row,error}=await query.select('*').maybeSingle();if(error)throw error;if(!row)throw Error('Вікторину вже змінено в іншій вкладці. Чернетка збережена локально; відкрий свіжу версію перед перезаписом.');
  if(L.draft===draft&&L.user?.id===user.id){L.draft=row;persistLibraryDraft();L.view='mine';await openLibraryQuiz(row.id);libMessage(publish?'Вікторина опублікована — тепер її бачать інші гравці.':'Приватну вікторину збережено у твоєму акаунті.');}
 }catch(error){libMessage(libraryError(error),true);}finally{L.busy=false;controls.forEach(([el,disabled])=>el.disabled=disabled);$('lib-save').disabled=false;$('lib-publish').disabled=!!L.draft?.moderation_hidden;}
}
async function unpublishLibraryQuiz(row){
 try{const {data,error}=await L.client.from('quizzes').update({status:'draft'}).eq('id',row.id).eq('owner_id',L.user.id).eq('updated_at',row.updated_at).select('id').maybeSingle();if(error)throw error;if(!data)throw Error('Вікторина вже змінилася. Відкрий її знову.');await openLibraryQuiz(row.id);libMessage('Вікторина тепер приватна.');}catch(error){libMessage(libraryError(error),true);}
}
async function deleteLibraryQuiz(row){
 if(!confirm('Назавжди видалити вікторину «'+row.title+'» з акаунта?'))return;
 try{const {data,error}=await L.client.from('quizzes').delete().eq('id',row.id).eq('owner_id',L.user.id).eq('updated_at',row.updated_at).select('id').maybeSingle();if(error)throw error;if(!data)throw Error('Вікторина вже змінилася. Відкрий її знову.');if(L.draft?.id===row.id){L.draft=null;store.set('ranking_library_draft_'+row.owner_id,'null');}await showLibrary();libMessage('Вікторину видалено.');}catch(error){libMessage(libraryError(error),true);}
}
function initLibrary(){
 $('mode-edit').onclick=showLibrary;$('lib-account').onclick=()=>{$('lib-auth').hidden=!$('lib-auth').hidden;renderLibraryAuth();};
 $('lib-google').onclick=async()=>{const button=$('lib-google');if(button.disabled)return;button.disabled=true;try{const client=await bootLibrary();const settingsResponse=await fetch(LIBRARY_CONFIG.url+'/auth/v1/settings',{headers:{apikey:LIBRARY_CONFIG.key},signal:AbortSignal.timeout(10000)});if(!settingsResponse.ok)throw Error('Не вдалося перевірити доступність входу. Спробуй ще раз.');const settings=await settingsResponse.json();if(!settings.external?.google)throw Error('Вхід через Google ще налаштовується. Спробуй трохи пізніше.');const url=new URL(location.href);url.search='';url.hash='';const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:url.href}});if(error)throw error;}catch(error){libMessage(libraryError(error),true);}finally{button.disabled=false;}};
 $('lib-signout').onclick=async()=>{try{const {error}=await L.client.auth.signOut();if(error)throw error;L.user=null;L.draft=null;L.epoch++;$('lib-compose').hidden=true;$('lib-detail').replaceChildren();$('lib-detail').hidden=true;L.view='public';await showLibrary();}catch(error){libMessage(libraryError(error),true);}};
 for(const [id,view] of [['lib-public','public'],['lib-mine','mine']])$(id).onclick=()=>{L.view=view;L.page=0;loadLibrary();};
 $('lib-search-form').onsubmit=event=>{event.preventDefault();L.search=$('lib-search').value.trim();L.page=0;loadLibrary();};
 $('lib-prev').onclick=()=>{L.page=Math.max(0,L.page-1);loadLibrary();};$('lib-next').onclick=()=>{L.page++;loadLibrary();};
 $('lib-new').onclick=()=>composeLibraryQuiz();$('lib-local').onclick=showEditor;$('lib-close-compose').onclick=showLibrary;
 $('lib-add-category').onclick=()=>{if(L.draft.categories.length>=30)return libMessage('Максимум 30 категорій.',true);let n=L.draft.categories.length+1;while(L.draft.categories.some(c=>c.name==='Категорія '+n))n++;L.draft.categories.push({...emptyLibraryCategory(),name:'Категорія '+n});L.category=L.draft.categories.length-1;persistLibraryDraft();renderLibraryCategories();};
 $('lib-import-local').onclick=()=>{loadCustom();const source=CUSTOM.filter(filled).filter(c=>!L.draft.categories.some(x=>x.name===c.name));const empty=L.draft.categories.every(c=>(!c.name||/^Категорія \d+$/.test(c.name))&&!c.qs.some(p=>p[0]||p[1]));if(empty&&source.length)L.draft.categories=[];L.draft.categories.push(...JSON.parse(JSON.stringify(source.slice(0,30-L.draft.categories.length))));L.category=0;persistLibraryDraft();renderLibraryCategories();libMessage(source.length?'Локальні категорії додано.':'Нових локальних категорій немає.');};
 $('lib-save').onclick=()=>saveLibraryQuiz(false);$('lib-publish').onclick=()=>saveLibraryQuiz(true);
 $('lib-test').onclick=()=>{try{const row=cleanLibraryQuiz({...L.draft,title:L.draft.title.trim()||'Моя вікторина',author_name:L.draft.author_name.trim()||'Автор'},false);playLibraryQuiz(row);}catch(error){libMessage(libraryError(error),true);}};
 if(typeof location!=='undefined'){const url=new URL(location.href),id=url.searchParams.get('quiz');const requested=url.searchParams.has('library')||id;
  if(requested){show('library');bootLibrary().then(()=>{if(id&&/^[a-f0-9-]{36}$/i.test(id))return openLibraryQuiz(id);return showLibrary();}).catch(error=>libMessage(libraryError(error),true));}
 }
}
