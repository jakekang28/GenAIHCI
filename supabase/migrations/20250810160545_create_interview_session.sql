-- 필수 확장
create extension if not exists pgcrypto;
create extension if not exists moddatetime;

-- 1) 인터뷰 세션
create table if not exists public.interview_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  persona      text not null check (persona in ('A','B','C','D')),
  scenario_tag text, -- 필요 없으면 삭제해도 됩니다
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger interview_sessions_set_updated
before update on public.interview_sessions
for each row execute procedure moddatetime(updated_at);

create index if not exists idx_interview_sessions_user on public.interview_sessions(user_id);
create index if not exists idx_interview_sessions_created on public.interview_sessions(created_at);

alter table public.interview_sessions enable row level security;

-- RLS: 본인 것만 조회/작성/수정/삭제
create policy "interview_sessions_select_own"
on public.interview_sessions
for select
using (auth.uid() = user_id);

create policy "interview_sessions_insert_own"
on public.interview_sessions
for insert
with check (auth.uid() = user_id);

create policy "interview_sessions_update_own"
on public.interview_sessions
for update
using (auth.uid() = user_id);

create policy "interview_sessions_delete_own"
on public.interview_sessions
for delete
using (auth.uid() = user_id);



-- 2) 세션의 QnA(질문/답변 한 턴)
create table if not exists public.qna (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.interview_sessions(id) on delete cascade,
  order_no    int not null,              -- 1..N 순서
  question    text not null,
  answer      text not null,
  is_initial  boolean not null default false, -- 첫 질문 여부(옵션)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(session_id, order_no)
);

create trigger qna_set_updated
before update on public.qna
for each row execute procedure moddatetime(updated_at);

create index if not exists idx_qna_session on public.qna(session_id);
create index if not exists idx_qna_created on public.qna(created_at);

alter table public.qna enable row level security;

-- RLS: 부모 세션의 소유자만 CRUD 허용
create policy "qna_select_own"
on public.qna
for select
using (
  exists (
    select 1
    from public.interview_sessions s
    where s.id = qna.session_id
      and s.user_id = auth.uid()
  )
);

create policy "qna_insert_own"
on public.qna
for insert
with check (
  exists (
    select 1
    from public.interview_sessions s
    where s.id = qna.session_id
      and s.user_id = auth.uid()
  )
);

create policy "qna_update_own"
on public.qna
for update
using (
  exists (
    select 1
    from public.interview_sessions s
    where s.id = qna.session_id
      and s.user_id = auth.uid()
  )
);

create policy "qna_delete_own"
on public.qna
for delete
using (
  exists (
    select 1
    from public.interview_sessions s
    where s.id = qna.session_id
      and s.user_id = auth.uid()
  )
);