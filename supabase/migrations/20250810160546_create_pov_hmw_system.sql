-- POV & HMW System Database Migration

-- 1) POV & HMW Sessions
create table if not exists public.pov_hmw_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  needs        text[] not null, -- Array of 3 needs
  insights     text[] not null, -- Array of 3 insights
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger pov_hmw_sessions_set_updated
before update on public.pov_hmw_sessions
for each row execute procedure moddatetime(updated_at);

create index if not exists idx_pov_hmw_sessions_user on public.pov_hmw_sessions(user_id);
create index if not exists idx_pov_hmw_sessions_created on public.pov_hmw_sessions(created_at);

alter table public.pov_hmw_sessions enable row level security;

create policy "pov_hmw_sessions_select_own"
on public.pov_hmw_sessions
for select
using (auth.uid() = user_id);

create policy "pov_hmw_sessions_insert_own"
on public.pov_hmw_sessions
for insert
with check (auth.uid() = user_id);

create policy "pov_hmw_sessions_update_own"
on public.pov_hmw_sessions
for update
using (auth.uid() = user_id);

create policy "pov_hmw_sessions_delete_own"
on public.pov_hmw_sessions
for delete
using (auth.uid() = user_id);

-- 2) POV Statements
create table if not exists public.pov_statements (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.pov_hmw_sessions(id) on delete cascade,
  statement    text not null,
  student_name text not null,
  is_selected  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger pov_statements_set_updated
before update on public.pov_statements
for each row execute procedure moddatetime(updated_at);

create index if not exists idx_pov_statements_session on public.pov_statements(session_id);
create index if not exists idx_pov_statements_created on public.pov_statements(created_at);

alter table public.pov_statements enable row level security;

create policy "pov_statements_select_own"
on public.pov_statements
for select
using (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = pov_statements.session_id
      and s.user_id = auth.uid()
  )
);

create policy "pov_statements_insert_own"
on public.pov_statements
for insert
with check (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = pov_statements.session_id
      and s.user_id = auth.uid()
  )
);

create policy "pov_statements_update_own"
on public.pov_statements
for update
using (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = pov_statements.session_id
      and s.user_id = auth.uid()
  )
);

create policy "pov_statements_delete_own"
on public.pov_statements
for delete
using (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = pov_statements.session_id
      and s.user_id = auth.uid()
  )
);

-- 3) HMW Questions
create table if not exists public.hmw_questions (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.pov_hmw_sessions(id) on delete cascade,
  question         text not null,
  student_name     text not null,
  is_final_selection boolean not null default false,
  order_index      integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger hmw_questions_set_updated
before update on public.hmw_questions
for each row execute procedure moddatetime(updated_at);

create index if not exists idx_hmw_questions_session on public.hmw_questions(session_id);
create index if not exists idx_hmw_questions_created on public.hmw_questions(created_at);

alter table public.hmw_questions enable row level security;

create policy "hmw_questions_select_own"
on public.hmw_questions
for select
using (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = hmw_questions.session_id
      and s.user_id = auth.uid()
  )
);

create policy "hmw_questions_insert_own"
on public.hmw_questions
for insert
with check (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = hmw_questions.session_id
      and s.user_id = auth.uid()
  )
);

create policy "hmw_questions_update_own"
on public.hmw_questions
for update
using (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = hmw_questions.session_id
      and s.user_id = auth.uid()
  )
);

create policy "hmw_questions_delete_own"
on public.hmw_questions
for delete
using (
  exists (
    select 1
    from public.pov_hmw_sessions s
    where s.id = hmw_questions.session_id
      and s.user_id = auth.uid()
  )
);
