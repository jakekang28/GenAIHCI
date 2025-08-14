-- 확장
create extension if not exists pgcrypto;
create extension if not exists moddatetime;

-- 1) 게스트 유저
create table if not exists public.guest_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_guest_users_updated
before update on public.guest_users
for each row execute procedure moddatetime(updated_at);

-- 2) interview_sessions를 게스트 기준으로 전환
-- 2-1) user_id를 nullable로 바꾸고(안쓰게 됨), guest_user_id/guest_name 추가
alter table public.interview_sessions alter column user_id drop not null;

alter table public.interview_sessions
  add column if not exists guest_user_id uuid,
  add column if not exists guest_name text;

-- Fix: Remove the "if not exists" for constraint and handle it properly
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'interview_sessions_guest_fk'
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_guest_fk
      foreign key (guest_user_id) references public.guest_users(id) on delete set null;
  end if;
end $$;

-- 3) RLS 비활성화 (보안 신경 안 쓰는 전제)
alter table public.interview_sessions disable row level security;
alter table public.qna disable row level security;