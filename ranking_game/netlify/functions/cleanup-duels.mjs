import {getStore} from '@netlify/blobs';
import {pruneMatchmaking} from '../lib/matchmaking-core.mjs';
export default async function cleanup(){
  const store=getStore({name:'ranking-game-duels-v1',consistency:'strong'});
  for await(const page of store.list({prefix:'room/',paginate:true})){
    await Promise.all(page.blobs.map(async blob=>{
      const room=await store.get(blob.key,{type:'json'});
      if(room&&room.expires<Date.now())await store.delete(blob.key);
    }));
  }
  await pruneMatchmaking(store);
  return new Response('Expired rooms and matchmaking entries cleaned up.');
}
export const config={schedule:'17 3 * * *'};
