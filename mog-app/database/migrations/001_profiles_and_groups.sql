-- profiles table (one per auth user)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  height_cm numeric,
  weight_kg numeric,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- leaderboard groups
create table if not exists leaderboard_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references auth.users on delete cascade not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz default now()
);

alter table leaderboard_groups enable row level security;

create policy "Anyone authenticated can view groups"
  on leaderboard_groups for select using (auth.role() = 'authenticated');

create policy "Users can create groups"
  on leaderboard_groups for insert with check (auth.uid() = created_by);

-- group members
create table if not exists group_members (
  group_id uuid references leaderboard_groups on delete cascade,
  user_id uuid references auth.users on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table group_members enable row level security;

create policy "Anyone authenticated can view group members"
  on group_members for select using (auth.role() = 'authenticated');

create policy "Users can join groups"
  on group_members for insert with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on group_members for delete using (auth.uid() = user_id);
