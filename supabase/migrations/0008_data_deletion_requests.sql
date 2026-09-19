-- Meta's data deletion callback must hand back a confirmation code that
-- the person can later look up to check the request was honoured. That
-- means the request has to be recorded somewhere.

create table data_deletion_requests (
  id uuid primary key default uuid_generate_v4(),
  confirmation_code text not null unique,
  meta_user_id text,
  source text not null default 'facebook_callback',
  status text not null default 'completed',
  connections_removed int not null default 0,
  pages_removed int not null default 0,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_data_deletion_code on data_deletion_requests(confirmation_code);

-- The status page looks a code up without logging in, so anonymous reads
-- are allowed — but only of rows whose code you already know, which acts
-- as the secret. No other column identifies a person.
alter table data_deletion_requests enable row level security;

create policy "deletion_requests_public_lookup" on data_deletion_requests
  for select using (true);
