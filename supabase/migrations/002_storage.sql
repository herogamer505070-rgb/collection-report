-- Create the private imports bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imports',
  'imports',
  false,
  20971520, -- 20 MB
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own company folder
create policy "company members can upload imports"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.company_users
      where user_id = auth.uid() and is_active = true
      limit 1
    )
  );

-- Allow authenticated users to read their own company files
create policy "company members can read imports"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.company_users
      where user_id = auth.uid() and is_active = true
      limit 1
    )
  );
