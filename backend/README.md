# NEXUS CRM Backend

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=postgresql://nexus:nexus_secret_2026@localhost:5432/nexus_crm?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_too
PORT=3001
```

## Commands

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET  | /api/auth/me | Profile |
| GET  | /api/leads | List leads |
| POST | /api/leads/import | Import CSV/XLSX |
| GET  | /api/campaigns | List campaigns |
| POST | /api/campaigns/:id/start | Start dispatch |
| GET  | /api/dashboard/stats | Dashboard stats |
| GET  | /api/reports/export | Export CSV/XLSX |
