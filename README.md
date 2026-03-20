# ⚡ snip.ly — URL Shortener with Analytics

A full-stack URL shortener with real-time click analytics, password-protected links, and an admin panel. Built with Node/Express, PostgreSQL, Redis, and React.

## Features

- **Link shortening** — generate a 6-char nanoid slug or set a custom one
- **Password-protected links** — lock any link behind a password gate
- **Instant redirects** — DB-first lookup with Redis cache warming keeps redirects fast
- **Async click capture** — analytics never block the redirect path
- **Per-click analytics** — country (via geoip-lite), browser/OS/device (via ua-parser-js), referrer
- **Dashboard** — clicks over time, device split, top referrers, top country
- **JWT auth** — users only see and manage their own links
- **Admin panel** — platform-wide stats, manage all users and links, promote/demote roles
- **Rate limiting** — 30 req/15min on shorten, 10 req/15min on auth

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, Express |
| Database | PostgreSQL + Prisma ORM (v7) |
| Cache | Redis (ioredis) |
| Auth | JWT + bcryptjs |
| Analytics | geoip-lite, ua-parser-js |
| Frontend | React + Vite |
| Charts | Chart.js + react-chartjs-2 |

## Project Structure

```
url-shortener/
├── server/
│   ├── src/
│   │   ├── routes/         # shorten.js, redirect.js, analytics.js, auth.js, admin.js
│   │   ├── services/       # redis.js, geo.js, clickWorker.js
│   │   ├── db/             # schema.sql, client.js
│   │   └── middleware/     # auth.js, rateLimiter.js, errorHandler.js, requireAdmin.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── prisma.config.ts
├── client/
│   └── src/
│       ├── pages/          # Dashboard.jsx, LinkDetail.jsx, Login.jsx, PasswordGate.jsx, Admin.jsx
│       ├── components/     # LinkForm.jsx, StatsChart.jsx, LinkTable.jsx, Navbar.jsx
│       ├── hooks/          # useLinks.js, useAuth.js, useDashboard.js
│       └── lib/            # api.js, utils.js
└── .github/workflows/ci.yml
```

## Getting Started

**Prerequisites:** Node 18+, PostgreSQL, Redis

```bash
# 1. Clone
git clone https://github.com/didulabhanuka/snip.ly---URL-Shortener-with-Analytics
cd snip.ly---URL-Shortener-with-Analytics

# 2. Server
cd server
cp .env.example .env        # fill in values below
npm install
npx prisma db push
npx prisma generate
npm run dev

# 3. Client (new terminal)
cd client
cp .env.example .env        # set VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

## Environment Variables

### server/.env

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/urlshortener
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_change_this
BASE_URL=http://localhost:3000
CLIENT_ORIGIN=http://localhost:5173
```

### client/.env

```env
VITE_API_URL=http://localhost:3000
```

## Admin Setup

After registering your account, promote it to admin via SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then log out and back in — the `🔑 Admin` link will appear in the navbar.

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |

### Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shorten` | Create short link (optional password) |
| GET | `/api/shorten` | List user's links |
| DELETE | `/api/shorten/:id` | Delete a link |
| GET | `/:slug` | Redirect + capture click |
| POST | `/api/verify/:slug` | Verify password for protected link |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Dashboard summary |
| GET | `/api/analytics/:urlId` | Per-link breakdown |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform-wide stats |
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete a user |
| PATCH | `/api/admin/users/:id/role` | Promote / demote user |
| GET | `/api/admin/links` | List all links |
| DELETE | `/api/admin/links/:id` | Delete any link |

## How the Redirect Works

```
GET /:slug
    │
    ▼
DB lookup — check passwordHash
    │
    ├── protected ──▶ redirect to /p/:slug (password gate)
    │
    └── public ──▶ check Redis cache ──hit──▶ 302 redirect
                        │                           │
                       miss                      async
                        │                           ▼
                        ▼                     capture click
                   warm cache                (geo + UA + referrer)
                        │
                        ▼
                   302 redirect
```

The async click capture never blocks the redirect. Protected links always hit the DB first so the password hash check cannot be bypassed via the cache.

## Running Tests

```bash
cd server
npm test
```

## License

MIT
