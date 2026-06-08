# Portal XDV Taxi — Fleet & Workshop Management System

Hệ thống quản lý Xưởng Dịch vụ và Đội xe Taxi điện VinFast.

## Tech Stack

- **Backend:** NestJS, PostgreSQL, Prisma, Redis, Bull Queue
- **Frontend:** Next.js 15, TypeScript, TailwindCSS, Shadcn/UI, React Query, Zustand
- **DevOps:** Docker, Nginx, PM2, GitHub Actions

## Quick Start

### 1. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Backend chạy tại: http://localhost:3001
Swagger docs: http://localhost:3001/docs

### 3. Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

Frontend chạy tại: http://localhost:3000

## Login

```
Email: admin@xdv.vn
Password: password123
```

## Project Structure

```
portal-xdv-taxi/
├── apps/
│   ├── backend/    # NestJS API
│   └── frontend/   # Next.js UI
├── packages/
│   └── shared/     # Shared types & utils
├── docker/
└── docs/
```
