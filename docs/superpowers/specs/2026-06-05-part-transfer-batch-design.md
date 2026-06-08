# Part Transfer Batch — Design Spec
**Date:** 2026-06-05
**Status:** Approved

---

## Overview

Tính năng hoán đổi phụ tùng đa chiều giữa các xe, có luồng duyệt, hỗ trợ hoàn trả và audit history đầy đủ theo từng xe.

---

## Data Model

### Thêm vào `schema.prisma`

```prisma
model PartTransferBatch {
  id              String                @id @default(uuid())
  code            String                @unique  // PTB-YYYYMMDD-XXXX
  status          PartTransferStatus    @default(PENDING)
  note            String?
  createdById     String                @map("created_by_id")
  approvedById    String?               @map("approved_by_id")
  approvedAt      DateTime?             @map("approved_at")
  rejectedReason  String?               @map("rejected_reason")
  reversedFromId  String?               @map("reversed_from_id")  // FK lô gốc nếu là lô hoàn trả
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")

  createdBy       User                  @relation("BatchCreator", fields: [createdById], references: [id])
  approvedBy      User?                 @relation("BatchApprover", fields: [approvedById], references: [id])
  reversedFrom    PartTransferBatch?    @relation("BatchReversal", fields: [reversedFromId], references: [id])
  reversals       PartTransferBatch[]   @relation("BatchReversal")
  lines           PartTransferLine[]

  @@index([status, createdAt])
  @@map("part_transfer_batches")
}

enum PartTransferStatus {
  PENDING
  APPROVED
  REJECTED
  REVERSED
}

model PartTransferLine {
  id            String   @id @default(uuid())
  batchId       String   @map("batch_id")
  partId        String   @map("part_id")
  fromVehicleId String   @map("from_vehicle_id")
  toVehicleId   String   @map("to_vehicle_id")
  quantity      Int
  note          String?

  batch       PartTransferBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  part        Part              @relation(fields: [partId], references: [id])
  fromVehicle Vehicle           @relation("TransferLineFrom", fields: [fromVehicleId], references: [id])
  toVehicle   Vehicle           @relation("TransferLineTo", fields: [toVehicleId], references: [id])

  @@map("part_transfer_lines")
}
```

Model `PartTransfer` cũ giữ nguyên trong schema, không dùng cho flow mới.

---

## Backend

### Module: `parts/transfer-batches`

**Endpoints:**

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| `POST` | `/parts/transfer-batches` | CO_VAN_DICH_VU, QUAN_LY_XUONG, SUPER_ADMIN | Tạo lô đề xuất |
| `GET` | `/parts/transfer-batches` | QUAN_LY_XUONG, GIAM_DOC_HAU_MAI, SUPER_ADMIN | Danh sách lô (filter: status, vehicleId) |
| `GET` | `/parts/transfer-batches/:id` | (các role trên) | Chi tiết lô + lines |
| `PATCH` | `/parts/transfer-batches/:id/approve` | QUAN_LY_XUONG, SUPER_ADMIN | Duyệt → thực hiện tồn kho |
| `PATCH` | `/parts/transfer-batches/:id/reject` | QUAN_LY_XUONG, SUPER_ADMIN | Từ chối + lý do |
| `POST` | `/parts/transfer-batches/:id/reverse` | QUAN_LY_XUONG, SUPER_ADMIN | Tạo lô hoàn trả ngược |
| `GET` | `/vehicles/:id/part-transfer-history` | (tất cả role xem xe) | Lịch sử hoán đổi theo xe |

**Lưu ý quan trọng — Part gắn với Branch, không phải Vehicle:**

Trong schema, `Part.stockQty` theo dõi tồn kho ở cấp **Chi nhánh**, không phải từng xe. Khi hoán đổi:
- **Cùng chi nhánh (fromVehicle.branchId == toVehicle.branchId):** tồn kho Branch không đổi, chỉ tạo PartTransaction để ghi lịch sử xe-level.
- **Khác chi nhánh:** trừ tồn kho Branch nguồn, cộng tồn kho Branch đích.

**Logic khi APPROVE:**

1. Validate tất cả lines:
   - Kiểm tra Part có thuộc Branch của fromVehicle không
   - Tồn kho (`Part.stockQty` tại Branch của fromVehicle) đủ không (cộng dồn nếu cùng Part nhiều lines)
   - Nếu thiếu → trả lỗi rõ line nào, part nào, thiếu bao nhiêu
2. Nếu đủ → dùng `prisma.$transaction`:
   - Cập nhật `PartTransferBatch.status = APPROVED`, ghi `approvedById`, `approvedAt`
   - Tạo `PartTransaction` TRANSFER_OUT cho mỗi line (note: fromVehicleId)
   - Tạo `PartTransaction` TRANSFER_IN cho mỗi line (note: toVehicleId)
   - Nếu khác Branch: cập nhật `Part.stockQty` (trừ Branch nguồn, cộng Branch đích)

**Logic khi REVERSE:**

1. Chỉ được reverse lô có status = APPROVED
2. Tạo lô mới với `reversedFromId` trỏ về lô gốc
3. Lines của lô mới = đảo ngược from/to của tất cả lines gốc, cùng quantity
4. Lô mới bắt đầu ở PENDING → cần duyệt lại

---

## Frontend

### Trang mới

| Route | Mô tả |
|-------|-------|
| `/workshop/parts/transfers` | Danh sách lô (tab PENDING / APPROVED / REJECTED / REVERSED) |
| `/workshop/parts/transfers/new` | Form tạo lô mới |
| `/workshop/parts/transfers/[id]` | Chi tiết lô + action duyệt/từ chối/hoàn trả |
| `/vehicles/[id]` | Thêm tab "Lịch sử hoán đổi" vào trang xe |

### Form tạo lô (`/new`)

- Note chung cho lô
- Bảng lines: mỗi line chọn Part, xe nguồn (fromVehicle), xe đích (toVehicle), số lượng
- Nút thêm/xoá line động
- Hiện tồn kho hiện tại của Part tại xe nguồn khi chọn

### Trang chi tiết lô

- Header: code, status badge, người tạo, ngày tạo, người duyệt
- Bảng lines: phụ tùng | xe nguồn → xe đích | số lượng
- Action bar (theo role và status):
  - PENDING + QUAN_LY_XUONG/SUPER_ADMIN: nút Duyệt / Từ chối
  - APPROVED + QUAN_LY_XUONG/SUPER_ADMIN: nút Hoàn trả

### Tab lịch sử hoán đổi trên trang xe

Bảng: Ngày | Lô | Phụ tùng | Hướng (nhận/cho) | Xe đối ứng | Số lượng | Trạng thái

---

## Permissions

Thêm vào seed: resource `part_transfers`, actions `create`, `read`, `approve`.

| Role | create | read | approve |
|------|--------|------|---------|
| SUPER_ADMIN | ✅ | ✅ | ✅ |
| GIAM_DOC_HAU_MAI | ❌ | ✅ | ❌ |
| QUAN_LY_XUONG | ✅ | ✅ | ✅ |
| CO_VAN_DICH_VU | ✅ | ✅ | ❌ |
| KY_THUAT_VIEN | ❌ | ✅ | ❌ |

---

## Audit / History

- Mỗi APPROVE tạo `PartTransaction` records (đã có model) → lịch sử tồn kho đầy đủ
- `PartTransferBatch` lưu createdBy + approvedBy + timestamps → audit trail
- `reversedFromId` tạo chain: lô gốc ↔ lô hoàn trả

---

## Out of Scope

- Thông báo realtime khi lô được duyệt (có thể thêm sau qua Notification module)
- Partial approval (duyệt một phần lines trong lô)
- Chỉnh sửa lô sau khi tạo (chỉ được xoá trước khi submit hoặc tạo lô mới)
