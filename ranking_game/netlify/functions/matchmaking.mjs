import {getStore} from '@netlify/blobs';
import {DuelError} from '../lib/duel-core.mjs';
import {processMatchmaking} from '../lib/matchmaking-core.mjs';
import {authenticateMatchRequest} from '../lib/matchmaking-auth.mjs';
import bank from '../lib/question-bank.mjs';
import settings from '../../library-config.json' with {type:'json'};

export default async function handler(request){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'},reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(request.method!=='POST')return reply({error:'Використай POST.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Недозволене джерело запиту.'},403);
 try{
  const started=Date.now();
  if(!request.headers.get('content-type')?.includes('application/json'))throw new DuelError('Очікується JSON.',415);
  if(Number(request.headers.get('content-length'))>2048)throw new DuelError('Запит завеликий.',413);
  const text=await request.text();if(text.length>2048)throw new DuelError('Запит завеликий.',413);
  let input;try{input=JSON.parse(text);}catch(_){throw new DuelError('Некоректний JSON.');}
  const identity=await authenticateMatchRequest(request,settings);
  const store=getStore({name:'ranking-game-duels-v1',consistency:'strong'});
  const data=await processMatchmaking(input,store,bank,identity);return reply({...data,serverNow:Date.now(),processingMs:Date.now()-started});
 }catch(error){if(error instanceof DuelError)return reply({error:error.message},error.status);console.error('Matchmaking request failed:',error.name);return reply({error:'Пошук тимчасово недоступний. Спробуй ще раз.'},503);}
}
export const config={path:'/api/matchmaking',rateLimit:{windowLimit:600,windowSize:60,aggregateBy:['ip','domain']}};
