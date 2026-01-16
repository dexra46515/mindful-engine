-- =====================================================
-- MULTI-AGENT BEHAVIORAL ENGINE - COMPLETE SCHEMA
-- =====================================================

-- ENUMS
create type public.app_role as enum ('admin', 'parent', 'youth');
create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
create type public.intervention_type as enum ('soft_nudge', 'medium_friction', 'hard_block', 'parent_alert');
create type public.intervention_status as enum ('pending', 'delivered', 'acknowledged', 'dismissed', 'escalated');
create type public.agent_type as enum ('orchestrator', 'risk_agent', 'intervention_agent', 'feedback_agent');
create type public.session_state as enum ('active', 'paused', 'ended');
create type public.event_type as enum (
  'app_open', 'app_close', 'screen_view', 'scroll', 'tap', 
  'session_start', 'session_end', 'reopen', 'background', 'foreground'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles (linked to auth.users)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  avatar_url text,
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User Roles (separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Parent-Youth Relationships
create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references auth.users(id) on delete cascade not null,
  youth_id uuid references auth.users(id) on delete cascade not null,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  unique (parent_id, youth_id)
);

-- Devices
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  device_identifier text not null,
  device_name text,
  platform text, -- ios, android, web
  os_version text,
  app_version text,
  is_active boolean default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_identifier)
);

-- Sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  device_id uuid references public.devices(id) on delete cascade not null,
  state session_state default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer default 0,
  reopen_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Behavioral Events
create table public.behavioral_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  device_id uuid references public.devices(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  event_type event_type not null,
  event_data jsonb default '{}',
  screen_name text,
  timestamp timestamptz not null default now(),
  processed boolean default false,
  created_at timestamptz not null default now()
);

-- Create index for fast event queries
create index idx_events_user_timestamp on public.behavioral_events(user_id, timestamp desc);
create index idx_events_session on public.behavioral_events(session_id);
create index idx_events_unprocessed on public.behavioral_events(processed) where processed = false;

-- =====================================================
-- RISK ENGINE TABLES
-- =====================================================

-- Risk States (current risk level per user)
create table public.risk_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_level risk_level default 'low',
  score numeric(5,2) default 0,
  session_duration_factor numeric(5,2) default 0,
  reopen_frequency_factor numeric(5,2) default 0,
  late_night_factor numeric(5,2) default 0,
  scroll_velocity_factor numeric(5,2) default 0,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Risk History (audit trail)
create table public.risk_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  previous_level risk_level,
  new_level risk_level not null,
  score numeric(5,2) not null,
  factors jsonb default '{}',
  triggered_by text, -- which agent/event triggered
  created_at timestamptz not null default now()
);

create index idx_risk_history_user on public.risk_history(user_id, created_at desc);

-- =====================================================
-- INTERVENTION TABLES
-- =====================================================

-- Intervention Templates
create table public.intervention_templates (
  id uuid primary key default gen_random_uuid(),
  type intervention_type not null,
  name text not null,
  title text not null,
  message text not null,
  action_label text,
  action_url text,
  priority integer default 0,
  min_risk_level risk_level default 'low',
  cooldown_minutes integer default 30,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Active Interventions (delivered to users)
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  template_id uuid references public.intervention_templates(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  type intervention_type not null,
  status intervention_status default 'pending',
  risk_level_at_trigger risk_level not null,
  risk_score_at_trigger numeric(5,2),
  title text not null,
  message text not null,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  dismissed_at timestamptz,
  escalated_at timestamptz,
  user_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_interventions_user on public.interventions(user_id, created_at desc);
create index idx_interventions_status on public.interventions(status);

-- =====================================================
-- POLICY TABLES
-- =====================================================

-- Policies (parent-defined or system defaults)
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade, -- null = system default
  target_user_id uuid references auth.users(id) on delete cascade, -- null = applies to owner's children
  name text not null,
  is_system_default boolean default false,
  is_active boolean default true,
  
  -- Time-based rules
  daily_limit_minutes integer, -- max screen time per day
  session_limit_minutes integer, -- max per session
  bedtime_start time, -- e.g., 22:00
  bedtime_end time, -- e.g., 07:00
  
  -- Behavior thresholds
  reopen_threshold integer default 5, -- reopens before warning
  scroll_velocity_threshold numeric(5,2),
  
  -- Escalation settings
  escalation_enabled boolean default true,
  escalation_delay_minutes integer default 15,
  parent_alert_threshold risk_level default 'high',
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- AGENT ORCHESTRATION TABLES
-- =====================================================

-- Agent Execution Logs
create table public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_type agent_type not null,
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  input_data jsonb default '{}',
  output_data jsonb default '{}',
  execution_time_ms integer,
  success boolean default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_agent_logs_user on public.agent_logs(user_id, created_at desc);
create index idx_agent_logs_agent on public.agent_logs(agent_type, created_at desc);

-- Agent State (for state machine tracking)
create table public.agent_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_state text default 'idle',
  state_data jsonb default '{}',
  last_transition_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feedback Loop Data
create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  intervention_id uuid references public.interventions(id) on delete cascade,
  feedback_type text not null, -- 'effective', 'ineffective', 'ignored', 'escalated'
  context jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_feedback_user on public.feedback_events(user_id, created_at desc);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Check if user is parent of another user
create or replace function public.is_parent_of(_parent_id uuid, _youth_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_links
    where parent_id = _parent_id
      and youth_id = _youth_id
      and is_active = true
  )
$$;

-- Updated at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Apply updated_at triggers
create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_devices_updated_at before update on public.devices for each row execute function public.update_updated_at_column();
create trigger update_sessions_updated_at before update on public.sessions for each row execute function public.update_updated_at_column();
create trigger update_risk_states_updated_at before update on public.risk_states for each row execute function public.update_updated_at_column();
create trigger update_intervention_templates_updated_at before update on public.intervention_templates for each row execute function public.update_updated_at_column();
create trigger update_interventions_updated_at before update on public.interventions for each row execute function public.update_updated_at_column();
create trigger update_policies_updated_at before update on public.policies for each row execute function public.update_updated_at_column();
create trigger update_agent_states_updated_at before update on public.agent_states for each row execute function public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.family_links enable row level security;
alter table public.devices enable row level security;
alter table public.sessions enable row level security;
alter table public.behavioral_events enable row level security;
alter table public.risk_states enable row level security;
alter table public.risk_history enable row level security;
alter table public.intervention_templates enable row level security;
alter table public.interventions enable row level security;
alter table public.policies enable row level security;
alter table public.agent_logs enable row level security;
alter table public.agent_states enable row level security;
alter table public.feedback_events enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Parents can view children profiles" on public.profiles for select using (public.is_parent_of(auth.uid(), user_id));

-- USER_ROLES POLICIES
create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- FAMILY_LINKS POLICIES
create policy "Parents can view own links" on public.family_links for select using (auth.uid() = parent_id);
create policy "Youth can view links to them" on public.family_links for select using (auth.uid() = youth_id);
create policy "Parents can manage family links" on public.family_links for all using (auth.uid() = parent_id);

-- DEVICES POLICIES
create policy "Users can manage own devices" on public.devices for all using (auth.uid() = user_id);
create policy "Parents can view children devices" on public.devices for select using (public.is_parent_of(auth.uid(), user_id));

-- SESSIONS POLICIES
create policy "Users can view own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);
create policy "Parents can view children sessions" on public.sessions for select using (public.is_parent_of(auth.uid(), user_id));

-- BEHAVIORAL_EVENTS POLICIES
create policy "Users can insert own events" on public.behavioral_events for insert with check (auth.uid() = user_id);
create policy "Users can view own events" on public.behavioral_events for select using (auth.uid() = user_id);
create policy "Parents can view children events" on public.behavioral_events for select using (public.is_parent_of(auth.uid(), user_id));

-- RISK_STATES POLICIES
create policy "Users can view own risk state" on public.risk_states for select using (auth.uid() = user_id);
create policy "Parents can view children risk state" on public.risk_states for select using (public.is_parent_of(auth.uid(), user_id));

-- RISK_HISTORY POLICIES
create policy "Users can view own risk history" on public.risk_states for select using (auth.uid() = user_id);
create policy "Parents can view children risk history" on public.risk_history for select using (public.is_parent_of(auth.uid(), user_id));

-- INTERVENTION_TEMPLATES POLICIES
create policy "Anyone can view active templates" on public.intervention_templates for select using (is_active = true);
create policy "Admins can manage templates" on public.intervention_templates for all using (public.has_role(auth.uid(), 'admin'));

-- INTERVENTIONS POLICIES
create policy "Users can view own interventions" on public.interventions for select using (auth.uid() = user_id);
create policy "Users can update own interventions" on public.interventions for update using (auth.uid() = user_id);
create policy "Parents can view children interventions" on public.interventions for select using (public.is_parent_of(auth.uid(), user_id));

-- POLICIES POLICIES
create policy "Users can view applicable policies" on public.policies for select using (
  owner_id = auth.uid() OR 
  target_user_id = auth.uid() OR 
  is_system_default = true OR
  public.is_parent_of(owner_id, auth.uid())
);
create policy "Parents can manage own policies" on public.policies for all using (auth.uid() = owner_id);

-- AGENT_LOGS POLICIES
create policy "Users can view own agent logs" on public.agent_logs for select using (auth.uid() = user_id);
create policy "Parents can view children agent logs" on public.agent_logs for select using (public.is_parent_of(auth.uid(), user_id));

-- AGENT_STATES POLICIES
create policy "Users can view own agent state" on public.agent_states for select using (auth.uid() = user_id);

-- FEEDBACK_EVENTS POLICIES
create policy "Users can insert own feedback" on public.feedback_events for insert with check (auth.uid() = user_id);
create policy "Users can view own feedback" on public.feedback_events for select using (auth.uid() = user_id);

-- =====================================================
-- SEED INTERVENTION TEMPLATES
-- =====================================================

insert into public.intervention_templates (type, name, title, message, action_label, priority, min_risk_level, cooldown_minutes) values
('soft_nudge', 'gentle_reminder', 'Take a Break?', 'You''ve been scrolling for a while. How about a quick stretch?', 'Dismiss', 1, 'low', 30),
('soft_nudge', 'breathing_exercise', 'Breathe', 'Try a 30-second breathing exercise to reset.', 'Start', 2, 'medium', 45),
('medium_friction', 'session_warning', 'Extended Session', 'You''ve been using the app for over an hour. Consider taking a break.', 'Continue', 3, 'medium', 60),
('medium_friction', 'reopen_notice', 'Frequent Reopening', 'This is your 5th time opening the app in the last hour.', 'I Understand', 4, 'medium', 30),
('hard_block', 'daily_limit', 'Daily Limit Reached', 'You''ve reached your daily screen time limit.', 'Request Extension', 5, 'high', 1440),
('hard_block', 'bedtime_block', 'Bedtime Mode', 'It''s past your bedtime. The app is locked until morning.', 'OK', 6, 'high', 480),
('parent_alert', 'high_risk_alert', 'Alert Sent', 'Your parent has been notified about extended usage.', 'OK', 7, 'critical', 120);