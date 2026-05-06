# Sentinel CRM — South African Insurance Operations Platform

A production-ready, multi-role CRM + Call Center + QA + Commission management system built for SA insurance/sales workflows.

## Stack
- **Frontend + Backend**: Next.js 14 (App Router) — single deployable
- **Database**: MongoDB (Atlas recommended)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **UI**: Tailwind CSS + shadcn/ui + recharts
- **Hosting**: Render.com (recommended) or any Node-capable VPS (Afrihost)

## Features
- 4-role RBAC (Super User · Call Agent · Field Agent · QA Auditor)
- Lead lifecycle with **SA ID Luhn validation**
- 10-disposition system with **automatic QA triggers** (Voicemail / No Answer / Sale)
- Global callback engine (super-only assignment)
- **Append-only immutable audit log** — every action recorded
- Append-only comments per lead
- Commission engine — flat per-product amount, configurable splits, leaderboard, approval workflow
- Products & Service Providers catalog
- Fitment scheduling with 24h reminders + auto-missed marking
- Real-time in-app notification bell
- User management with password reveal at create/reset
- Analytics deep-dive (recharts) — sales trend, top agents, lead aging, QA breakdown, commission status
- Search & filter (name / phone / SA ID / case# / vehicle / disposition / source / QA status / date range)

---

## Local Development

```bash
yarn install
cp .env.example .env.local       # then edit
yarn dev                          # starts on http://localhost:3000
```

First-run setup:
1. Open the app
2. Click **"Seed Demo Users"** on the login screen
3. Login with `admin@sentinel.co.za` / `admin123`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string (`mongodb://...` or `mongodb+srv://...`) |
| `DB_NAME` | ✅ | Database name (e.g. `sentinel_crm`) |
| `JWT_SECRET` | ✅ | Strong random string (32+ chars) used to sign auth tokens |
| `CRON_TOKEN` | ✅ | Secret token required to call `POST /api/cron` (used by Render Cron) |
| `WHATSAPP_PROVIDER` | optional | `none` (default), `twilio`, or `meta`. Until configured, all outbound WhatsApp messages stay queued and viewable in Help Desk → WhatsApp Queue. |
| `WHATSAPP_TWILIO_SID` / `WHATSAPP_TWILIO_TOKEN` / `WHATSAPP_TWILIO_FROM` | optional | Twilio creds (when `WHATSAPP_PROVIDER=twilio`) |
| `WHATSAPP_META_TOKEN` / `WHATSAPP_META_PHONE_ID` | optional | Meta WhatsApp Business creds (when `WHATSAPP_PROVIDER=meta`) |
| `SUPERVISOR_WHATSAPP` | optional | Phone number (E.164 format, e.g. +27821234567) that receives helpdesk alerts when a ticket is opened |
| `NEXT_PUBLIC_BASE_URL` | optional | Public URL of the app (auto-detected on Render) |

Generate a secret with: `openssl rand -hex 32`

---

## Deployment Option 1 — Render.com (recommended)

### A) Provision MongoDB (Atlas free tier)
1. https://www.mongodb.com/cloud/atlas → create free M0 cluster
2. **Network Access** → add `0.0.0.0/0` (or Render's egress IP)
3. **Database Access** → create user; copy connection string

### B) Deploy to Render
1. Push this repo to GitHub.
2. https://dashboard.render.com → **New +** → **Blueprint** → connect repo
3. Render auto-detects `render.yaml` and creates:
   - **Web Service** (Next.js)
   - **Cron Job** (runs every 15 minutes for fitment reminders + missed marking)
4. Set the env vars in the dashboard:
   - `MONGO_URL` = your Atlas connection string
   - `DB_NAME` = `sentinel_crm`
   - `JWT_SECRET` = strong random string
   - `CRON_TOKEN` = strong random string (must match cron job's value)
5. Click **Apply**. First deploy takes ≈4 minutes.

### C) Post-deploy
1. Visit your `*.onrender.com` URL
2. Click **Seed Demo Users** → sign in as admin
3. Create your real super user via **Users** tab
4. **Deactivate the demo `admin@sentinel.co.za`** account from Users tab

---

## Deployment Option 2 — Afrihost VPS (or any VPS)

### A) Provision
- Ubuntu 22.04 LTS, 1GB RAM minimum (2GB recommended)
- Install Docker: `curl -fsSL https://get.docker.com | sh`
- Install Docker Compose plugin

### B) Setup
```bash
git clone <your-repo> /opt/sentinel
cd /opt/sentinel
cp .env.example .env
nano .env                            # fill in real values
docker compose up -d
```

### C) Reverse-proxy with HTTPS (caddy / nginx)
Example Caddyfile:
```
crm.example.co.za {
  reverse_proxy localhost:3000
}
```

### D) Cron job for fitment reminders
Add to crontab (`crontab -e`):
```
*/15 * * * * curl -s -X POST https://crm.example.co.za/api/cron -H "x-cron-token: YOUR_CRON_TOKEN" >> /var/log/sentinel-cron.log 2>&1
```

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Super User | `admin@ufsbrokers.co.za` | `admin123` |
| Call Agent | `agent@ufsbrokers.co.za` | `agent123` |
| Field Agent | `field@ufsbrokers.co.za` | `field123` |
| QA Auditor | `qa@ufsbrokers.co.za` | `qa123` |

**Rotate these immediately in production.**

---

## API Surface (selected)

All routes under `/api`. JWT bearer auth required except `/health`, `/auth/seed`, `/auth/login`, `/validate/sa-id`, `/cron`.

```
POST   /api/auth/login
POST   /api/auth/seed                      (idempotent)
POST   /api/validate/sa-id                 (Luhn check)
GET    /api/leads?q=&disposition=&source=&qaStatus=&from=&to=
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
POST   /api/leads/:id/comments
POST   /api/leads/:id/assign               (super)
POST   /api/leads/:id/callback
POST   /api/leads/:id/fitment
GET    /api/leads/:id/audit
GET    /api/callbacks
POST   /api/callbacks/:id/assign           (super)
GET    /api/fitments
PATCH  /api/fitments/:id
GET    /api/qa/queue                       (qa, super)
PATCH  /api/qa/:leadId
GET    /api/products
POST   /api/products                       (super)
PATCH  /api/products/:id                   (super)
GET    /api/providers
POST   /api/providers                      (super)
GET    /api/commissions
GET    /api/commissions/leaderboard
POST   /api/commissions/:id/approve        (super)
POST   /api/commissions/:id/reject         (super)
GET    /api/users                          (super)
POST   /api/users                          (super) → returns plaintextPassword
PATCH  /api/users/:id                      (super)
POST   /api/users/:id/reset-password       (super) → returns plaintextPassword
GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
GET    /api/audit                          (super)
GET    /api/dashboard
GET    /api/analytics                      (super)
POST   /api/cron                           (header x-cron-token: <CRON_TOKEN>)
```

---

## License
Proprietary — internal use.
