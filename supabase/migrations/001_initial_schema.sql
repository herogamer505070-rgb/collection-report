-- Helper: updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- companies
create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique,
  created_at timestamptz not null default now()
);
alter table public.companies enable row level security;

-- company_users
create table public.company_users (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','manager','collector')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);
alter table public.company_users enable row level security;
create index idx_company_users_user_id on public.company_users(user_id);
create index idx_company_users_company_id on public.company_users(company_id);

-- RLS helper function
create or replace function public.get_my_company_id()
returns uuid language sql stable security definer as $$
  select company_id
  from   public.company_users
  where  user_id = auth.uid()
    and  is_active = true
  limit  1;
$$;

-- customers
create table public.customers (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  external_customer_id text,
  name                 text,
  phone_e164           text,
  alternate_phone      text,
  national_id          text,
  raw_identity         jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.customers enable row level security;
create unique index uq_customers_company_external
  on public.customers(company_id, external_customer_id)
  where external_customer_id is not null;
create index idx_customers_company_id on public.customers(company_id);
create index idx_customers_name on public.customers(name);
create trigger customers_updated_at
  before update on public.customers
  for each row execute procedure public.handle_updated_at();

-- collection_cases
create table public.collection_cases (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  customer_id          uuid not null references public.customers(id) on delete cascade,
  import_batch_id      uuid,
  external_case_id     text,
  case_fingerprint     text not null,
  case_identity_source text not null default 'fingerprint'
                         check (case_identity_source in ('external_id','fingerprint')),
  contract_number      text,
  unit_code            text,
  project_name         text,
  amount_due           numeric(14,2) not null default 0,
  amount_paid          numeric(14,2) not null default 0,
  currency_code        text not null default 'EGP',
  payment_type         text not null default 'installment'
                         check (payment_type in ('delivery','installment','late_fee','other')),
  due_date             date,
  status               text not null default 'pending'
                         check (status in ('pending','paid','partial','overdue','invalid')),
  assigned_to_user_id  uuid references auth.users(id),
  last_contacted_at    timestamptz,
  raw_row              jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.collection_cases enable row level security;
create unique index uq_collection_cases_company_fingerprint
  on public.collection_cases(company_id, case_fingerprint);
create unique index uq_collection_cases_company_external_case_id
  on public.collection_cases(company_id, external_case_id)
  where external_case_id is not null;
create index idx_collection_cases_company_id on public.collection_cases(company_id);
create index idx_collection_cases_customer_id on public.collection_cases(customer_id);
create index idx_collection_cases_assigned_user on public.collection_cases(assigned_to_user_id);
create index idx_collection_cases_status on public.collection_cases(status);
create index idx_collection_cases_due_date on public.collection_cases(due_date);
create trigger collection_cases_updated_at
  before update on public.collection_cases
  for each row execute procedure public.handle_updated_at();

-- case_notes
create table public.case_notes (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id    uuid not null references public.collection_cases(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);
alter table public.case_notes enable row level security;
create index idx_case_notes_case_id on public.case_notes(case_id);

-- whatsapp_configs
create table public.whatsapp_configs (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null unique references public.companies(id) on delete cascade,
  phone_number_id        text not null,
  business_account_id    text,
  access_token_encrypted text not null,
  app_secret_encrypted   text not null,
  verify_token           text not null,
  display_phone_number   text,
  verified_name          text,
  quality_rating         text,
  is_active              boolean not null default true,
  connected_at           timestamptz,
  updated_at             timestamptz not null default now()
);
alter table public.whatsapp_configs enable row level security;
create trigger whatsapp_configs_updated_at
  before update on public.whatsapp_configs
  for each row execute procedure public.handle_updated_at();

-- whatsapp_message_logs
create table public.whatsapp_message_logs (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  case_id            uuid not null references public.collection_cases(id) on delete cascade,
  customer_id        uuid not null references public.customers(id) on delete cascade,
  sent_by_user_id    uuid references auth.users(id),
  meta_message_id    text,
  template_name      text,
  template_variables jsonb,
  message_type       text not null check (message_type in ('template','text')),
  rendered_message   text,
  status             text not null default 'queued'
                       check (status in ('queued','sent','delivered','read','failed')),
  error_code         text,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.whatsapp_message_logs enable row level security;
create index idx_wml_company_id on public.whatsapp_message_logs(company_id);
create index idx_wml_case_id on public.whatsapp_message_logs(case_id);
create trigger whatsapp_message_logs_updated_at
  before update on public.whatsapp_message_logs
  for each row execute procedure public.handle_updated_at();

-- excel_templates
create table public.excel_templates (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  file_kind        text not null default 'xlsx' check (file_kind in ('xlsx','csv')),
  header_row_index integer not null default 1,
  mapping_rules    jsonb not null,
  matching_rules   jsonb,
  is_default       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.excel_templates enable row level security;
create trigger excel_templates_updated_at
  before update on public.excel_templates
  for each row execute procedure public.handle_updated_at();

-- import_batches
create table public.import_batches (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id),
  storage_path        text not null,
  source_filename     text,
  template_id         uuid references public.excel_templates(id),
  total_rows          integer,
  valid_rows          integer default 0,
  invalid_rows        integer default 0,
  duplicate_rows      integer default 0,
  status              text not null default 'pending'
                        check (status in ('pending','processing','cancel_requested','cancelled','completed','failed')),
  error_report        jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.import_batches enable row level security;
create index idx_import_batches_company_id on public.import_batches(company_id);
create trigger import_batches_updated_at
  before update on public.import_batches
  for each row execute procedure public.handle_updated_at();

-- audit_logs
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  entity_type   text not null,
  entity_id     uuid,
  action        text not null,
  before_state  jsonb,
  after_state   jsonb,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create index idx_audit_logs_company_id on public.audit_logs(company_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ========================
-- RLS POLICIES
-- ========================

-- companies
create policy "companies_select_own" on public.companies for select
  using (id = public.get_my_company_id());

-- company_users
create policy "company_users_select_own" on public.company_users for select
  using (company_id = public.get_my_company_id());

-- customers
create policy "customers_select" on public.customers for select using (company_id = public.get_my_company_id());
create policy "customers_insert" on public.customers for insert with check (company_id = public.get_my_company_id());
create policy "customers_update" on public.customers for update using (company_id = public.get_my_company_id());
create policy "customers_delete" on public.customers for delete using (company_id = public.get_my_company_id());

-- collection_cases: admin/manager see all; collector sees only assigned
create policy "cases_select" on public.collection_cases for select
  using (
    company_id = public.get_my_company_id()
    and (
      exists (
        select 1 from public.company_users
        where user_id = auth.uid()
          and company_id = public.get_my_company_id()
          and role in ('admin','manager')
          and is_active = true
      )
      or assigned_to_user_id = auth.uid()
    )
  );
create policy "cases_insert" on public.collection_cases for insert with check (company_id = public.get_my_company_id());
create policy "cases_update" on public.collection_cases for update using (company_id = public.get_my_company_id());
create policy "cases_delete" on public.collection_cases for delete using (company_id = public.get_my_company_id());

-- case_notes
create policy "case_notes_select" on public.case_notes for select using (company_id = public.get_my_company_id());
create policy "case_notes_insert" on public.case_notes for insert with check (company_id = public.get_my_company_id());
create policy "case_notes_delete" on public.case_notes for delete using (company_id = public.get_my_company_id() and user_id = auth.uid());

-- whatsapp_configs: admin only for write
create policy "whatsapp_configs_select" on public.whatsapp_configs for select using (company_id = public.get_my_company_id());
create policy "whatsapp_configs_insert" on public.whatsapp_configs for insert
  with check (
    company_id = public.get_my_company_id()
    and exists (select 1 from public.company_users where user_id = auth.uid() and company_id = public.get_my_company_id() and role = 'admin' and is_active = true)
  );
create policy "whatsapp_configs_update" on public.whatsapp_configs for update
  using (
    company_id = public.get_my_company_id()
    and exists (select 1 from public.company_users where user_id = auth.uid() and company_id = public.get_my_company_id() and role = 'admin' and is_active = true)
  );

-- whatsapp_message_logs: read-only for users
create policy "wml_select" on public.whatsapp_message_logs for select using (company_id = public.get_my_company_id());

-- excel_templates
create policy "templates_select" on public.excel_templates for select using (company_id = public.get_my_company_id());
create policy "templates_insert" on public.excel_templates for insert with check (company_id = public.get_my_company_id());
create policy "templates_update" on public.excel_templates for update using (company_id = public.get_my_company_id());
create policy "templates_delete" on public.excel_templates for delete using (company_id = public.get_my_company_id());

-- import_batches
create policy "import_batches_select" on public.import_batches for select using (company_id = public.get_my_company_id());
create policy "import_batches_insert" on public.import_batches for insert with check (company_id = public.get_my_company_id());
create policy "import_batches_update" on public.import_batches for update using (company_id = public.get_my_company_id());

-- audit_logs: read-only
create policy "audit_logs_select" on public.audit_logs for select using (company_id = public.get_my_company_id());
