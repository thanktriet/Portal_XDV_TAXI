# Part Transfer Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-directional part transfer between vehicles with approval workflow, reversal support, and per-vehicle audit history.

**Architecture:** New `transfer-batches` sub-module under `workshop/parts` with its own service, controller, DTOs. Frontend gets 3 new pages + 1 new tab on vehicle detail. Prisma schema gains 2 new models + 1 enum.

**Tech Stack:** NestJS, Prisma, Next.js 15, React Query, Tailwind CSS, Zod

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add PartTransferBatch, PartTransferLine models and PartTransferStatus enum**

Add after the existing `PartTransfer` model (around line 398):

```prisma
// ==================== PART TRANSFER BATCHES ====================

enum PartTransferStatus {
  PENDING
  APPROVED
  REJECTED
  REVERSED
}

model PartTransferBatch {
  id              String              @id @default(uuid())
  code            String              @unique
  status          PartTransferStatus  @default(PENDING)
  note            String?
  createdById     String              @map("created_by_id")
  approvedById    String?             @map("approved_by_id")
  approvedAt      DateTime?           @map("approved_at")
  rejectedReason  String?             @map("rejected_reason")
  reversedFromId  String?             @map("reversed_from_id")
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  createdBy    User                @relation("BatchCreator", fields: [createdById], references: [id])
  approvedBy   User?               @relation("BatchApprover", fields: [approvedById], references: [id])
  reversedFrom PartTransferBatch?  @relation("BatchReversal", fields: [reversedFromId], references: [id])
  reversals    PartTransferBatch[] @relation("BatchReversal")
  lines        PartTransferLine[]

  @@index([status, createdAt])
  @@map("part_transfer_batches")
}

model PartTransferLine {
  id            String @id @default(uuid())
  batchId       String @map("batch_id")
  partId        String @map("part_id")
  fromVehicleId String @map("from_vehicle_id")
  toVehicleId   String @map("to_vehicle_id")
  quantity      Int
  note          String?

  batch       PartTransferBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  part        Part              @relation(fields: [partId], references: [id])
  fromVehicle Vehicle           @relation("TransferLineFrom", fields: [fromVehicleId], references: [id])
  toVehicle   Vehicle           @relation("TransferLineTo", fields: [toVehicleId], references: [id])

  @@map("part_transfer_lines")
}
```

- [ ] **Step 2: Add relation fields to User, Part, Vehicle models**

In `User` model, add:
```prisma
  createdBatches    PartTransferBatch[] @relation("BatchCreator")
  approvedBatches   PartTransferBatch[] @relation("BatchApprover")
```

In `Part` model, add:
```prisma
  transferLines  PartTransferLine[]
```

In `Vehicle` model, add:
```prisma
  partTransferLinesFrom PartTransferLine[] @relation("TransferLineFrom")
  partTransferLinesTo   PartTransferLine[] @relation("TransferLineTo")
```

- [ ] **Step 3: Run migration**

Run: `cd apps/backend && npx prisma migrate dev --name add-part-transfer-batch`

- [ ] **Step 4: Generate Prisma client**

Run: `cd apps/backend && npx prisma generate`

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat: add PartTransferBatch and PartTransferLine schema"
```

---

### Task 2: Backend DTOs

**Files:**
- Create: `apps/backend/src/modules/workshop/parts/transfer-batches/dto/create-transfer-batch.dto.ts`
- Create: `apps/backend/src/modules/workshop/parts/transfer-batches/dto/reject-batch.dto.ts`
- Create: `apps/backend/src/modules/workshop/parts/transfer-batches/dto/query-batch.dto.ts`

- [ ] **Step 1: Create CreateTransferBatchDto**

```typescript
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TransferLineDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty()
  @IsUUID()
  fromVehicleId: string;

  @ApiProperty()
  @IsUUID()
  toVehicleId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateTransferBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [TransferLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}
```

- [ ] **Step 2: Create RejectBatchDto**

```typescript
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectBatchDto {
  @ApiProperty({ example: 'Không đủ tồn kho tại chi nhánh' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
```

- [ ] **Step 3: Create QueryBatchDto**

```typescript
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/workshop/parts/transfer-batches/
git commit -m "feat: add DTOs for part transfer batch"
```

---

### Task 3: Backend Service

**Files:**
- Create: `apps/backend/src/modules/workshop/parts/transfer-batches/transfer-batches.service.ts`

- [ ] **Step 1: Create TransferBatchesService with create method**

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { PartTransactionType } from '@prisma/client';
import { CreateTransferBatchDto } from './dto/create-transfer-batch.dto';
import { QueryBatchDto } from './dto/query-batch.dto';

@Injectable()
export class TransferBatchesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.partTransferBatch.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    return `PTB-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateTransferBatchDto, userId: string) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Lô phải có ít nhất 1 dòng');
    }

    // Validate lines: fromVehicle != toVehicle
    for (const line of dto.lines) {
      if (line.fromVehicleId === line.toVehicleId) {
        throw new BadRequestException('Xe nguồn và xe đích không được trùng nhau');
      }
    }

    const code = await this.generateCode();

    return this.prisma.partTransferBatch.create({
      data: {
        code,
        note: dto.note,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            partId: line.partId,
            fromVehicleId: line.fromVehicleId,
            toVehicleId: line.toVehicleId,
            quantity: line.quantity,
            note: line.note,
          })),
        },
      },
      include: {
        lines: { include: { part: true, fromVehicle: true, toVehicle: true } },
        createdBy: { omit: { passwordHash: true } },
      },
    });
  }

  async findAll(query: QueryBatchDto) {
    const { status, vehicleId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (vehicleId) {
      where.lines = {
        some: {
          OR: [{ fromVehicleId: vehicleId }, { toVehicleId: vehicleId }],
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.partTransferBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { omit: { passwordHash: true } },
          approvedBy: { omit: { passwordHash: true } },
          lines: { include: { part: true, fromVehicle: true, toVehicle: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.partTransferBatch.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({
      where: { id },
      include: {
        createdBy: { omit: { passwordHash: true } },
        approvedBy: { omit: { passwordHash: true } },
        reversedFrom: { select: { id: true, code: true } },
        reversals: { select: { id: true, code: true, status: true } },
        lines: {
          include: {
            part: { include: { category: true } },
            fromVehicle: { include: { model: true } },
            toVehicle: { include: { model: true } },
          },
        },
      },
    });
    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    return batch;
  }

  async approve(id: string, userId: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            part: true,
            fromVehicle: true,
            toVehicle: true,
          },
        },
      },
    });

    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    if (batch.status !== 'PENDING') {
      throw new ConflictException('Chỉ duyệt được lô đang chờ (PENDING)');
    }

    // Validate stock: aggregate qty per part per fromVehicle's branch
    const stockNeeded = new Map<string, number>(); // key: partId
    for (const line of batch.lines) {
      const key = line.partId;
      stockNeeded.set(key, (stockNeeded.get(key) || 0) + line.quantity);
    }

    const errors: string[] = [];
    for (const [partId, needed] of stockNeeded) {
      const part = batch.lines.find((l) => l.partId === partId)!.part;
      if (part.stockQty < needed) {
        errors.push(
          `${part.name} (${part.code}): cần ${needed}, tồn kho ${part.stockQty}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Không đủ tồn kho:\n${errors.join('\n')}`,
      );
    }

    // Execute in transaction
    return this.prisma.$transaction(async (tx) => {
      // Update batch status
      const updated = await tx.partTransferBatch.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      // Create transactions and adjust stock for cross-branch transfers
      for (const line of batch.lines) {
        const isCrossBranch =
          line.fromVehicle.branchId !== line.toVehicle.branchId;

        // TRANSFER_OUT transaction
        await tx.partTransaction.create({
          data: {
            partId: line.partId,
            type: PartTransactionType.TRANSFER_OUT,
            quantity: line.quantity,
            reference: `PTB:${batch.code}`,
            note: `Xe ${line.fromVehicle.licensePlate} → ${line.toVehicle.licensePlate}`,
            userId,
          },
        });

        // TRANSFER_IN transaction
        await tx.partTransaction.create({
          data: {
            partId: line.partId,
            type: PartTransactionType.TRANSFER_IN,
            quantity: line.quantity,
            reference: `PTB:${batch.code}`,
            note: `Xe ${line.fromVehicle.licensePlate} → ${line.toVehicle.licensePlate}`,
            userId,
          },
        });

        // Adjust stock only for cross-branch
        if (isCrossBranch) {
          await tx.part.update({
            where: { id: line.partId },
            data: { stockQty: { decrement: line.quantity } },
          });
          // Note: in a full implementation, the receiving branch Part record
          // would be incremented. For now, transactions serve as audit trail.
        }
      }

      return updated;
    });
  }

  async reject(id: string, userId: string, reason: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    if (batch.status !== 'PENDING') {
      throw new ConflictException('Chỉ từ chối được lô đang chờ (PENDING)');
    }

    return this.prisma.partTransferBatch.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });
  }

  async reverse(id: string, userId: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({
      where: { id },
      include: { lines: true, reversals: true },
    });

    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    if (batch.status !== 'APPROVED') {
      throw new ConflictException('Chỉ hoàn trả được lô đã duyệt (APPROVED)');
    }
    if (batch.reversals.length > 0) {
      throw new ConflictException('Lô này đã có yêu cầu hoàn trả');
    }

    const code = await this.generateCode();

    // Create reverse batch (PENDING — needs approval)
    const reverseBatch = await this.prisma.partTransferBatch.create({
      data: {
        code,
        note: `Hoàn trả lô ${batch.code}`,
        status: 'PENDING',
        createdById: userId,
        reversedFromId: batch.id,
        lines: {
          create: batch.lines.map((line) => ({
            partId: line.partId,
            fromVehicleId: line.toVehicleId, // reversed
            toVehicleId: line.fromVehicleId, // reversed
            quantity: line.quantity,
            note: `Hoàn trả từ lô ${batch.code}`,
          })),
        },
      },
      include: {
        lines: { include: { part: true, fromVehicle: true, toVehicle: true } },
        createdBy: { omit: { passwordHash: true } },
      },
    });

    // Mark original batch as REVERSED
    await this.prisma.partTransferBatch.update({
      where: { id },
      data: { status: 'REVERSED' },
    });

    return reverseBatch;
  }

  async getVehicleHistory(vehicleId: string) {
    const lines = await this.prisma.partTransferLine.findMany({
      where: {
        OR: [{ fromVehicleId: vehicleId }, { toVehicleId: vehicleId }],
        batch: { status: { in: ['APPROVED', 'REVERSED'] } },
      },
      include: {
        batch: {
          select: { id: true, code: true, status: true, approvedAt: true, createdAt: true },
        },
        part: { select: { id: true, code: true, name: true } },
        fromVehicle: { select: { id: true, licensePlate: true } },
        toVehicle: { select: { id: true, licensePlate: true } },
      },
      orderBy: { batch: { createdAt: 'desc' } },
    });

    return lines.map((line) => ({
      ...line,
      direction: line.fromVehicleId === vehicleId ? 'OUT' : 'IN',
      counterpartVehicle:
        line.fromVehicleId === vehicleId ? line.toVehicle : line.fromVehicle,
    }));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/workshop/parts/transfer-batches/
git commit -m "feat: add TransferBatchesService"
```

---

### Task 4: Backend Controller

**Files:**
- Create: `apps/backend/src/modules/workshop/parts/transfer-batches/transfer-batches.controller.ts`

- [ ] **Step 1: Create TransferBatchesController**

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransferBatchesService } from './transfer-batches.service';
import { CreateTransferBatchDto } from './dto/create-transfer-batch.dto';
import { RejectBatchDto } from './dto/reject-batch.dto';
import { QueryBatchDto } from './dto/query-batch.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@ApiTags('Part Transfer Batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parts/transfer-batches')
export class TransferBatchesController {
  constructor(private service: TransferBatchesService) {}

  @Post()
  @RequirePermissions('part_transfers:create')
  @ApiOperation({ summary: 'Tạo lô hoán đổi phụ tùng' })
  create(
    @Body() dto: CreateTransferBatchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Get()
  @RequirePermissions('part_transfers:read')
  @ApiOperation({ summary: 'Danh sách lô hoán đổi' })
  findAll(@Query() query: QueryBatchDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('part_transfers:read')
  @ApiOperation({ summary: 'Chi tiết lô hoán đổi' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve')
  @RequirePermissions('part_transfers:approve')
  @ApiOperation({ summary: 'Duyệt lô hoán đổi' })
  approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('part_transfers:approve')
  @ApiOperation({ summary: 'Từ chối lô hoán đổi' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectBatchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.reject(id, userId, dto.reason);
  }

  @Post(':id/reverse')
  @RequirePermissions('part_transfers:approve')
  @ApiOperation({ summary: 'Tạo lô hoàn trả' })
  reverse(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.reverse(id, userId);
  }

  @Get('vehicle/:vehicleId/history')
  @RequirePermissions('part_transfers:read')
  @ApiOperation({ summary: 'Lịch sử hoán đổi phụ tùng theo xe' })
  getVehicleHistory(@Param('vehicleId') vehicleId: string) {
    return this.service.getVehicleHistory(vehicleId);
  }
}
```

- [ ] **Step 2: Register in WorkshopModule**

Modify `apps/backend/src/modules/workshop/workshop.module.ts`: add imports for TransferBatchesService and TransferBatchesController.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/workshop/
git commit -m "feat: add TransferBatchesController and register in module"
```

---

### Task 5: Seed Permissions

**Files:**
- Modify: `apps/backend/prisma/seed/index.ts`

- [ ] **Step 1: Add part_transfers resource to seeds**

Add `'part_transfers'` to the `resources` array (line 11) and update role permission assignments:
- QUAN_LY_XUONG: all actions for part_transfers
- CO_VAN_DICH_VU: create + read for part_transfers

- [ ] **Step 2: Run seed**

Run: `cd apps/backend && npm run db:seed`

- [ ] **Step 3: Commit**

```bash
git add apps/backend/prisma/seed/
git commit -m "feat: seed part_transfers permissions"
```

---

### Task 6: Frontend — Transfer Batches List Page

**Files:**
- Create: `apps/frontend/src/app/(dashboard)/workshop/parts/transfers/page.tsx`

- [ ] **Step 1: Create transfer batches list page**

Page with:
- Tabs: Tất cả / Chờ duyệt / Đã duyệt / Từ chối / Hoàn trả
- Table: Mã lô | Ngày tạo | Người tạo | Số dòng | Trạng thái
- Button "Tạo lô mới" → link to /workshop/parts/transfers/new
- Use React Query `useQuery` with `api.get('/parts/transfer-batches', { params })`

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/
git commit -m "feat: add transfer batches list page"
```

---

### Task 7: Frontend — Create Transfer Batch Form

**Files:**
- Create: `apps/frontend/src/app/(dashboard)/workshop/parts/transfers/new/page.tsx`

- [ ] **Step 1: Create form page**

Page with:
- Note field (textarea)
- Dynamic lines table: each row has Part (select), From Vehicle (select), To Vehicle (select), Quantity (number), Note (text), Remove button
- "Thêm dòng" button appends a new empty row
- Show part stock info when part is selected
- Submit button → `api.post('/parts/transfer-batches', payload)`
- On success: redirect to `/workshop/parts/transfers`

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/
git commit -m "feat: add create transfer batch form"
```

---

### Task 8: Frontend — Transfer Batch Detail Page

**Files:**
- Create: `apps/frontend/src/app/(dashboard)/workshop/parts/transfers/[id]/page.tsx`

- [ ] **Step 1: Create detail page**

Page with:
- Header: code, status badge, người tạo, ngày, người duyệt
- Lines table: Phụ tùng | Xe nguồn → Xe đích | Số lượng | Ghi chú
- If reversedFrom: link to original batch
- Action buttons based on status + permissions:
  - PENDING: Duyệt (PATCH approve), Từ chối (dialog with reason → PATCH reject)
  - APPROVED: Hoàn trả (POST reverse)

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/
git commit -m "feat: add transfer batch detail page"
```

---

### Task 9: Frontend — Vehicle Part Transfer History Tab

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/vehicles/[id]/page.tsx`

- [ ] **Step 1: Add part transfer history section**

Add a new section after "Lịch sử điều chuyển" that:
- Fetches `api.get(`/parts/transfer-batches/vehicle/${id}/history`)`
- Displays table: Ngày | Lô | Phụ tùng | Hướng (badge IN/OUT) | Xe đối ứng | SL | Trạng thái
- IN = nhận, OUT = cho

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/
git commit -m "feat: add part transfer history to vehicle detail"
```

---

### Task 10: Add Sidebar Link

**Files:**
- Modify: `apps/frontend/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add "Hoán đổi PT" nav item in Xưởng Dịch vụ section**

Add after "Phụ tùng":
```typescript
{ label: 'Hoán đổi PT', href: '/workshop/parts/transfers', icon: ArrowRightLeft, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'CO_VAN_DICH_VU'] },
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/layout/sidebar.tsx
git commit -m "feat: add part transfers link to sidebar"
```
