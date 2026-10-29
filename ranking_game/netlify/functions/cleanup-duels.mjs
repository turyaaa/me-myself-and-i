import {getStore} from '@netlify/blobs';
export default async function cleanup(){
  const store=getStore({name:'ranking-game-duels-v1',consistency:'strong'});
  for await(const page of store.list({prefix:'room/',paginate:true})){
    await Promise.all(page.blobs.map(async blob=>{
      const room=await store.get(blob.key,{type:'json'});
      if(room&&room.expires<Date.now())await store.delete(blob.key);
    }));
  }
  return new Response('Expired rooms cleaned up.');
}
export const config={schedule:'17 3 * * *'};
