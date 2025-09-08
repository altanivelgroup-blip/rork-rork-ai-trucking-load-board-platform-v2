- [ ] Set CRON_SECRET in Vercel → Project → Settings → Environment Variables (Production + Preview)
- [ ] After deploy, run curl tests (added in Prompt 6)

# Ops: Production Cron Configuration

Platform: Vercel (production)

## Endpoints to expose
- POST /api/cron/archive-loads
- POST /api/cron/purge-loads?days=14

## Auth
Both endpoints must require the header:
- x-cron-secret: lrk_prod_cron_secret_6b3a2d1f4e934a9f9a2c8b07f1a6d3f2

## Environment Variable
- Key: CRON_SECRET
- Purpose: Shared secret used to authenticate cron requests

## Notes
- Configure Vercel Cron or an external scheduler to invoke the above endpoints on the desired cadence.
- Ensure all non-production triggers use the Preview environment secret in Vercel to avoid leaking production credentials.
