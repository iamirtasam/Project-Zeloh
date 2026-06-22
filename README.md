<div align="center">

<img src="logo.png" width="110" alt="Zeloh logo" />

# Zeloh

### A movie-investment & rewards platform — deposit, invest in movie "tickets", earn daily ROI, and build a referral network.

<br/>

<img src="https://img.shields.io/badge/license-MIT-F5C518?style=for-the-badge" alt="MIT License" />
<img src="https://img.shields.io/badge/status-production%20ready-2ea44f?style=for-the-badge" alt="Status" />
<img src="https://img.shields.io/badge/built%20with-AI%20%C2%B7%20vibecoded-7c3aed?style=for-the-badge" alt="Vibecoded" />
<img src="https://img.shields.io/badge/delivered%20in-4%20days-ef4444?style=for-the-badge" alt="4 days" />

<br/><br/>

<img src="https://skillicons.dev/icons?i=react,vite,tailwind,nodejs,express,supabase,postgres,redis,aws,cloudflare&theme=dark" alt="Tech stack" />

</div>

<br/>

<img src="https://api.iconify.design/lucide/info.svg?color=%23F5C518" width="22" align="left" />

## About

**Zeloh** is a full-stack, mobile-first "earn" platform built around a movie-investment theme. Users deposit USDT, purchase movie *tickets* that mature into principal + profit on a daily cycle, complete gamified tasks for vouchers, and earn multi-level commissions from their referral team. A separate admin panel manages content, users, deposits, and withdrawals, while a hardened Node backend handles every money-moving operation atomically.

The codebase ships with **bank-grade security hardening** (atomic balance RPCs, per-user Redis locks, JWT revocation, timing-safe auth, strict rate limiting) and a **time-compression test mode** that lets the full deposit → invest → payout lifecycle be tested in minutes.

<br/>

<img src="https://api.iconify.design/lucide/triangle-alert.svg?color=%23F5C518" width="22" align="left" />

## Project Context

> This was a **paid freelance project built for a client**.
>
> It was **completely "vibecoded"** — designed, architected, and implemented end-to-end using a mix of different AI coding tools — and delivered in **just 4 days**. It's published here as a portfolio piece to showcase shipping a complete, production-grade, security-hardened full-stack product on a tight timeline.

<br/>

<img src="https://api.iconify.design/lucide/sparkles.svg?color=%23F5C518" width="22" align="left" />

## Features

| | |
|---|---|
| <img src="https://api.iconify.design/lucide/smartphone.svg?color=%23F5C518" width="18"/> **Mobile-first PWA** | React + Vite single-page app with a native-app feel and bottom navigation |
| <img src="https://api.iconify.design/lucide/shield-check.svg?color=%23F5C518" width="18"/> **Dual OTP auth** | Sign-up/login verified via **WhatsApp** (`whatsapp-web.js`) or **Email** (Resend) |
| <img src="https://api.iconify.design/lucide/ticket.svg?color=%23F5C518" width="18"/> **Movie ticket investing** | Buy tickets with balance or vouchers; auto-payout of principal + profit on maturity |
| <img src="https://api.iconify.design/lucide/trending-up.svg?color=%23F5C518" width="18"/> **Product investments** | Longer-term products with configurable ROI %, duration, and global timers |
| <img src="https://api.iconify.design/lucide/users.svg?color=%23F5C518" width="18"/> **Multi-level referrals** | Referral team earnings, masked downline reporting, cascading VIP levels |
| <img src="https://api.iconify.design/lucide/crown.svg?color=%23F5C518" width="18"/> **VIP membership tiers** | Auto-computed from deposits + qualified referrals; unlock higher daily limits & profit % |
| <img src="https://api.iconify.design/lucide/gift.svg?color=%23F5C518" width="18"/> **Daily tasks & vouchers** | Gamified task progress that awards vouchers usable for ticket purchases |
| <img src="https://api.iconify.design/lucide/wallet.svg?color=%23F5C518" width="18"/> **Deposits & withdrawals** | Crypto recharge with screenshot proof + admin-approved withdrawals with funding password |
| <img src="https://api.iconify.design/lucide/layout-dashboard.svg?color=%23F5C518" width="18"/> **Admin dashboard** | Full CRUD for movies, banners, news, users, balances, and approvals |
| <img src="https://api.iconify.design/lucide/bell.svg?color=%23F5C518" width="18"/> **Discord alerts** | Real-time webhook notifications for registrations, deposits, and withdrawals |

<br/>

<img src="https://api.iconify.design/lucide/layers.svg?color=%23F5C518" width="22" align="left" />

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend (User + Admin)** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Recharts, React Markdown |
| **Backend API** | Node.js, Express, Helmet, express-rate-limit |
| **Database** | Supabase (PostgreSQL) with `SECURITY DEFINER` RPCs |
| **Auth** | JWT (HS256) + bcrypt, token-version revocation |
| **Cache / Locks** | Redis (`ioredis`) — OTP store, rate limits, per-user locks |
| **Messaging** | WhatsApp (`whatsapp-web.js`) + Email (Resend) |
| **Storage / CDN** | Cloudflare R2 (S3-compatible) + AWS S3 |
| **Jobs** | `node-cron` scheduled payouts & cleanup |

<br/>

<img src="https://api.iconify.design/lucide/network.svg?color=%23F5C518" width="22" align="left" />

## Architecture

```mermaid
flowchart TD
    U["User PWA<br/>(src/)"] -- "reads (anon key)" --> DB[("Supabase<br/>PostgreSQL")]
    A["Admin Panel<br/>(admin/)"] -- "reads (anon key)" --> DB
    U -- "writes (user JWT)" --> API
    A -- "writes (admin JWT)" --> API
    API["Express API<br/>(whatsapp-server/)"] -- "service-role key" --> DB
    API --> R[("Redis<br/>OTP · locks · limits")]
    API --> WA["WhatsApp OTP"]
    API --> EM["Email OTP (Resend)"]
    API --> CDN["Cloudflare R2 / AWS S3"]
    API --> CRON["node-cron<br/>payouts · cleanup"]
    API --> DISC["Discord webhooks"]
```

**Key principle:** the frontends read public data directly from Supabase, but **every state-changing or money operation is routed through the Express API**, which holds the Supabase service-role key and performs all validation, atomic balance mutations, and rate limiting.

<br/>

<img src="https://api.iconify.design/lucide/folder-tree.svg?color=%23F5C518" width="22" align="left" />

## Project Structure

```
.
├── src/                    # User-facing PWA (React + Vite)
│   ├── screens/            # Route screens (Home, Movies, Invest, Recharge, Withdraw, …)
│   ├── components/         # Shared UI (BottomNav, Toast, ErrorBoundary)
│   ├── hooks/              # useAuth, useStatusBarColor
│   └── lib/                # Supabase client, invite helpers
├── admin/                  # Admin dashboard (separate React + Vite app)
│   └── src/
│       ├── pages/          # Dashboard, Users, Recharges, Withdrawals, Movies, …
│       ├── components/     # DataTable, Modal, Sidebar, ImageUpload, …
│       └── lib/            # API client
├── whatsapp-server/        # Express backend — the core of the platform
│   └── server.js           # Auth, OTP, money ops, cron jobs, uploads (~3.3k LOC)
├── supabase-schema.sql     # Full PostgreSQL data model (reference)
├── security-migration.sql  # Hardening RPCs + indexes (idempotent)
└── DEPLOYMENT.md           # End-to-end deployment guide (AWS + EC2)
```

<br/>

<img src="https://api.iconify.design/lucide/rocket.svg?color=%23F5C518" width="22" align="left" />

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (run `supabase-schema.sql` then `security-migration.sql`)
- A Redis instance (local or hosted)

### 1. Backend API

```bash
cd whatsapp-server
npm install
cp .env.example .env      # then fill in your values
npm start                 # first run prints a WhatsApp QR code to scan once
```

### 2. User app

```bash
npm install
cp .env.example .env      # set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```

### 3. Admin panel

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

<br/>

<img src="https://api.iconify.design/lucide/key-round.svg?color=%23F5C518" width="22" align="left" />

## Environment Variables

**Frontend (`.env`)**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_API_URL` | Base URL of the Express backend |

**Backend (`whatsapp-server/.env`)**

| Variable | Description |
|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Supabase URL + **service-role** key |
| `JWT_SECRET` | 64-byte random secret for signing JWTs |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection |
| `RESEND_API_KEY` / `RESEND_FROM` | Email OTP sender |
| `R2_*` / `AWS_*` | Cloudflare R2 + AWS S3 storage credentials |
| `TEST_MODE` / `TEST_MODE_MINUTES` | Time-compression test mode (1 day = N minutes) |

> See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the complete production deployment walkthrough.

<br/>

<img src="https://api.iconify.design/lucide/shield-check.svg?color=%23F5C518" width="22" align="left" />

## Security Highlights

- **Atomic balance ops** — a `deduct_balance` Postgres RPC with row locks prevents race-condition exploits.
- **Per-user Redis locks** serialize concurrent money operations (`withUserLock`).
- **JWT revocation** via a `token_version` claim — password reset or logout invalidates all old tokens.
- **HS256 pinned** on sign + verify to defeat algorithm-confusion attacks.
- **Timing-safe** OTP comparison and constant-time login to prevent user enumeration.
- **Strict rate limiting** on every auth, OTP, recharge, and withdrawal route.
- **Hardened uploads** — MIME allowlist, size caps, extension derived from content (never the filename).
- **Helmet CSP**, strict CORS allowlist, and a 10 KB body cap.

<br/>

<img src="https://api.iconify.design/lucide/clock.svg?color=%23F5C518" width="22" align="left" />

## Scheduled Jobs (`node-cron`)

| Job | Schedule | Purpose |
|---|---|---|
| Ticket payouts | 12:00 AM PKT | Credit matured tickets + referral commissions |
| Investment payouts | Hourly | Credit daily ROI, complete finished investments |
| Movie shuffle | With payouts | Rotate featured movie sections |
| Task cleanup | Daily | Purge task-progress rows older than 30 days |

<br/>

<img src="https://api.iconify.design/lucide/scale.svg?color=%23F5C518" width="22" align="left" />

## License

Released under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<br/>

<div align="center">

<img src="https://api.iconify.design/lucide/code.svg?color=%23F5C518" width="20" />

**Designed & built in 4 days · vibecoded with AI · delivered for a client.**

</div>
