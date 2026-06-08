# Fleet & Workshop Management System — Design Spec

## Tổng quan

Hệ thống Web Portal Enterprise cho doanh nghiệp vận hành Taxi điện và Xưởng Dịch vụ bảo dưỡng xe điện VinFast.

- **Kiến trúc:** Modular Monolith
- **Quy mô:** 1000+ xe, 100+ users, multi-branch (1 công ty, nhiều chi nhánh)
- **Xe có thể điều chuyển** giữa chi nhánh (lưu lịch sử)
- **Real-time:** Notifications only (in-app push), data refresh bình thường
- **Tích hợp:** Thiết kế interface sẵn, chưa build (GPS, ERP, SSO/AD)

---

## Công nghệ

### Backend
- Node.js 22+, NestJS, PostgreSQL 16, Prisma ORM
- JWT Authentication, RBAC Permission
- Redis Cache, Bull Queue, Swagger API

### Frontend
- Next.js 15, TypeScript, TailwindCSS, Shadcn/UI
- Tanstack Table, Recharts, React Query, Zustand

### DevOps
- Docker, Docker Compose, Nginx, PM2, GitHub Actions CI/CD

---

## Kiến trúc hệ thống

### Project Structure

```
portal-xdv-taxi/
├── apps/
│   ├── backend/                    # NestJS Modular Monolith
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── branches/
│   │   │   │   ├── vehicles/
│   │   │   │   ├── workshop/
│   │   │   │   │   ├── jobs/
│   │   │   │   │   ├── repair-orders/
│   │   │   │   │   ├── parts/
│   │   │   │   │   ├── technicians/
│   │   │   │   │   └── transfers/
│   │   │   │   ├── fleet/
│   │   │   │   │   ├── management/
│   │   │   │   │   ├── costs/
│   │   │   │   │   └── incidents/
│   │   │   │   ├── maintenance/
│   │   │   │   ├── notifications/
│   │   │   │   ├── audit/
│   │   │   │   └── files/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   └── events/
│   │   ├── prisma/
│   │   └── test/
│   │
│   └── frontend/                   # Next.js 15
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── workshop/
│       │   │   │   ├── fleet/
│       │   │   │   ├── vehicles/
│       │   │   │   ├── maintenance/
│       │   │   │   └── settings/
│       │   │   └── api/
│       │   ├── components/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── stores/
│       │   └── types/
│       └── public/
│
├── packages/
│   └── shared/
├── docker/
└── docs/
```

### Module Communication

- Modules giao tiếp qua NestJS EventEmitter (internal events)
- Ví dụ: Workshop hoàn thành sửa xe → emit `vehicle.repaired` → Fleet module cập nhật trạng thái
- Mỗi module expose public API qua service class — không import trực tiếp repository của module khác
- Shared data (vehicles, branches) nằm ở module riêng

---

## Database Schema

### Auth & RBAC

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  phone         String?
  passwordHash  String
  fullName      String
  avatar        String?
  role          Role     @relation(fields: [roleId], references: [id])
  roleId        String
  branch        Branch?  @relation(fields: [branchId], references: [id])
  branchId      String?
  isActive      Boolean  @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Role {
  id          String       @id @default(uuid())
  code        String       @unique
  name        String
  description String?
  permissions Permission[]
  users       User[]
}

model Permission {
  id       String @id @default(uuid())
  resource String
  action   String
  roles    Role[]
}
```

### Organization

```prisma
model Branch {
  id        String   @id @default(uuid())
  name      String
  code      String   @unique
  address   String?
  phone     String?
  managerId String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

### Vehicle & ODO

```prisma
model Vehicle {
  id              String        @id @default(uuid())
  licensePlate    String        @unique
  vin             String        @unique
  modelId         String
  yearMfg         Int
  registeredAt    DateTime?
  currentOdo      Int           @default(0)
  status          VehicleStatus @default(ACTIVE)
  branchId        String
  driverId        String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum VehicleStatus {
  ACTIVE
  RESTING
  IN_WORKSHOP
  ACCIDENT
  DECOMMISSIONED
}

model VehicleModel {
  id    String @id @default(uuid())
  name  String
  brand String @default("VinFast")
  type  String
}

model VehicleOdoLog {
  id          String   @id @default(uuid())
  vehicleId   String
  odo         Int
  previousOdo Int
  delta       Int
  recordedAt  DateTime @default(now())
  source      String?
  userId      String
}

model VehicleTransfer {
  id           String   @id @default(uuid())
  vehicleId    String
  fromBranchId String
  toBranchId   String
  reason       String?
  approvedById String
  transferredAt DateTime @default(now())
}
```

### Workshop

```prisma
model WorkshopJob {
  id            String            @id @default(uuid())
  code          String            @unique
  vehicleId     String
  branchId      String
  odoAtEntry    Int
  status        WorkshopJobStatus @default(RECEIVED)
  entryReason   String
  diagnosis     String?
  advisorId     String
  technicianId  String?
  isWarranty    Boolean           @default(false)
  estimatedCost Decimal?          @db.Decimal(15, 2)
  actualCost    Decimal?          @db.Decimal(15, 2)
  receivedAt    DateTime          @default(now())
  completedAt   DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

enum WorkshopJobStatus {
  RECEIVED
  DIAGNOSING
  QUOTED
  APPROVED
  WAITING_PARTS
  IN_PROGRESS
  QUALITY_CHECK
  COMPLETED
  DELIVERED
}

model WorkshopJobStatusLog {
  id        String   @id @default(uuid())
  jobId     String
  fromStatus String
  toStatus  String
  note      String?
  changedBy String
  createdAt DateTime @default(now())
}

model RepairOrder {
  id          String   @id @default(uuid())
  code        String   @unique
  jobId       String
  odo         Int
  description String
  laborCost   Decimal  @db.Decimal(15, 2) @default(0)
  partsCost   Decimal  @db.Decimal(15, 2) @default(0)
  totalCost   Decimal  @db.Decimal(15, 2) @default(0)
  status      ROStatus @default(OPEN)
  openedAt    DateTime @default(now())
  closedAt    DateTime?
  createdById String
}

enum ROStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model RepairOrderItem {
  id          String     @id @default(uuid())
  roId        String
  type        ROItemType
  description String
  partId      String?
  quantity    Int        @default(1)
  unitPrice   Decimal    @db.Decimal(15, 2)
  totalPrice  Decimal    @db.Decimal(15, 2)
}

enum ROItemType {
  LABOR
  PART
}

model Technician {
  id          String @id @default(uuid())
  userId      String @unique
  title       String
  skillLevel  Int
  specialty   String?
  branchId    String
  isActive    Boolean @default(true)
}
```

### Parts & Inventory

```prisma
model Part {
  id         String  @id @default(uuid())
  code       String  @unique
  name       String
  categoryId String
  unit       String  @default("cái")
  stockQty   Int     @default(0)
  minStock   Int     @default(0)
  costPrice  Decimal @db.Decimal(15, 2)
  sellPrice  Decimal @db.Decimal(15, 2)
  supplier   String?
  branchId   String
  isActive   Boolean @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model PartCategory {
  id   String @id @default(uuid())
  name String
  code String @unique
}

model PartTransaction {
  id        String              @id @default(uuid())
  partId    String
  type      PartTransactionType
  quantity  Int
  reference String?
  note      String?
  userId    String
  createdAt DateTime            @default(now())
}

enum PartTransactionType {
  IMPORT
  EXPORT
  TRANSFER_IN
  TRANSFER_OUT
  RETURN
  ADJUST
}

model PartTransfer {
  id            String   @id @default(uuid())
  partId        String
  fromVehicleId String
  toVehicleId   String
  quantity      Int      @default(1)
  reason        String
  approvedById  String
  createdAt     DateTime @default(now())
}
```

### Maintenance

```prisma
model MaintenancePlan {
  id          String   @id @default(uuid())
  name        String
  intervalKm  Int
  description String?
  tasks       String[]
  isActive    Boolean  @default(true)
}

model MaintenanceRecord {
  id           String            @id @default(uuid())
  vehicleId    String
  planId       String
  odoAtService Int
  nextDueOdo   Int
  status       MaintenanceStatus @default(UPCOMING)
  serviceDate  DateTime?
  cost         Decimal?          @db.Decimal(15, 2)
  note         String?
  createdAt    DateTime          @default(now())
}

enum MaintenanceStatus {
  UPCOMING
  DUE_SOON
  OVERDUE
  COMPLETED
}
```

### Fleet

```prisma
model FleetCost {
  id          String       @id @default(uuid())
  vehicleId   String
  category    CostCategory
  amount      Decimal      @db.Decimal(15, 2)
  description String?
  invoiceNo   String?
  costDate    DateTime
  userId      String
  createdAt   DateTime     @default(now())
}

enum CostCategory {
  ELECTRICITY
  TIRE
  BRAKE
  INSURANCE
  MAINTENANCE
  REPAIR
  ACCIDENT
  OTHER
}

model FleetIncident {
  id          String           @id @default(uuid())
  code        String           @unique
  vehicleId   String
  reporterId  String
  description String
  status      IncidentStatus   @default(NEW)
  priority    IncidentPriority @default(MEDIUM)
  resolvedAt  DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

enum IncidentStatus {
  NEW
  ACKNOWLEDGED
  IN_PROGRESS
  RESOLVED
}

enum IncidentPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### Notifications & Audit

```prisma
model Notification {
  id        String             @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  data      Json?
  channels  NotificationChannel[]
  isRead    Boolean            @default(false)
  readAt    DateTime?
  createdAt DateTime           @default(now())
}

enum NotificationType {
  MAINTENANCE_DUE
  MAINTENANCE_OVERDUE
  VEHICLE_IN_WORKSHOP_LONG
  PARTS_LOW_STOCK
  INCIDENT_NEW
  WORKSHOP_STATUS_CHANGED
  VEHICLE_TRANSFERRED
}

enum NotificationChannel {
  IN_APP
  EMAIL
  TELEGRAM
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String
  resource   String
  resourceId String
  oldData    Json?
  newData    Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
}

model File {
  id           String   @id @default(uuid())
  filename     String
  originalName String
  mimeType     String
  size         Int
  path         String
  userId       String
  createdAt    DateTime @default(now())
}

model ActivityLog {
  id        String   @id @default(uuid())
  userId    String
  action    String
  details   String?
  createdAt DateTime @default(now())
}
```

### Indexes

- Vehicle: `(branchId, status)`
- WorkshopJob: `(branchId, status)`, `(vehicleId)`
- VehicleOdoLog: `(vehicleId, recordedAt)`
- PartTransaction: `(partId, createdAt)`
- Notification: `(userId, isRead, createdAt)`
- AuditLog: `(resource, resourceId)`, `(userId, createdAt)`

---

## API Endpoints

### Auth
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Vehicles (shared)
```
GET    /api/vehicles
POST   /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
POST   /api/vehicles/:id/odo
GET    /api/vehicles/:id/odo-history
POST   /api/vehicles/:id/transfer
GET    /api/vehicles/:id/transfer-history
```

### Workshop
```
GET    /api/workshop/jobs
POST   /api/workshop/jobs
GET    /api/workshop/jobs/:id
PATCH  /api/workshop/jobs/:id/status
GET    /api/workshop/dashboard

GET    /api/workshop/repair-orders
POST   /api/workshop/repair-orders
GET    /api/workshop/repair-orders/:id
POST   /api/workshop/repair-orders/:id/items

GET    /api/workshop/parts
POST   /api/workshop/parts
PATCH  /api/workshop/parts/:id
POST   /api/workshop/parts/transactions
POST   /api/workshop/parts/transfers

GET    /api/workshop/technicians
POST   /api/workshop/technicians
GET    /api/workshop/technicians/:id/performance
```

### Fleet
```
GET    /api/fleet/vehicles
GET    /api/fleet/dashboard
GET    /api/fleet/costs
POST   /api/fleet/costs
GET    /api/fleet/costs/summary

GET    /api/fleet/incidents
POST   /api/fleet/incidents
PATCH  /api/fleet/incidents/:id/status
```

### Maintenance
```
GET    /api/maintenance/plans
POST   /api/maintenance/plans
GET    /api/maintenance/vehicles
GET    /api/maintenance/alerts
```

### Notifications & System
```
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
GET    /api/audit-logs
GET    /api/branches
POST   /api/branches
GET    /api/users
POST   /api/users
```

### Query Pattern (all list endpoints)
```
?page=1&limit=20
?sortBy=createdAt&sortOrder=desc
?status=IN_PROGRESS&branchId=xxx
?search=biển số hoặc VIN
```

---

## Frontend

### Route Structure
```
(auth)/login, forgot-password
(dashboard)/
  workshop/         — Dashboard, jobs, repair-orders, parts, technicians
  fleet/            — Dashboard, vehicles, costs, incidents
  vehicles/         — Shared vehicle view, detail, odo, maintenance
  maintenance/      — Plans, alerts
  notifications/
  settings/         — Branches, users, roles
```

### State Management
- **Zustand**: auth store, notification store, UI state
- **React Query**: all server data (API calls, caching, invalidation)

### UI Theme
```
Primary:    #0055FF
Success:    #00C853
Warning:    #FF9800
Danger:     #F44336
Background: #F8FAFC
```
- Sidebar trái cố định
- Header trên cùng (branch switcher, search, notifications, user menu)
- Dark mode (class-based toggle)
- Responsive

### Key Components
- DataTable (Tanstack Table wrapper)
- KPI Cards
- Status Badge (color-coded)
- Vehicle Selector (autocomplete)
- Branch Switcher
- Job Workflow Stepper
- Maintenance Indicator (xanh/vàng/đỏ)
- Permission Gate (ẩn/hiện theo quyền)
- Notification Bell + dropdown
- Charts (Recharts: pie, bar, line, area)

---

## Phân quyền (RBAC)

| Role | Scope |
|------|-------|
| SUPER_ADMIN | Toàn quyền |
| GIAM_DOC_HAU_MAI | Xem toàn hệ thống |
| QUAN_LY_XUONG | Quản lý xưởng |
| CO_VAN_DICH_VU | Tạo RO |
| KY_THUAT_VIEN | Cập nhật công việc |
| QUAN_LY_DOI_XE | Quản lý taxi |
| DIEU_HANH | Xem đội xe |
| TAI_XE | Báo sự cố |

### Data Scoping
- User thuộc branch A → chỉ thấy data branch A
- SUPER_ADMIN, GIAM_DOC_HAU_MAI → thấy tất cả branches

---

## Deployment

### Docker Compose
- Development: postgres + redis + backend (hot reload) + frontend (hot reload)
- Production: postgres + redis + backend + frontend + nginx (SSL)

### CI/CD (GitHub Actions)
- Push to main → lint → test → build → SSH deploy to VPS → docker compose up → prisma migrate

### Infrastructure
- Nginx: reverse proxy, SSL, static serve
- PM2: process manager (alternative to Docker for backend)
- Redis: cache + Bull Queue broker

---

## MVP Build Phases

### Phase 1 — Foundation (Tuần 1-2)
- Project scaffolding (monorepo, Docker dev)
- Database schema + migrations + seed
- Auth module (login, JWT, refresh)
- RBAC (roles, permissions, guards)
- Base UI layout (sidebar, header, theme)

### Phase 2 — Shared Core (Tuần 3)
- Vehicle module (CRUD, search, filter)
- Branch management
- ODO tracking
- File upload

### Phase 3 — Workshop MVP (Tuần 4-5)
- Workshop jobs + workflow stepper
- Repair Orders
- Parts inventory (CRUD + transactions)
- Workshop Dashboard

### Phase 4 — Fleet MVP (Tuần 6-7)
- Fleet vehicle view
- Cost management
- Incident reporting
- Fleet Dashboard

### Phase 5 — Advanced (Tuần 8-9)
- Maintenance plans + alerts
- Part transfers giữa xe
- Notification center (in-app + email + Telegram)
- Audit logs
- KPI dashboards

### Phase 6 — Production (Tuần 10)
- Docker production build
- Nginx + SSL
- CI/CD pipeline
- Seed 500 xe + 1000 RO
- Performance testing
- Documentation
