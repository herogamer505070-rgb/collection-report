# Claude Blueprint — Multi-Tenant Collections Web App with WhatsApp

> Purpose: this document is the single implementation blueprint for Claude Sonnet to build the product.
> Language policy: UI copy is Arabic and **RTL**. Code, architecture notes, and technical comments are in English.
> Build policy: prefer **one TypeScript stack** end-to-end unless a separate worker is absolutely necessary.

---

## 1) Product Summary

Build a multi-tenant collections web app for companies that upload Excel/CSV files containing receivables data. The app should:

- ingest and normalize uploaded spreadsheets,
- show KPI cards and analytical charts,
- render a searchable/filterable table for collection records,
- allow internal notes,
- connect each tenant to its own WhatsApp Business / Meta setup,
- send manual, dynamic WhatsApp reminders from the UI,
- keep data isolated per company with strong RBAC and auditability.

This product must be SaaS-ready from day one.

---

## 2) Primary Product Decisions

### 2.1 Core modeling choice
Do **not** model the operational row as only `customer` unless the business is guaranteed to have one debt row per customer.

Use this structure instead:

- `customers`: master identity of the person/entity.
- `collection_cases`: the actual collectible item / row imported from Excel.

This avoids breaking the product when one customer has multiple installments, invoices, units, or contracts.

### 2.2 MVP scope
The MVP must include:

- auth + tenant isolation,
- tenant WhatsApp setup page,
- Excel/CSV upload + preview + mapping,
- import processing with validation report,
- KPI cards,
- customer/case table,
- notes,
- manual WhatsApp sending,
- webhook status updates,
- role-based access.

### 2.3 Non-goals for MVP
Do **not** build these in v1 unless explicitly requested later:

- full chatbot/inbox,
- automated message scheduling engine,
- payment gateway integration,
- advanced BI warehouse,
- native mobile app,
- OCR-based ingestion.

---

## 3) Tech Stack

Use the latest stable versions compatible with each other.

### Frontend / App
- Next.js App Router
- TypeScript (strict mode)
- React
- Tailwind CSS
- shadcn/ui
- TanStack Table
- React Hook Form + Zod
- React Query (TanStack Query)
- date-fns
- Recharts
- sonner
- nuqs (URL state)

### Backend / Platform
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions **only where they make sense**

### Processing strategy
- Use **Node runtime server-side processing** for Excel parsing and crypto-heavy logic.
- For any import route, parser module, or Route Handler that touches `xlsx` / `exceljs`, explicitly pin the runtime to **Node.js**. In Next.js, do not rely on implicit runtime selection in production.
- Prefer putting import execution behind a Route Handler or server module in a segment configured with `export const runtime = 'nodejs'`.
- Avoid forcing Excel parsing into Edge Functions if libraries/runtime compatibility becomes painful.
- If imports become heavy, move processing into a dedicated worker / background job runner later.

### Parsing libraries
Choose one of:
- `xlsx` (SheetJS) for broad XLSX/CSV parsing,
- `exceljs` if needed for richer workbook handling.

Prefer `xlsx` for MVP unless a concrete requirement demands `exceljs`.

---

## 4) Architecture Principles

1. **Single source of truth is Postgres.**
2. **Tenant isolation is enforced by RLS first, UI second.**
3. **Server Actions / Route Handlers never trust client role claims.**
4. **Use two Supabase clients when needed:**
   - SSR/session client for current authenticated user context.
   - admin/service client only after authorization is confirmed.
5. **Do not subscribe to SQL views directly as a realtime strategy.** Subscribe to base tables and re-fetch aggregates.
6. **Do not rely on Postgres Changes as the universal realtime solution at scale.** Use it selectively; prefer invalidation/broadcast patterns for app-level refresh.
7. **All Arabic UI must render RTL.**
8. **Uploads must be idempotent.** Re-importing the same logical rows must update, not duplicate.

---

## 5) User Roles and Access Model

### Roles
- `admin`: full tenant control.
- `manager`: read dashboards and cases, send WhatsApp, add notes, limited case edits if approved.
- `collector`: only assigned cases/customers, send WhatsApp manually, add notes, no settings/import access.

### Important correction
Because collectors should not see the whole tenant by default, the schema must support assignment.

Use one of:
- `collection_cases.assigned_to_user_id`, or
- a dedicated `case_assignments` table.

For MVP, `assigned_to_user_id` on `collection_cases` is enough.

---

## 6) Core Data Model

Below is the recommended schema shape. Claude may refine exact types and indexes, but the structure must stay close to this.

### 6.1 companies
```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);
```

### 6.2 company_users
```sql
create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','collector')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);
```

### 6.3 customers
```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  external_customer_id text,
  name text,
  phone_e164 text,
  alternate_phone text,
  national_id text,
  raw_identity jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended unique strategy for MVP:
- unique(company_id, external_customer_id) when a reliable external id exists,
- otherwise allow multiple rows and deduplicate cautiously at import time.

### 6.4 collection_cases
This is the main table for the grid.

```sql
create table collection_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  import_batch_id uuid,
  external_case_id text,
  case_fingerprint text not null,
  case_identity_source text not null default 'fingerprint' check (case_identity_source in ('external_id','fingerprint')),
  contract_number text,
  unit_code text,
  project_name text,
  amount_due numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  currency_code text not null default 'EGP',
  payment_type text not null default 'installment' check (payment_type in ('delivery','installment','late_fee','other')),
  due_date date,
  status text not null default 'pending' check (status in ('pending','paid','partial','overdue','invalid')),
  assigned_to_user_id uuid references auth.users(id),
  last_contacted_at timestamptz,
  raw_row jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_collection_cases_company_fingerprint
on collection_cases(company_id, case_fingerprint);

create unique index uq_collection_cases_company_external_case_id
on collection_cases(company_id, external_case_id)
where external_case_id is not null;
```

**Schema note:** `payment_type` exists to make downstream analytics and dynamic WhatsApp wording more accurate. It enables filters such as delivery payments, recurring installments, and late-fee follow-ups without forcing Claude to infer these semantics only from free-form imported text.

**Identity note:** do not assume every tenant file contains a stable external case identifier. `external_case_id` is optional when the source file does not provide a durable ID. In that case, generate a deterministic `case_fingerprint` from normalized stable fields such as tenant + contract/unit/project + due_date + amount_due + payment_type. Upserts must target `company_id + case_fingerprint`, while `company_id + external_case_id` is only used when the source provides a trustworthy external ID.

### 6.5 case_notes
```sql
create table case_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  case_id uuid not null references collection_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);
```

### 6.6 whatsapp_configs
```sql
create table whatsapp_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies(id) on delete cascade,
  phone_number_id text not null,
  business_account_id text,
  access_token_encrypted text not null,
  app_secret_encrypted text not null,
  verify_token text not null,
  display_phone_number text,
  verified_name text,
  quality_rating text,
  is_active boolean not null default true,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
```

**Deletion note:** historical message logs must survive WhatsApp config deletion or rotation. `whatsapp_message_logs` should reference the company/case/customer context and store message metadata directly; do not make past logs depend on a live foreign key to the current WhatsApp config row.

**Webhook secret note:** if each tenant uses its own Meta app, store the tenant app secret encrypted alongside the access token so POST webhook signatures can be validated correctly.

### 6.7 whatsapp_message_logs
```sql
create table whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  case_id uuid not null references collection_cases(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  sent_by_user_id uuid references auth.users(id),
  meta_message_id text,
  template_name text,
  template_variables jsonb,
  message_type text not null check (message_type in ('template','text')),
  rendered_message text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','read','failed')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Audit note:** `template_variables` should store the exact rendered variables sent at message time (for example amount, due date, customer name, and case reference). This gives a reliable audit trail even if the customer or case record changes later.

### 6.8 excel_templates
```sql
create table excel_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  file_kind text not null default 'xlsx' check (file_kind in ('xlsx','csv')),
  header_row_index integer not null default 1,
  mapping_rules jsonb not null,
  matching_rules jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Template application rule:** on every new upload, Claude must try template resolution in this order:
1. explicit template chosen by the admin,
2. auto-match by stored `matching_rules` / known header aliases,
3. tenant default template (`is_default = true`),
4. if no confident match exists, stop at preview and require manual mapping confirmation before import continues.

Do not silently guess a template and import data without user confirmation when confidence is low.


### 6.9 import_batches
```sql
create table import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id),
  storage_path text not null,
  source_filename text,
  template_id uuid references excel_templates(id),
  total_rows integer,
  valid_rows integer default 0,
  invalid_rows integer default 0,
  duplicate_rows integer default 0,
  status text not null default 'pending' check (status in ('pending','processing','cancel_requested','cancelled','completed','failed')),
  error_report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.10 audit_logs
```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

This is **required in MVP**, not optional. Log at minimum:
- WhatsApp config create/update/delete
- import start/cancel/complete/fail
- case create/update/status change
- role changes
- note create/delete
- manual WhatsApp sends and webhook status transitions

### 6.11 optional helper tables
Optional but recommended later:
- `chart_snapshots`
- `saved_filters`
- `case_status_history`

---

## 7) KPI Strategy

Do not compute all KPI logic in the browser.

Use one of:
- SQL views / materialized views for aggregate queries,
- Postgres functions for scoped KPI payloads.

**Collector scoping rule:** whenever the viewer role is `collector`, every KPI query must be filtered by `collection_cases.assigned_to_user_id = current_user_id`. Do not show tenant-wide totals to collectors unless a later requirement explicitly changes this policy.

Recommended KPI set for MVP:
- Total outstanding amount
- Total paid amount
- Collection rate
- Overdue cases count
- Partial payment count
- Cases contacted today
- Average ticket size
- Top delinquency segments by project / collector / aging bucket

### Important realtime rule
Do **not** subscribe to a SQL view.
Instead:
1. subscribe to changes on `collection_cases`, `case_notes`, and optionally `whatsapp_message_logs`,
2. invalidate/refetch the KPI query.

---

## 8) Excel Ingestion Flow

### Supported inputs
- `.xlsx`
- `.csv`

### Required ingestion steps
1. Upload file to Supabase Storage.
2. Create `import_batches` row with `pending` status.
3. Parse workbook on the server.
4. Preview first rows to the user.
5. Auto-suggest mappings.
6. Allow manual mapping correction.
7. Validate each row.
8. Normalize customer + case payloads.
9. Upsert records transactionally in chunks.
10. Save import result summary and row-level errors.
11. Expose progress in UI.
12. Allow the user to cancel / stop the import while batches are still running, especially for large files uploaded by mistake.

### Auto-suggestion rules
The mapping assistant should propose likely columns for:
- customer name
- phone number
- external customer id
- external case id
- amount due
- amount paid
- due date
- project / unit / contract number

Use heuristics such as:
- header aliases,
- regex for phone/date/money,
- sample-row inspection.

### Validation rules
Each row must be classified as one of:
- valid
- invalid
- duplicate
- skipped

Validation examples:
- missing external case id -> **not automatically invalid**; if no stable external ID exists, fall back to deterministic fingerprint generation
- invalid or empty phone -> allowed for import, blocked for WhatsApp send
- negative amount_due -> invalid unless business rule explicitly allows credits
- malformed due date -> invalid or null based on chosen strictness

### Identity and upsert rules
Re-imports must not create duplicate active cases.

Use this resolution order:
1. if the file provides a stable `external_case_id`, upsert by `company_id + external_case_id`,
2. otherwise compute a deterministic `case_fingerprint` from normalized stable fields and upsert by `company_id + case_fingerprint`.

If neither a trustworthy external ID nor a safe fingerprint can be formed, keep the row in the validation report and require user review instead of silently importing ambiguous data.

### Data preservation rule
Keep raw imported row JSON in `collection_cases.raw_row` for traceability.

### Phone normalization rule
Store WhatsApp-sendable phone numbers in normalized **E.164** format.

For Egypt-first MVP:
- input like `01001234567` should normalize to `+201001234567`,
- input already in valid E.164 should be preserved,
- invalid or ambiguous numbers should remain imported but flagged as not WhatsApp-sendable until corrected.

Claude must implement phone normalization server-side, not rely only on browser formatting.

---

## 9) Dashboard UX Specification

### Layout
- Top navbar: tenant name, user menu, notifications.
- Sidebar: Dashboard, Upload, Customers/Cases, Settings, Team.
- Main area: breadcrumb, KPI cards, charts, table.

### Arabic requirement
- Entire dashboard UI is Arabic.
- Entire Arabic UI renders RTL.
- Numeric values remain readable and consistently formatted.

### KPI cards
Cards should be clickable where useful.
Examples:
- clicking “overdue” applies overdue filter to the table,
- clicking “partial” filters partial-payment cases.

### Charts for MVP
Pick 3–5 useful charts only:
- Aging buckets
- Outstanding by project
- Outstanding by collector
- Status distribution
- Payment trend by import batch / date (if data exists)

Avoid decorative charts with no operational value.

---

## 10) Main Table Specification

The operational table should be a **collection cases table**, even if the UI label is customer-oriented.

### Core columns
- Customer name
- Phone
- Project / Unit / Contract
- External case id
- Amount due
- Amount paid
- Balance
- Due date
- Aging bucket
- Status
- Assigned collector
- Last note preview
- Last contacted at
- Actions

### Table behaviors
- server-side pagination
- sorting
- keyword search
- status filter
- due date range filter
- collector filter
- project filter
- export current filtered result to CSV
- persist table state in URL using `nuqs`

### Row actions
- Send WhatsApp
- Add note
- Open details page
- Optional: assign collector (admin/manager only)

### Empty states
Provide explicit empty states:
- no data imported yet,
- no rows match current filters,
- upload failed,
- WhatsApp not configured.

---

## 11) Customer / Case Details Page

Route example:
- `/dashboard/cases/[id]`

This page should include:
- customer summary
- full case data
- notes timeline
- WhatsApp log timeline
- import source metadata
- optional status history

This becomes the audit page for internal users.

---

## 12) WhatsApp Integration Blueprint

### 12.1 Business rules
The app supports **manual outbound sending** from the UI.

### 12.2 Product constraints that must shape implementation
- Outside the customer service window, outbound business-initiated messages must use approved templates.
- Inside the active customer service window, free-form text can be sent.
- Tenants must have appropriate WhatsApp opt-in from recipients before business messaging.

### 12.3 Tenant setup page
Create `/dashboard/settings/whatsapp`.

Fields:
- Phone Number ID
- Business Account ID (optional but recommended)
- Access Token

On connect:
1. validate payload shape,
2. call Meta endpoint to verify credentials,
3. encrypt token before storage,
4. generate and store a tenant-specific `verify_token`,
5. display connected status and phone metadata.

### 12.4 Message composition flow
When user clicks send:
1. fetch case + customer + tenant WhatsApp config,
2. determine whether a template is required,
3. render preview,
4. send via secure server-side action,
5. log result,
6. surface toast,
7. update message log timeline.

Important clarification for Claude:
- In WhatsApp Cloud API, whether a free-form message is allowed depends on the **24-hour customer service window**.
- Correctly evaluating this requires tracking the customer's last inbound interaction timestamp, which is **out of scope for the MVP**.
- Therefore, in Phase 1 / MVP implementation, treat this decision point as a **placeholder** and prefer a safe default:
  - either send all outbound messages using an approved template, or
  - assume a template may be required unless future conversation-window tracking is implemented.
- Add an explicit code comment noting that conversation-window logic is deferred to a later phase.

### 12.5 Webhook flow
Create a tenant-aware webhook route.

Recommended route patterns:
- single app webhook with tenant resolution from metadata, or
- override strategy per tenant if operationally needed.

For MVP, use **one webhook endpoint** and resolve tenant by phone number / metadata wherever possible.

Important clarification for Claude:
- This MVP strategy is acceptable, but it may not guarantee 100% tenant resolution accuracy in all future multi-tenant production scenarios.
- Add an explicit code comment noting that this routing strategy may later be upgraded to a **tenant-specific webhook URL** or a stricter tenant-specific verification / routing mechanism.
- Keep the webhook handler modular so the routing strategy can be swapped later without rewriting the business logic.

Webhook responsibilities:
- GET verification using `verify_token`
- POST status updates
- verify the POST request signature using `X-Hub-Signature-256` and HMAC-SHA256 with the Meta app secret before trusting the payload
- update `whatsapp_message_logs`
- optionally update `collection_cases.last_contacted_at`

Performance note:
- Meta webhook endpoints must return `200 OK` very quickly.
- Next.js Route Handlers are acceptable for MVP, but if cold starts or response latency cause delivery issues in production, move webhook ingestion to a lighter endpoint such as a Supabase Edge Function or another always-ready worker.
- Keep business logic decoupled from the HTTP entrypoint so the transport can be swapped later.

### 12.6 WhatsApp templates
Maintain template config server-side, not hard-coded in random UI components.

Recommended template use cases:
- payment reminder
- overdue follow-up
- confirmation / acknowledgement

Template variables should come from normalized case/customer fields.

---

## 13) Security Requirements

### 13.1 Supabase client separation
Use **two-client authorization pattern**:

1. `createServerClient()` using SSR cookies -> identify the current user.
2. `createAdminClient()` only after permissions are verified -> perform sensitive reads/writes.

Do not use a service/admin client as the source of truth for “who is the current user”.

### 13.2 Secrets
- Never expose service role keys to the browser.
- Never store WhatsApp access tokens in plain text.
- Encrypt sensitive tokens at rest using **AES-256-GCM**.
- Keep the active encryption key in server environment variables only, for example `WHATSAPP_TOKEN_ENCRYPTION_KEY_BASE64`.
- Keep a key identifier with each encrypted value so future key rotation is possible.
- Support key rotation by allowing decrypt-with-old / re-encrypt-with-new during admin-triggered maintenance or config update flows.
- Do not invent a weaker custom crypto scheme.

### 13.3 Webhook authenticity
- GET webhook verification via `verify_token` is not enough.
- POST webhook payloads from Meta must be verified using **HMAC-SHA256** from the `X-Hub-Signature-256` header and the Meta app secret.
- Reject unsigned or invalidly signed webhook payloads before any database write occurs.

### 13.4 RLS
Enable RLS on every tenant table.

Minimum rules:
- users can only read rows for their company,
- collectors can only access assigned cases,
- only admins can change WhatsApp settings,
- only admins can import files,
- managers/admins can view tenant-wide dashboards,
- collectors see KPIs scoped to their **assigned cases only**, not tenant-wide totals.

### 13.5 Auditability
Every sensitive action should be traceable:
- imports,
- note creation,
- WhatsApp sends,
- settings changes,
- role changes.

---

## 14) Realtime Strategy

### Do not use this anti-pattern
Do not build realtime by subscribing to every table/view blindly.

### Recommended pattern
- Use Postgres Changes selectively on `collection_cases` and `case_notes` where live freshness matters.
- For app-wide refresh, use query invalidation and re-fetch.
- For higher scale later, migrate hot paths to Broadcast.

### Important limitation to respect
Do not design realtime around “subscribe only to visible row ids” unless the library/API clearly supports the filter shape you need. Keep the first version simple and reliable.

### Practical MVP approach
- Table page subscribes to changes for `company_id`
- On matching event, invalidate the current list query
- KPI cards invalidate their scoped aggregate query
- Details page can subscribe to one case id if needed

This is simpler and safer than trying to micro-optimize too early.

---

## 15) File / Folder Structure

```text
app/
  (auth)/
    login/page.tsx
  (dashboard)/
    layout.tsx
    page.tsx
    cases/[id]/page.tsx
    upload/page.tsx
    settings/whatsapp/page.tsx
    settings/team/page.tsx
    actions/
      cases.ts
      imports.ts
      whatsapp.ts
    api/
      whatsapp/webhook/route.ts
components/
  dashboard/
    kpi-cards.tsx
    charts/
    cases-table/
      index.tsx
      columns.tsx
      toolbar.tsx
      row-actions.tsx
      send-whatsapp-dialog.tsx
      table-skeleton.tsx
  upload/
    upload-dropzone.tsx
    mapping-assistant.tsx
    import-review.tsx
  shared/
    rtl-shell.tsx
    status-badge.tsx
lib/
  supabase/
    client.ts
    server.ts
    admin.ts
  auth/
    permissions.ts
  crypto/
    tokens.ts
  imports/
    parse-workbook.ts
    suggest-mapping.ts
    normalize-row.ts
    validate-row.ts
    upsert-batch.ts
  whatsapp/
    send-message.ts
    resolve-template.ts
    verify-config.ts
    webhook-handler.ts
  format/
    currency.ts
    dates.ts
hooks/
  use-company-context.ts
  use-cases-query.ts
  use-kpi-query.ts
types/
  database.ts
  domain.ts
```

---

## 16) Server Actions and Route Handlers

### Preferred split
- use Server Actions for authenticated UI mutations,
- use Route Handlers for webhooks and long-running HTTP flows.

### Required actions
- `connectWhatsAppConfig`
- `disconnectWhatsAppConfig`
- `createImportBatch`
- `processImportBatch` (may internally dispatch worker logic)
- `createCaseNote`
- `sendWhatsAppMessage`
- `assignCaseCollector`

### Critical implementation rule
Every mutation must:
1. get current user from SSR/session-aware server client,
2. verify company membership and role,
3. then use admin client if elevated access is required.

---

## 17) Import Processing Rules

### Chunking
For large imports, process in chunks (example: 200–1000 rows depending on performance testing).

The import UI should show:
- current batch progress,
- processed rows vs remaining rows,
- a visible cancel / stop action,
- a safe end-state if cancellation happens mid-import.

### Error report
Generate import summary with:
- total rows
- inserted
- updated
- invalid
- duplicates
- skipped
- warnings

### Rollback philosophy
Do not require one massive all-or-nothing transaction for very large files if that will hurt reliability.

Safer MVP:
- batch processing,
- chunk-level error handling,
- final summary report.

---

## 18) UX and Messaging Details

### Notifications
Use Arabic toast messages for:
- send success/failure,
- import success/failure/cancel status,
- note saved,
- WhatsApp config connected,
- invalid phone / missing template.

### Validation messaging
Show actionable errors, not generic ones.

Examples:
- “رقم الهاتف غير صالح للإرسال عبر واتساب.”
- “هذا العميل يحتاج قالب واتساب معتمد لأن نافذة الـ 24 ساعة غير نشطة.”
- “تم رفع الملف لكن يوجد 18 صفًا غير صالح. راجع تقرير الأخطاء.”

### Import cancellation policy
For large-file imports, the UI must expose a clear Arabic **Cancel / Stop Import** action.

MVP behavior:
- cancellation is **cooperative**, not a hard DB rollback of already-committed chunks,
- stop scheduling new chunks as soon as cancel is requested,
- mark the batch as `cancel_requested` then `cancelled` after the current chunk finishes safely,
- show the user exactly how many rows were already committed.

### RTL requirements
- dashboard shell RTL
- table headers RTL
- forms RTL
- modals/drawers RTL
- charts can remain visually standard but labels are Arabic

---

## 19) Testing Requirements

Claude must include at least:

### Unit tests
- row normalization
- mapping suggestion heuristics
- phone validation
- permission guards
- token encryption/decryption

### Integration tests
- import happy path
- duplicate re-import path
- note creation
- WhatsApp config save flow
- WhatsApp send flow with mocked Meta responses

### Authorization tests
- collector cannot access unassigned case
- non-admin cannot modify WhatsApp config
- cross-tenant access is denied

---

## 20) Observability and Admin Diagnostics

Include production-friendly diagnostics:
- structured server logs,
- import batch status screen,
- webhook failure logging,
- last successful WhatsApp credential verification timestamp,
- retry-safe mutation patterns where relevant.

---

## 21) Acceptance Criteria

The implementation is acceptable only if all of the following are true:

1. A tenant admin can connect tenant-specific WhatsApp credentials successfully.
2. A tenant admin can upload a spreadsheet, map fields, and import data.
3. Re-import of the same external case ids updates existing records instead of duplicating them.
4. Dashboard KPIs and table render correctly from imported data.
5. Collector sees only assigned cases.
6. Notes can be added and viewed with user attribution.
7. Manual WhatsApp sending works through secure server-side logic.
8. Message statuses can be updated via webhook.
9. No sensitive token is exposed to the browser.
10. Arabic UI renders RTL consistently.
11. Cross-tenant data access is blocked.

---

## 22) Known Pitfalls to Avoid

1. **Do not use a plain `customers` table as the only operational record model** if multiple receivables per customer can exist.
2. **Do not hard-code exact Excel column names**.
3. **Do not store WhatsApp access tokens unencrypted**.
4. **Do not use service-role logic without first verifying the signed-in user**.
5. **Do not subscribe to SQL views expecting realtime aggregates**.
6. **Do not assume free-form WhatsApp text can always be sent**.
7. **Do not let collectors view all tenant cases**.
8. **Do not couple business logic directly to UI components**.
9. **Do not pin the whole implementation to outdated framework versions unless necessary**.
10. **Do not skip import error reporting**.

---

## 23) Claude Coding Instructions

When generating code from this blueprint, follow these rules exactly:

- Use strict TypeScript.
- Prefer clear domain types over `any`.
- Separate server and client concerns cleanly.
- Keep data-fetching logic out of dumb presentational components.
- Build reusable domain utilities for import normalization and permissions.
- Use SSR-safe Supabase setup.
- Use shadcn/ui primitives and TanStack Table.
- Keep Arabic UI text centralized where possible.
- Write composable code, not giant files.
- Include loading, empty, and error states.
- Include basic tests for risky logic.

---

## 24) Suggested Execution Order for Claude

Ask Claude to implement in this order:

### Phase 1
- project scaffold
- auth
- tenant context
- DB types
- RLS-ready data access foundation

### Phase 2
- WhatsApp settings page
- secure config save flow
- token encryption utilities

### Phase 3
- upload page
- mapping assistant
- import pipeline
- import summary UI

### Phase 4
- dashboard page
- KPI cards
- charts
- cases table with filters

### Phase 5
- notes
- case details page
- collector assignment

### Phase 6
- WhatsApp send flow
- webhook status sync
- audit polish

### Phase 7
- tests
- performance cleanup
- UI polish

### Phase Gate Protocol (mandatory)
Claude must **not** continue automatically from one phase to the next.

After finishing each phase, Claude must:
1. stop execution,
2. summarize exactly what was completed,
3. list created/modified files,
4. list any assumptions or deviations,
5. list any known issues / pending items inside the phase,
6. explicitly ask for permission before starting the next phase.

Required behavior:
- implement **one phase only per turn** unless the user explicitly says to combine phases,
- do **not** preemptively start Phase N+1 after finishing Phase N,
- wait for a clear user approval such as: "continue", "approved", "start next phase", or equivalent,
- if a phase is too large, Claude may split it into sub-steps, but it must still stay inside the same approved phase unless the user approves the next phase.

Required end-of-phase response format:
- Phase status: completed / partially completed
- Scope delivered
- Files created/updated
- Important notes
- Ready for next phase? (ask for permission)

---

## 25) Copy-Paste Prompt for Claude

Use this prompt with Claude after sharing this file:

```text
Read this blueprint as the single source of truth.
Do not redesign the architecture unless you find a blocking implementation issue.
Implement the product phase by phase, starting with Phase 1.
Use strict TypeScript, Next.js App Router, Supabase, shadcn/ui, TanStack Table, and Arabic RTL UI.
Whenever you make a deviation, explain why before changing the design.

Important workflow rule:
You must implement only one approved phase at a time.
When you finish a phase, stop completely, summarize what was completed, list files created/updated, mention assumptions or deviations, mention any pending issues, and then explicitly ask for my permission before starting the next phase.
Do not automatically move to the next phase unless I approve it.

Start with Phase 1 only: generate the database SQL, Supabase client setup, auth/tenant utilities, and the dashboard shell foundation.
```

---

## 26) Final Note

This blueprint is intentionally stricter than a casual product spec.
It is designed to reduce Claude drift, prevent hidden architecture mistakes, and keep the first real build production-minded instead of demo-minded.
