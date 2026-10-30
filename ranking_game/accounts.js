// Public profile fields and game administration are separate database objects.
const A={mode:'login',profile:null,admin:false,userId:null,revision:0,loading:null,busy:false,recovery:false};
function accountMessage(id,message,error=false){$(id).textContent=message;$(id).className=error?'sub lib-status-error':'sub';}
function renderAccountLinks(){
 for(const [register,login,profile] of [['home-register','home-login','home-profile'],['lib-register','lib-account','lib-profile']]){
  $(register).hidden=!!L.user;$(login).hidden=!!L.user;$(profile).hidden=!L.user;$(profile).textContent=A.profile?.nickname?'Профіль · '+A.profile.nickname:'Мій профіль';
 }
}
function accountIdentityChanged(event,user){
 if(A.userId!==(user?.id||null)){A.userId=user?.id||null;A.profile=null;A.admin=false;A.loading=null;A.revision++;A.recovery=false;
  for(const id of ['profile-name','profile-email','profile-id','profile-nickname','profile-password','profile-password-repeat']){$(id).textContent='';$(id).value='';}
  $('profile-content').hidden=true;$('profile-guest').hidden=!!user;$('profile-admin').hidden=true;$('admin-quizzes').replaceChildren();
 }
 if(event==='PASSWORD_RECOVERY')A.recovery=true;
 renderAccountLinks();
 if(user)setTimeout(()=>{loadAccountProfile().catch(()=>{});if(event==='PASSWORD_RECOVERY')showProfile();},0);
}
async function loadAccountProfile(force=false){
 if(!L.user){A.profile=null;A.admin=false;return null;}
 const id=L.user.id,revision=A.revision;
 if(!force&&A.profile?.id===id)return A.profile;
 if(!force&&A.loading)return A.loading;
 const request=(async()=>{const client=await bootLibrary();const [{data:profile,error},{data:admin,error:adminError}]=await Promise.all([
  client.from('profiles').select('id,nickname,created_at,updated_at').eq('id',id).maybeSingle(),client.rpc('is_game_admin')]);
  if(error||adminError)throw Error('Профілі ще налаштовуються. Потрібно виконати оновлення бази supabase-accounts.sql.');
  if(!profile)throw Error('Профіль поки не знайдено. Онови сторінку або увійди ще раз.');
  if(revision!==A.revision||id!==L.user?.id)return null;
  A.profile=profile;A.admin=admin===true;renderAccountLinks();if(L.draft&&!$('lib-compose').hidden&&(!L.draft.owner_id||L.draft.owner_id===id)){L.draft.author_name=profile.nickname;$('lib-author').value=profile.nickname;}
  return profile;
 })();A.loading=request;
 try{return await request;}finally{if(A.loading===request)A.loading=null;}
}
function showAuth(mode='login'){
 A.mode=mode;show('account');const register=mode==='register',forgot=mode==='forgot';
 $('auth-heading').textContent=register?'Register':forgot?'Відновлення пароля':'Sign in';
 $('auth-nickname-row').hidden=!register;$('auth-nickname').required=register;
 $('auth-password-row').hidden=forgot;$('auth-password').required=!forgot;$('auth-password').minLength=register?8:1;$('auth-password').autocomplete=register?'new-password':'current-password';
 $('auth-repeat-row').hidden=!register;$('auth-repeat').required=register;$('auth-password').value='';$('auth-repeat').value='';
 $('auth-submit').textContent=register?'Register':forgot?'Надіслати лист':'Sign in';$('auth-switch').textContent=register||forgot?'Already have an account?':'Register';$('auth-forgot').hidden=register||forgot;
 $('auth-google').hidden=forgot;for(const [id,value] of [['auth-tab-login','login'],['auth-tab-register','register']])$(id).setAttribute('aria-pressed',String(value===mode));
 accountMessage('auth-message','');
}
function authReturnUrl(){const url=new URL(location.href);url.search='';url.hash='';return url.href;}
function accountAuthError(error){
 const messages={invalid_credentials:'Неправильний email або пароль.',email_not_confirmed:'Спершу підтвердь email за посиланням у листі.',weak_password:'Обери надійніший пароль: щонайменше 8 символів.',over_email_send_rate_limit:'Забагато листів за короткий час. Зачекай і спробуй знову.',email_address_not_authorized:'Поштовий сервіс ще налаштовується. Поки скористайся входом через Google.',email_address_invalid:'Перевір адресу email.',user_already_exists:'Цей email уже зареєстрований. Спробуй Sign in.',reauthentication_needed:'Для зміни пароля потрібно увійти знову.'};
 return messages[error?.code]||(error?.code?'Не вдалося виконати вхід. Спробуй ще раз або увійди через Google.':libraryError(error));
}
async function submitAccountForm(event){
 event.preventDefault();if(A.busy)return;A.busy=true;const controls=['auth-submit','auth-google','auth-switch','auth-forgot','auth-tab-login','auth-tab-register'];controls.forEach(id=>$(id).disabled=true);const mode=A.mode;
 try{const client=await bootLibrary(),email=$('auth-email').value.trim(),password=$('auth-password').value;
  if(!email||email.length>254)throw Error('Введи email.');
  if(mode==='forgot'){const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:authReturnUrl()});if(error)throw error;accountMessage('auth-message','Якщо акаунт існує, на пошту надійде посилання для нового пароля. Відкрий його в цьому браузері.');return;}
  if(mode==='register'){
   const nickname=$('auth-nickname').value.trim();if(Array.from(nickname).length<2||Array.from(nickname).length>32||/[\x00-\x1f\x7f]/.test(nickname))throw Error('Нікнейм має містити від 2 до 32 символів.');
   if(password.length<8)throw Error('Пароль має містити щонайменше 8 символів.');if(password!==$('auth-repeat').value)throw Error('Паролі не збігаються.');
   store.set('ranking_auth_next','profile');const {data,error}=await client.auth.signUp({email,password,options:{data:{nickname},emailRedirectTo:authReturnUrl()}});if(error)throw error;
   $('auth-password').value='';$('auth-repeat').value='';if(data.session){L.user=data.session.user;accountIdentityChanged('SIGNED_IN',L.user);await showProfile();}else accountMessage('auth-message','Перевір пошту й підтвердь реєстрацію. Після підтвердження можна увійти через Sign in.');
  }else{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;L.user=data.user;accountIdentityChanged('SIGNED_IN',L.user);$('auth-password').value='';await showProfile();}
 }catch(error){accountMessage('auth-message',accountAuthError(error),true);}finally{A.busy=false;controls.forEach(id=>$(id).disabled=false);}
}
async function accountGoogle(){
 if(A.busy)return;A.busy=true;$('auth-google').disabled=true;
 try{
 const original=$('lib-google').onclick;store.set('ranking_auth_next','profile');
 if(A.mode==='register'){const nickname=$('auth-nickname').value.trim();if(Array.from(nickname).length>=2&&Array.from(nickname).length<=32)store.set('ranking_requested_nickname',JSON.stringify({nickname,at:Date.now()}));}
 // The library's handler checks provider readiness and does not store credentials.
 await original();if($('lib-status').textContent)accountMessage('auth-message',$('lib-status').textContent,true);
 }finally{A.busy=false;$('auth-google').disabled=false;}
}
async function showProfile(){
 show('profile');$('profile-guest').hidden=!!L.user;$('profile-content').hidden=true;accountMessage('profile-message','Завантажуємо профіль…');
 try{await bootLibrary();if(!L.user){$('profile-guest').hidden=false;accountMessage('profile-message','');return;}
  const profile=await loadAccountProfile();if(!profile)return;const id=profile.id,revision=A.revision;
  let requested;try{requested=JSON.parse(store.get('ranking_requested_nickname')||'null');}catch(_){}
  if(requested){store.set('ranking_requested_nickname','null');if(profile.nickname.startsWith('Гравець ')&&Date.now()-requested.at<1200000&&Date.now()>=requested.at){const {data,error}=await L.client.from('profiles').update({nickname:requested.nickname}).eq('id',id).eq('updated_at',profile.updated_at).select('id,nickname,created_at,updated_at').maybeSingle();if(!error&&data&&revision===A.revision)A.profile=data;}}
  if(id!==L.user?.id||revision!==A.revision)return;renderProfile();
  const {data,error}=await L.client.from('quizzes').select('id,status').eq('owner_id',id).range(0,99);
  if(revision!==A.revision||id!==L.user?.id)return;if(error)throw error;$('profile-quiz-count').textContent=String(data?.length||0);$('profile-public-count').textContent=String(data?.filter(q=>q.status==='published').length||0);
  accountMessage('profile-message','');if(A.admin)await loadModerationQueue();
 }catch(error){accountMessage('profile-message',libraryError(error),true);}
}
function renderProfile(){
 const profile=A.profile;if(!profile||profile.id!==L.user?.id)return;
 $('profile-guest').hidden=true;$('profile-content').hidden=false;$('profile-name').textContent=profile.nickname;$('profile-initial').textContent=Array.from(profile.nickname)[0]?.toLocaleUpperCase('uk')||'?';$('profile-nickname').value=profile.nickname;
 $('profile-role').textContent=A.admin?'Адміністратор':'Гравець';$('profile-email').textContent=L.user.email?'Email: '+L.user.email:'';$('profile-id').textContent=profile.id;
 $('profile-created').textContent='Профіль створено '+new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(profile.created_at));
 $('profile-admin').hidden=!A.admin;$('profile-password-form').hidden=!A.recovery;renderAccountLinks();
}
async function saveProfile(event){
 event.preventDefault();if($('profile-save').disabled)return;$('profile-save').disabled=true;
 try{if(!L.user||A.profile?.id!==L.user.id)throw Error('Спершу увійди.');const id=L.user.id,revision=A.revision,nickname=$('profile-nickname').value.trim();
  if(Array.from(nickname).length<2||Array.from(nickname).length>32||/[\x00-\x1f\x7f]/.test(nickname))throw Error('Нікнейм має містити від 2 до 32 символів.');
  const {data,error}=await L.client.from('profiles').update({nickname}).eq('id',id).eq('updated_at',A.profile.updated_at).select('id,nickname,created_at,updated_at').maybeSingle();if(error)throw error;if(!data)throw Error('Профіль змінено в іншій вкладці. Онови сторінку перед збереженням.');if(revision!==A.revision||id!==L.user?.id)return;
  A.profile=data;if(L.draft){L.draft.author_name=data.nickname;persistLibraryDraft();}renderProfile();accountMessage('profile-message','Нікнейм оновлено, зокрема під твоїми вікторинами.');
 }catch(error){accountMessage('profile-message',libraryError(error),true);}finally{$('profile-save').disabled=false;}
}
async function saveAccountPassword(event){
 event.preventDefault();if($('profile-password-save').disabled)return;$('profile-password-save').disabled=true;
 try{const password=$('profile-password').value;if(password.length<8)throw Error('Пароль має містити щонайменше 8 символів.');if(password!==$('profile-password-repeat').value)throw Error('Паролі не збігаються.');
  const {error}=await L.client.auth.updateUser({password});if(error)throw error;$('profile-password').value='';$('profile-password-repeat').value='';A.recovery=false;$('profile-password-form').hidden=true;accountMessage('profile-message','Пароль оновлено.');
 }catch(error){accountMessage('profile-message',accountAuthError(error),true);}finally{$('profile-password-save').disabled=false;}
}
async function moderateQuiz(id,hide){
 if(!confirm(hide?'Приховати цю вікторину з публічної бібліотеки?':'Зняти обмеження? Вікторина залишиться приватною, доки автор не опублікує її знову.'))return;
 try{const {error}=await L.client.rpc('moderate_game_quiz',{quiz:id,hide});if(error)throw error;if(!$('profile').hidden){await loadModerationQueue();accountMessage('profile-message','Обмеження знято.');}else{await showLibrary();libMessage('Вікторину приховано модератором.');}}
 catch(error){const message=libraryError(error);if(!$('profile').hidden)accountMessage('profile-message',message,true);else libMessage(message,true);}
}
async function loadModerationQueue(){
 if(!A.admin)return;const revision=A.revision;const {data,error}=await L.client.rpc('game_moderation_queue');if(error)throw error;if(revision!==A.revision||!A.admin)return;
 const box=$('admin-quizzes');box.replaceChildren();if(!data?.length){const note=document.createElement('p');note.textContent='Прихованих вікторин немає.';box.append(note);}
 for(const quiz of data||[]){const row=document.createElement('div');row.className='admin-quiz-row';const label=document.createElement('span');label.textContent=quiz.title+' · '+quiz.author_name;row.append(label,libButton('Зняти обмеження',()=>moderateQuiz(quiz.id,false)));box.append(row);}
}
function initAccounts(){
 for(const id of ['home-register','lib-register','profile-register','auth-tab-register'])$(id).onclick=()=>showAuth('register');
 for(const id of ['home-login','lib-account','profile-login','auth-tab-login'])$(id).onclick=()=>showAuth('login');
 for(const id of ['home-profile','lib-profile'])$(id).onclick=()=>showProfile();
 $('auth-switch').onclick=()=>showAuth(A.mode==='login'?'register':'login');$('auth-forgot').onclick=()=>showAuth('forgot');$('auth-form').onsubmit=submitAccountForm;$('auth-google').onclick=accountGoogle;
 $('profile-form').onsubmit=saveProfile;$('profile-password-form').onsubmit=saveAccountPassword;$('profile-change-password').onclick=()=>{$('profile-password-form').hidden=false;$('profile-password').focus();};
 $('profile-copy-id').onclick=async()=>{try{await navigator.clipboard.writeText(L.user.id);accountMessage('profile-message','ID скопійовано.');}catch(_){accountMessage('profile-message','Не вдалося скопіювати ID.',true);}};
 $('profile-my-quizzes').onclick=()=>{L.view='mine';L.page=0;showLibrary();};$('profile-signout').onclick=async()=>{await $('lib-signout').onclick();if(!L.user)showAuth('login');};
 $('admin-refresh').onclick=()=>loadModerationQueue().catch(error=>accountMessage('profile-message',libraryError(error),true));renderAccountLinks();
 if(typeof location!=='undefined'){const url=new URL(location.href);if(url.searchParams.has('code')||url.searchParams.has('profile')){store.set('ranking_auth_next','');showProfile();}else if(url.searchParams.has('error')){showAuth('login');accountMessage('auth-message','Вхід не завершено. Спробуй увійти ще раз.',true);}else bootLibrary().then(()=>loadAccountProfile()).catch(()=>{});}
}
