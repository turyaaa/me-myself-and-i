import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 const migration=await readFile(new URL('./supabase-library.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration);
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
 const cats=Array.from({length:5},(_,i)=>({name:'Категорія '+i,qs:Array.from({length:5},(_,j)=>['Питання '+j,'Відповідь '+j])}));
 const role=async(name,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+name);};
 const insert=async(owner,status='draft',categories=cats)=>db.query('insert into public.quizzes(owner_id,title,author_name,categories,status) values($1,$2,$3,$4::jsonb,$5) returning *',[owner,'Моя гра','Автор',JSON.stringify(categories),status]);
 await role('authenticated',a);const first=(await insert(a)).rows[0];assert(first.id);assert.equal(first.category_count,5);
 await assert.rejects(()=>insert(b));
 await role('anon');assert.equal((await db.query('select * from public.quizzes')).rows.length,0);await assert.rejects(()=>insert(a,'published'));
 await role('authenticated',b);assert.equal((await db.query('select * from public.quizzes')).rows.length,0);
 assert.equal((await db.query("update public.quizzes set title='Stolen' where id=$1 returning *",[first.id])).rows.length,0);
 assert.equal((await db.query('delete from public.quizzes where id=$1 returning *',[first.id])).rows.length,0);
 await role('authenticated',a);await db.query("update public.quizzes set status='published' where id=$1",[first.id]);
 await role('anon');assert.equal((await db.query('select title from public.quizzes')).rows.length,1);
 await role('authenticated',b);assert.equal((await db.query("update public.quizzes set title='Stolen' where id=$1 returning *",[first.id])).rows.length,0);
 await role('authenticated',a);const before=(await db.query('select updated_at from public.quizzes where id=$1',[first.id])).rows[0].updated_at;
 await db.query("update public.quizzes set title='Changed' where id=$1 and updated_at=$2",[first.id,before]);
 assert.equal((await db.query("update public.quizzes set title='Stale' where id=$1 and updated_at=$2 returning *",[first.id,before])).rows.length,0);
 await assert.rejects(()=>db.query('update public.quizzes set owner_id=$1 where id=$2',[b,first.id]));
 await assert.rejects(()=>db.query("update public.quizzes set updated_at=now() where id=$1",[first.id]));
 for(const bad of [null,{},[],cats.slice(0,4),[...cats.slice(0,4),cats[0]],cats.map((c,i)=>i?c:{...c,qs:[['only','one']]}),cats.map((c,i)=>i?c:{...c,qs:c.qs.map((q,j)=>j?q:['',''])})])await assert.rejects(()=>insert(a,'published',bad));
 await insert(a,'draft',[{name:'Чернетка',qs:Array.from({length:5},()=>['',''])}]);
 await db.query("update public.quizzes set status='draft' where id=$1",[first.id]);await role('anon');assert.equal((await db.query('select * from public.quizzes')).rows.length,0);
 await role('authenticated',a);await db.query('delete from public.quizzes where id=$1',[first.id]);
 // Quota includes private drafts and is enforced in the database.
 for(let i=0;i<99;i++)await insert(a);
 await assert.rejects(()=>insert(a));
 const result={migrationTwice:true,privateHiddenFromGuests:true,privateHiddenFromOtherAuthors:true,publicReadable:true,foreignEditsBlocked:true,foreignDeletesBlocked:true,ownerImmutable:true,concurrentEditConflict:true,invalidPublicationRejected:true,unpublishHides:true,authorQuota100:true};
 await writeFile(new URL('./library-db-test-results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await db.close();}
