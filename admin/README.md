<div align="center">

<img src="../logo.png" width="100" alt="Zeloh logo" />

# Zeloh — Admin Panel

### The control center for the platform: manage users, balances, content, and approve deposits & withdrawals.

<br/>

<img src="https://img.shields.io/badge/react-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
<img src="https://img.shields.io/badge/tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
<img src="https://img.shields.io/badge/role-internal%20tool-F5C518?style=for-the-badge" alt="Internal" />

<br/><br/>

<img src="https://skillicons.dev/icons?i=react,vite,tailwind,js&theme=dark" alt="Admin stack" />

</div>

<br/>

<img src="https://api.iconify.design/lucide/info.svg?color=%23F5C518" width="22" align="left" />

## Overview

A standalone React + Vite single-page app — separate from the user PWA — that operators use to run the Zeloh platform. It authenticates against the backend with an **admin JWT** and talks to the same Express API for every action. All sensitive logic (balance changes, approvals) is enforced server-side; this panel is the operator-facing UI on top of it.

```mermaid
flowchart LR
    A["Admin Panel<br/>(this app)"] -- "admin JWT" --> API["Express API"]
    A -- "reads public data" --> DB[("Supabase")]
    API -- "service-role key" --> DB
```

<br/>

<img src="https://api.iconify.design/lucide/sparkles.svg?color=%23F5C518" width="22" align="left" />

## Features

| | |
|---|---|
| <img src="https://api.iconify.design/lucide/layout-dashboard.svg?color=%23F5C518" width="18"/> **Dashboard** | Platform metrics — users, deposits, withdrawals, balances at a glance |
| <img src="https://api.iconify.design/lucide/users.svg?color=%23F5C518" width="18"/> **Users** | Search users, inspect details, adjust balances, manage wallets, delete accounts |
| <img src="https://api.iconify.design/lucide/banknote.svg?color=%23F5C518" width="18"/> **Recharges** | Review deposit requests with screenshot proof; approve or reject |
| <img src="https://api.iconify.design/lucide/arrow-down-to-line.svg?color=%23F5C518" width="18"/> **Withdrawals** | Approve or reject withdrawal requests |
| <img src="https://api.iconify.design/lucide/clapperboard.svg?color=%23F5C518" width="18"/> **Movies** | Full CRUD for movie investment products + image uploads |
| <img src="https://api.iconify.design/lucide/trending-up.svg?color=%23F5C518" width="18"/> **Investments** | Manage investment products, funding, and global timers |
| <img src="https://api.iconify.design/lucide/image.svg?color=%23F5C518" width="18"/> **Banners & News** | Manage homepage banners and news articles |
| <img src="https://api.iconify.design/lucide/megaphone.svg?color=%23F5C518" width="18"/> **Notifications & Services** | Broadcast notifications and manage support contacts |
| <img src="https://api.iconify.design/lucide/settings.svg?color=%23F5C518" width="18"/> **Settings** | Wallet addresses, Discord webhooks, popup config, admin accounts |

<br/>

<img src="https://api.iconify.design/lucide/layers.svg?color=%23F5C518" width="22" align="left" />

## Tech Stack

| Concern | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Routing | React Router 6 (protected routes via `useAdmin`) |
| Styling | Tailwind CSS 3 |
| API | `fetch` wrapper with bearer-token auth ([`src/lib/api.js`](src/lib/api.js)) |

<br/>

<img src="https://api.iconify.design/lucide/folder-tree.svg?color=%23F5C518" width="22" align="left" />

## Project Structure

```
admin/
├── src/
│   ├── pages/          # Dashboard, Users, Movies, Recharges, Withdrawals,
│   │                   # Banners, NewsAdmin, NotificationsAdmin,
│   │                   # InvestmentsAdmin, ServicesAdmin, Settings, Login
│   ├── components/      # AdminLayout, Sidebar, TopBar, DataTable, Modal,
│   │                   # ConfirmDialog, StatusBadge, ToastContainer,
│   │                   # ImagePreview, ImageUpload
│   ├── hooks/          # useAdmin (auth/session), useToast
│   ├── lib/            # api.js — authenticated fetch client
│   └── App.jsx         # Routes + RequireAuth guard
└── vite.config.js
```

<br/>

<img src="https://api.iconify.design/lucide/rocket.svg?color=%23F5C518" width="22" align="left" />

## Getting Started

```bash
cd admin
npm install
cp .env.example .env      # point VITE_API_URL at your backend
npm run dev               # dev server (default http://localhost:5174)
```

Build for production with `npm run build`; preview the build with `npm run preview`.

> The backend ([`whatsapp-server/`](../whatsapp-server/README.md)) must be running for the panel to log in and load data. The very first admin is created once via the backend's `/create-first-admin` endpoint.

<br/>

<img src="https://api.iconify.design/lucide/key-round.svg?color=%23F5C518" width="22" align="left" />

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the Zeloh backend API (e.g. `http://localhost:3001`) |

<br/>

<div align="center">
<img src="https://api.iconify.design/lucide/shield.svg?color=%23F5C518" width="20" />

**Part of the [Zeloh](../README.md) platform.**
</div>
