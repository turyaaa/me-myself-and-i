import {getStore} from '@netlify/blobs';
import {processDuel,DuelError} from '../lib/duel-core.mjs';
import bank from '../lib/question-bank.mjs';

export default async function handler(request){
  const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method!=='POST')return reply({error:'Використай POST.'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return reply({error:'Недозволене джерело запиту.'},403);
  try{
    if(!request.headers.get('content-type')?.includes('application/json'))throw new DuelError('Очікується JSON.',415);
    if(Number(request.headers.get('content-length'))>2048)throw new DuelError('Запит завеликий.',413);
    const text=await request.text();if(text.length>2048)throw new DuelError('Запит завеликий.',413);
    let input;try{input=JSON.parse(text);}catch(_){throw new DuelError('Некоректний JSON.');}
    const store=getStore({name:'ranking-game-duels-v1',consistency:'strong'});
    return reply(await processDuel(input,store,bank));
  }catch(error){
    if(error instanceof DuelError)return reply({error:error.message},error.status);
    console.error('Duel storage request failed:',error.name);
    return reply({error:'Онлайн тимчасово недоступний. Спробуй трохи пізніше.'},503);
  }
}
export const config={path:'/api/duel',rateLimit:{windowLimit:180,windowSize:60,aggregateBy:['ip','domain']}};
