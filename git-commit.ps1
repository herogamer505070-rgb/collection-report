Set-Location "C:\github\2026\collection 2026"

# Stage everything (node_modules and .next are gitignored)
git add -A

# Show what's staged
Write-Host "=== Staged files ===" -ForegroundColor Cyan
git status --short

# Commit
git commit -m "feat: complete Phase 1-4 multi-tenant collections app

- Phase 1: Next.js 15 scaffold, Supabase auth, tenant context, DB schema (10 tables + RLS), dashboard shell
- Phase 2: WhatsApp settings page, AES-256-GCM token encryption, Meta API verification
- Phase 3: Excel/CSV upload, mapping assistant, import pipeline with chunked upserts and cancellation
- Phase 4: KPI dashboard, Recharts charts, TanStack Table cases view, audit log, team management

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

Write-Host ""
Write-Host "=== Commit result ===" -ForegroundColor Cyan
git log --oneline -3
