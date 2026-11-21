-- =====================================================================
-- Complaint-Sathi : additions to 01_supabase_schema.sql
-- Required by the master prompt but not present in 01:
--   * ai_analysis_log  (section 8 — AI input/output metadata, no PII)
--   * notifications    (section 10 — in-app notifications)
-- Re-runnable: uses IF NOT EXISTS / ON CONFLICT guards.
-- =====================================================================

create table if not exists ai_analysis_log (
  id            bigint generated always as identity primary key,
  user_id       uuid references profiles(id),
  complaint_id  uuid references complaints(id),
  provider      text not null,                    -- anthropic | gemini | fallback
  model         text not null,
  language      text,                             -- detected language code
  ward_id       int references wards(id),
  category_slug text,                             -- predicted category
  severity      severity_level,
  confidence    numeric(4,3),
  source        text not null default 'model',    -- model | fallback
  latency_ms    int,
  created_at    timestamptz not null default now()
);
create index if not exists ai_log_created_idx on ai_analysis_log(created_at desc);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  type        text not null,                      -- complaint_submitted | status_change | resolved | department_approved | department_rejected | changes_requested | department_suspended | officer_invite
  title       text not null,
  body        text not null default '',
  entity_type text,                               -- complaint | department
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notif_user_idx on notifications(user_id, created_at desc);

alter table ai_analysis_log enable row level security;
alter table notifications  enable row level security;

-- Users read their own AI logs / notifications; admin reads all.
drop policy if exists ai_log_self  on ai_analysis_log;
create policy ai_log_self  on ai_analysis_log for select using (user_id = auth.uid() or auth_role() = 'admin');
drop policy if exists ai_log_admin on ai_analysis_log;
create policy ai_log_admin on ai_analysis_log for select using (auth_role() = 'admin');

drop policy if exists notif_self  on notifications;
create policy notif_self  on notifications for select using (user_id = auth.uid());
drop policy if exists notif_admin on notifications;
create policy notif_admin on notifications for select using (auth_role() = 'admin');
