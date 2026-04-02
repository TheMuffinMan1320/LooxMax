create table if not exists scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  scores jsonb not null,
  overall_score numeric not null,
  scanned_at timestamptz default now()
);

alter table scans enable row level security;

create policy "Users can view own scans"
  on scans for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on scans for insert with check (auth.uid() = user_id);
