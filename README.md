# EDI Intelligence Platform

AI-assisted EDI implementation workspace: upload customer specs, run analysis, export Sterling MRS mappings with Oracle positional columns (Interface Column, Record Number, Start Column, Width).

## Stack

- Next.js 16 · React 19 · Prisma 7 · SQLite (local) / Turso (production)
- JWT auth · Account-level ERP layout · Sample output position verification

## Local development

```bash
npm install
cp .env.example .env.local
npm run db:setup    # migrate + seed demo user
npm run dev         # http://localhost:3001
```

Demo login (after seed): see `prisma/seed.ts`.

## Account workflow

1. **Account → ERP layout** — upload positional layout once (Oracle, SAP IDoc, JDE, etc.)
2. **Sample ERP output** — upload a flat sample file to verify Rec/Start/Width (not used for EDI mapping)
3. **Workspace** — upload customer specs → **Run AI analysis**
4. **Export** — Sterling MRS Excel/CSV by transaction set (850, 856, …)

## Deploy to Vercel

SQLite files do not persist on Vercel serverless. Use **Turso** (free tier):

1. Create a database at [turso.tech](https://turso.tech)
2. Apply migrations: `turso db shell <db-name> < prisma/migrations/...` or use Turso CLI with `DATABASE_URL` pointed at Turso for `prisma migrate deploy`
3. In Vercel project settings, set environment variables:
   - `TURSO_DATABASE_URL` — libsql connection URL
   - `TURSO_AUTH_TOKEN` — Turso auth token
   - `JWT_SECRET` — random secret string
4. Connect the GitHub repo and deploy (build runs `prisma migrate deploy` automatically)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
