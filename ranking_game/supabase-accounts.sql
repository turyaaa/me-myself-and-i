-- Run AFTER supabase-library.sql. Repeatable: preserves profiles and admin grants.
begin;
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check(char_length(btrim(nickname)) between 2 and 32 and nickname !~ '[[:cntrl:]]'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.app_admins(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.app_admins enable row level security;
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists profiles_self_edit on public.profiles;
create policy profiles_self_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists admins_self_read on public.app_admins;
create policy admins_self_read on public.app_admins for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.profiles,public.app_admins from anon,authenticated;
grant select on public.profiles,public.app_admins to authenticated;
grant update(nickname) on public.profiles to authenticated;
create or replace function public.is_game_admin() returns boolean language sql stable security definer set search_path=pg_catalog
as $$select exists(select 1 from public.app_admins where user_id=(select auth.uid()))$$;
revoke all on function public.is_game_admin() from public,anon;
grant execute on function public.is_game_admin() to authenticated;

create or replace function public.create_game_profile() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare chosen text;
begin
 chosen=btrim(coalesce(NEW.raw_user_meta_data->>'nickname',''));
 if char_length(chosen) not between 2 and 32 or chosen ~ '[[:cntrl:]]' then chosen='Гравець '||left(NEW.id::text,8);end if;
 insert into public.profiles(id,nickname) values(NEW.id,chosen) on conflict(id) do nothing;return NEW;
end $$;
revoke all on function public.create_game_profile() from public,anon,authenticated;
drop trigger if exists ranking_game_profile_created on auth.users;
create trigger ranking_game_profile_created after insert on auth.users for each row execute function public.create_game_profile();
insert into public.profiles(id,nickname) select id,'Гравець '||left(id::text,8) from auth.users on conflict(id) do nothing;

create or replace function public.profile_write_stamp() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 NEW.nickname=btrim(NEW.nickname);NEW.updated_at=clock_timestamp();return NEW;
end $$;
revoke all on function public.profile_write_stamp() from public,anon,authenticated;
create or replace function public.profile_name_changed() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 if NEW.nickname is distinct from OLD.nickname then update public.quizzes set author_name=NEW.nickname where owner_id=NEW.id;end if;
 return NEW;
end $$;
revoke all on function public.profile_name_changed() from public,anon,authenticated;
drop trigger if exists ranking_profile_name on public.profiles;
drop trigger if exists ranking_profile_stamp on public.profiles;
create trigger ranking_profile_stamp before update on public.profiles for each row execute function public.profile_write_stamp();
create trigger ranking_profile_name after update on public.profiles for each row execute function public.profile_name_changed();

alter table public.quizzes add column if not exists moderation_hidden boolean not null default false;
alter table public.quizzes drop constraint if exists quizzes_moderation_state;
alter table public.quizzes add constraint quizzes_moderation_state check(not moderation_hidden or status='draft');
drop policy if exists quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes for select to anon,authenticated
using((status='published' and not moderation_hidden) or owner_id=(select auth.uid()));
create or replace function public.quiz_author_profile() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 select nickname into NEW.author_name from public.profiles where id=NEW.owner_id;
 if NEW.author_name is null then raise exception 'Profile missing' using errcode='23514';end if;
 return NEW;
end $$;
revoke all on function public.quiz_author_profile() from public,anon,authenticated;
drop trigger if exists ranking_quiz_author on public.quizzes;
create trigger ranking_quiz_author before insert or update on public.quizzes for each row execute function public.quiz_author_profile();
create table if not exists public.quiz_moderation_log(
 id bigint generated always as identity primary key,quiz_id uuid not null,
 admin_id uuid references auth.users(id) on delete set null,action text not null check(action in ('hide','restore')),created_at timestamptz not null default now()
);
alter table public.quiz_moderation_log enable row level security;
revoke all on public.quiz_moderation_log from anon,authenticated;
create or replace function public.moderate_game_quiz(quiz uuid,hide boolean) returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
 if not public.is_game_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 update public.quizzes set moderation_hidden=hide,status='draft' where id=quiz and (moderation_hidden or status='published');
 if not found then raise exception 'Quiz not found or already private' using errcode='P0002';end if;
 insert into public.quiz_moderation_log(quiz_id,admin_id,action) values(quiz,auth.uid(),case when hide then 'hide' else 'restore' end);
end $$;
revoke all on function public.moderate_game_quiz(uuid,boolean) from public,anon;
grant execute on function public.moderate_game_quiz(uuid,boolean) to authenticated;
create or replace function public.game_moderation_queue() returns table(id uuid,title text,author_name text) language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not public.is_game_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return query select q.id,q.title,q.author_name from public.quizzes q where q.moderation_hidden order by q.updated_at desc limit 100;
end $$;
revoke all on function public.game_moderation_queue() from public,anon;
grant execute on function public.game_moderation_queue() to authenticated;
commit;
