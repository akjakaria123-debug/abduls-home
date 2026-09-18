# AI Facebook Auto-Posting SaaS

AI generates, schedules, and publishes Facebook posts for small businesses
via the official Meta Graph API. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the full system design.

Currently implemented: **Phase 1** — authentication, business onboarding,
dashboard shell, and the full database schema. See the phase's setup and
testing instructions in the PR/chat history, or `docs/ARCHITECTURE.md` for
the roadmap of remaining phases.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values
# Run supabase/migrations/*.sql against your Supabase project (SQL Editor
# or `supabase db push` with the Supabase CLI), in order.
npm run dev
```

Open http://localhost:3000.
