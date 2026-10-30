import {DuelError} from './duel-core.mjs';
const cache=new Map();
export async function authenticateMatchRequest(request,settings,fetcher=fetch,clock=Date.now){
 const header=request.headers.get('authorization')||'',match=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header);
 if(!match||header.length>4096)throw new DuelError('Для пошуку суперника увійди у свій акаунт.',401);
 const token=match[1],cached=cache.get(token),now=clock();if(cached?.expires>now)return cached.user;
 if(!settings.url||!settings.key)throw new DuelError('Акаунти ще не підключені.',503);
 const headers={apikey:settings.key,Authorization:'Bearer '+token};
 const response=await fetcher(settings.url+'/auth/v1/user',{headers,signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new DuelError('Сеанс завершився. Увійди у свій акаунт знову.',401);
 const user=await response.json();if(!/^[a-f0-9-]{36}$/i.test(user.id)||user.aud!=='authenticated'||user.is_anonymous)throw new DuelError('Потрібен підтверджений акаунт.',401);
 const url=new URL(settings.url+'/rest/v1/profiles');url.searchParams.set('id','eq.'+user.id);url.searchParams.set('select','nickname');url.searchParams.set('limit','1');
 const profileResponse=await fetcher(url,{headers,signal:AbortSignal.timeout(8000)});if(!profileResponse.ok)throw new DuelError('Не вдалося завантажити профіль. Спробуй ще раз.',503);
 const profiles=await profileResponse.json(),name=profiles[0]?.nickname;
 if(typeof name!=='string'||!name.trim()||name.length>64)throw new DuelError('Спочатку відкрий і збережи свій профіль.',409);
 let expires=now;try{expires=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')).exp*1000;}catch(_){}
 const identity={id:user.id,name:name.trim()};if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(token,{user:identity,expires:Math.min(now+15000,expires||now)});return identity;
}
