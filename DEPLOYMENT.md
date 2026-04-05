# Deployment — Railway

This app deploys to Railway as three services in a single project:

- **Postgres** (managed plugin)
- **api** (NestJS, Dockerized) — `apps/api/Dockerfile`
- **web** (Nuxt SPA served via Nitro) — `apps/web/Dockerfile`

Migrations run automatically on each API deploy via `prisma migrate deploy`.

---

## First-time setup

### 1. Create Railway project

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → select this repo.
2. Don't let Railway auto-deploy yet; we'll configure services first.

### 2. Add Postgres plugin

1. In the project, **+ New** → **Database** → **Postgres**.
2. Railway provisions it and exposes `DATABASE_URL` as a service variable.

### 3. Create the `api` service

1. **+ New** → **GitHub Repo** → select the repo again.
2. Service settings:
   - **Name**: `api`
   - **Root Directory**: leave empty (uses repo root — required for monorepo Dockerfile to access `packages/shared`).
   - **Config Path**: `apps/api/railway.toml`
3. Add environment variables (see below). `DATABASE_URL` uses a reference: `${{Postgres.DATABASE_URL}}`.
4. Deploy. First deploy runs all migrations.
5. Copy the generated public URL (e.g. `https://api-production-xxxx.up.railway.app`).

### 4. Create the `web` service

1. **+ New** → **GitHub Repo** → same repo.
2. Service settings:
   - **Name**: `web`
   - **Root Directory**: empty
   - **Config Path**: `apps/web/railway.toml`
3. Add env vars (see below) — `NUXT_PUBLIC_API_BASE_URL` points to the API URL from step 3 + `/api`.
4. Deploy.
5. Copy the generated web URL.

### 5. Wire up CORS

Go back to the `api` service and set `CORS_ORIGIN` + `FRONTEND_URL` to the web service URL from step 4, then redeploy.

### 6. Seed the database (one-time)

```sh
railway link                                        # link local repo to project
railway run --service api pnpm --filter @workout/api prisma:seed
```

---

## Environment variables

### `api` service

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `CORS_ORIGIN` | `https://<web>.up.railway.app` |
| `FRONTEND_URL` | `https://<web>.up.railway.app` |
| `RESEND_API_KEY` | from resend.com |
| `MAIL_FROM` | e.g. `noreply@yourdomain.com` |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console (optional) |
| `APPLE_CLIENT_ID` | from Apple Developer (optional) |
| `CLOUDINARY_CLOUD_NAME` | optional — avatar uploads |
| `CLOUDINARY_API_KEY` | optional |
| `CLOUDINARY_API_SECRET` | optional |

### `web` service

| Variable | Value |
|---|---|
| `NUXT_PUBLIC_API_BASE_URL` | `https://<api>.up.railway.app/api` |
| `NUXT_PUBLIC_GOOGLE_CLIENT_ID` | same as API `GOOGLE_CLIENT_ID` (optional) |
| `NUXT_PUBLIC_APPLE_CLIENT_ID` | optional |

`PORT` is set automatically by Railway.

---

## Google OAuth setup

1. Google Cloud Console → **Credentials** → **Create Credentials** → **OAuth Client ID** → **Web application**.
2. **Authorized JavaScript origins**: `https://<web>.up.railway.app`
3. **Authorized redirect URIs**: `https://<web>.up.railway.app` (the app uses Google Identity Services / One Tap, which validates the ID token on the backend; no redirect URI is strictly required for that flow, but adding the origin is).
4. Copy the Client ID into both `GOOGLE_CLIENT_ID` (api) and `NUXT_PUBLIC_GOOGLE_CLIENT_ID` (web).

---

## Day-to-day

- **Deploys**: push to `main`, Railway auto-deploys both services.
- **View logs**: Railway dashboard → service → **Deployments** → click a deployment.
- **Rollback**: Railway dashboard → service → **Deployments** → previous deployment → **Redeploy**.
- **Run one-off commands** (e.g., reseed): `railway run --service api <command>`.
- **Open DB shell**: `railway connect Postgres`.

---

## Custom domain (later)

Railway dashboard → service → **Settings** → **Domains** → **Add Custom Domain**. Point your DNS CNAME at the Railway-provided target. Update `CORS_ORIGIN`, `FRONTEND_URL`, `NUXT_PUBLIC_API_BASE_URL`, and the Google OAuth authorized origins after the domain is live.

---

## Local Docker smoke test

```sh
# API
docker build -f apps/api/Dockerfile -t workout-api .
docker run --rm -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://workout:workout_dev@host.docker.internal:5432/workout_app \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e FRONTEND_URL=http://localhost:3000 \
  -e RESEND_API_KEY=re_test \
  -e MAIL_FROM=test@example.com \
  workout-api

curl http://localhost:3001/health
# → {"status":"ok","database":"connected"}

# Web
docker build -f apps/web/Dockerfile -t workout-web .
docker run --rm -p 3000:3000 \
  -e NUXT_PUBLIC_API_BASE_URL=http://localhost:3001/api \
  workout-web
```
