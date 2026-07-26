# EDI Intelligence Platform

AI-assisted EDI implementation platform: manage each customer transaction from specification and technical assessment through mapping, testing, production, and revisions.

The platform separates reusable company configuration from customer operations. The Interface Library defines each internal transaction once; customer requirements are parsed independently and mapped to the assigned interface version.

## Stack

- Next.js 16 · React 19 · Prisma 7 · SQLite (local) / Turso (production)
- JWT auth · Account-level ERP layout · Sample output position verification

## Local development

```bash
npm install
cp .env.example .env.local
# Set SEED_PASSWORD in .env.local, then:
npm run db:setup    # migrate + seed demo user
npm run dev         # http://localhost:3001
npm test            # unit tests
```

Demo login uses `SEED_USERNAME` / `SEED_PASSWORD` from `.env.local` (see `.env.example`).

## Account workflow

1. **Interface Library** — define versioned internal 850, 856, 810, and other transaction interfaces once
2. **Structure** — organize fields into Header, Detail, Summary, or format-specific record groups
3. **Specification analysis** — upload a guide → parse its loop/segment/element hierarchy → review structured requirements
4. **Assessment and approval** — assess interface impact and approve each transaction before implementation
5. **Implementation** — map approved requirements, validate, test, and prepare the transaction for production
6. **Go live** — deploy an approved implementation into the Live Trading Partners registry
7. **Revisions** — open future customer changes against the same live implementation and retain every version
8. **Export** — Sterling MRS Excel/CSV by transaction set (850, 856, …)

## Deploy to Vercel

SQLite files do not persist on Vercel serverless. Use **Turso** (free tier):

### 1. Create Turso database

1. Sign up at [turso.tech/app](https://turso.tech/app)
2. **Create database** → name it `edi-intelligence-platform`
3. Open the database → copy **Database URL** (`libsql://...`)
4. **Create token** → copy the auth token

### 2. Save credentials locally

Copy `env.production.template` → `.env.production.local` and fill in your Turso URL, token, and an `AUTH_SECRET`.

### 3. Migrate and seed production

```powershell
# Set SEED_PASSWORD or PROD_PASSWORD in .env.production.local first
npm run db:prod-setup
```

(Reads from `.env.production.local`, or set `$env:TURSO_*` manually.)

### 4. Push secrets to Vercel and redeploy

```powershell
npm run deploy:env
```

Or set these manually in Vercel → Project → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | libsql connection URL from Turso dashboard |
| `TURSO_AUTH_TOKEN` | Database auth token |
| `AUTH_SECRET` | Random string for session signing |

Then redeploy from the Vercel dashboard or run `vercel --prod`.

Production login uses the username/password you set when running `db:prod-setup` (`SEED_USERNAME` / `SEED_PASSWORD` or `PROD_*` env vars).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm test` | Run unit tests |
