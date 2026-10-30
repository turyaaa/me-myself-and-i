-- Run after supabase-accounts.sql, in Supabase SQL Editor as project owner.
-- Grants game moderation only. This does not grant Supabase project access.
insert into public.app_admins(user_id)
values('2dca481e-df1d-45e5-b4a6-88c3c1f0c7e1'::uuid)
on conflict(user_id) do nothing;
