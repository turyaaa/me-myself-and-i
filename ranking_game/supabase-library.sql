-- The Ranking Game: run once in your Supabase project's SQL Editor.
-- Repeatable migration. No passwords, service keys or user records in this file.
begin;
create or replace function public.quiz_categories_valid(value jsonb, published boolean)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare c jsonb; p jsonb; seen text[] := '{}'; category_name text;
begin
 if jsonb_typeof(value) is distinct from 'array' then return false; end if;
 if jsonb_array_length(value) < (case when published then 5 else 1 end) or jsonb_array_length(value)>30 or octet_length(value::text)>262144 then return false; end if;
 for c in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(c) is distinct from 'object' or jsonb_typeof(c->'name') is distinct from 'string' or jsonb_typeof(c->'qs') is distinct from 'array' then return false; end if;
  category_name := btrim(c->>'name');
  if char_length(category_name) not between 1 and 80 or lower(category_name)=any(seen) or jsonb_array_length(c->'qs')<>5 then return false; end if;
  seen := array_append(seen,lower(category_name));
  for p in select * from jsonb_array_elements(c->'qs') loop
   if jsonb_typeof(p) is distinct from 'array' then return false; end if;
   if jsonb_array_length(p)<>2 or jsonb_typeof(p->0) is distinct from 'string' or jsonb_typeof(p->1) is distinct from 'string' then return false; end if;
   if char_length(p->>0)>1000 or char_length(p->>1)>500 then return false; end if;
   if published and (char_length(btrim(p->>0))=0 or char_length(btrim(p->>1))=0) then return false; end if;
  end loop;
 end loop;
 return true;
end $$;

create table if not exists public.quizzes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 80),
 description text not null default '' check(char_length(description)<=600),
 author_name text not null check(char_length(btrim(author_name)) between 1 and 40),
 categories jsonb not null,
 status text not null default 'draft' check(status in ('draft','published')),
 category_count integer generated always as (jsonb_array_length(categories)) stored,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint quizzes_categories_shape check(public.quiz_categories_valid(categories,status='published'))
);
create index if not exists quizzes_public_date on public.quizzes(created_at desc,id desc) where status='published';
create index if not exists quizzes_owner_date on public.quizzes(owner_id,created_at desc,id desc);

create or replace function public.quiz_write_guard() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
 if TG_OP='INSERT' then
  -- This invoker can see their own rows under RLS. Serialize quota checks per author.
  perform pg_advisory_xact_lock(hashtextextended(NEW.owner_id::text,0));
  if (select count(*) from public.quizzes where owner_id=NEW.owner_id)>=100 then
   raise exception 'Досягнуто ліміту 100 вікторин для автора' using errcode='23514';
  end if;
  NEW.created_at=clock_timestamp();
 else
  if NEW.id<>OLD.id or NEW.owner_id<>OLD.owner_id or NEW.created_at<>OLD.created_at then
   raise exception 'Cannot change quiz identity' using errcode='42501';
  end if;
 end if;
 NEW.updated_at=clock_timestamp();return NEW;
end $$;
drop trigger if exists quizzes_guard on public.quizzes;
create trigger quizzes_guard before insert or update on public.quizzes for each row execute function public.quiz_write_guard();

alter table public.quizzes enable row level security;
drop policy if exists quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes for select to anon,authenticated
 using(status='published' or owner_id=(select auth.uid()));
drop policy if exists quizzes_create on public.quizzes;
create policy quizzes_create on public.quizzes for insert to authenticated
 with check(owner_id=(select auth.uid()));
drop policy if exists quizzes_edit on public.quizzes;
create policy quizzes_edit on public.quizzes for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists quizzes_remove on public.quizzes;
create policy quizzes_remove on public.quizzes for delete to authenticated
 using(owner_id=(select auth.uid()));

revoke all on public.quizzes from anon,authenticated;
grant select on public.quizzes to anon,authenticated;
grant insert(owner_id,title,description,author_name,categories,status) on public.quizzes to authenticated;
grant update(title,description,author_name,categories,status) on public.quizzes to authenticated;
grant delete on public.quizzes to authenticated;
revoke all on function public.quiz_write_guard() from public,anon,authenticated;
revoke all on function public.quiz_categories_valid(jsonb,boolean) from public;
grant execute on function public.quiz_categories_valid(jsonb,boolean) to anon,authenticated;
commit;
