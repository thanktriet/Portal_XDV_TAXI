# Phân quyền hệ thống — Portal XDV Taxi

## Danh sách Role

| Code | Tên | Mô tả |
|------|-----|-------|
| `SUPER_ADMIN` | Super Admin | Toàn quyền hệ thống |
| `GIAM_DOC_HAU_MAI` | Giám đốc Hậu mãi | Xem toàn hệ thống |
| `QUAN_LY_XUONG` | Quản lý Xưởng | Quản lý xưởng dịch vụ |
| `CO_VAN_DICH_VU` | Cố vấn Dịch vụ | Tạo và quản lý RO |
| `KY_THUAT_VIEN` | Kỹ thuật viên | Cập nhật công việc sửa chữa |
| `QUAN_LY_DOI_XE` | Quản lý Đội xe | Quản lý đội taxi |
| `KTV_DOI_XE` | KTV Đội xe | Kỹ thuật viên bảo dưỡng đội taxi |
| `DIEU_HANH` | Điều hành | Xem thông tin đội xe |
| `TAI_XE` | Tài xế | Báo sự cố |

---

## Bảng phân quyền chi tiết

> **Ký hiệu:** ✅ Toàn quyền (CRUD) | 👁 Chỉ xem (read) | C Create | R Read | U Update | D Delete | A Approve | ❌ Không có quyền

| Resource | SUPER_ADMIN | Giám đốc HM | Quản lý Xưởng | Cố vấn DV | KTV Xưởng | Quản lý Đội xe | KTV Đội xe | Điều hành | Tài xế |
|----------|:-----------:|:-----------:|:-------------:|:---------:|:---------:|:--------------:|:----------:|:---------:|:------:|
| `users` | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `branches` | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `vehicles` | ✅ | 👁 | ✅ | 👁 | ❌ | ✅ | 👁 | ❌ | 👁 |
| `workshop_jobs` | ✅ | 👁 | ✅ | ✅ | ❌ | 👁 | ❌ | ❌ | ❌ |
| `repair_orders` | ✅ | 👁 | ✅ | CRU | ❌ | ❌ | ❌ | ❌ | ❌ |
| `parts` | ✅ | 👁 | ✅ | ❌ | 👁 | 👁 | 👁 | ❌ | ❌ |
| `technicians` | ✅ | 👁 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `part_transfers` | ✅ | 👁 | ✅ | CR | ❌ | 👁 | ❌ | ❌ | ❌ |
| `maintenance` | ✅ | 👁 | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `maintenance_plans` ⭐ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `fleet_costs` | ✅ | 👁 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `fleet_incidents` | ✅ | 👁 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | CR |
| `fleet_part_replacements` | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | CR | ❌ | ❌ |
| `notifications` | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `audit_logs` | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ⭐ `maintenance_plans` — chỉ SUPER_ADMIN mới có quyền tạo/sửa/xóa kế hoạch bảo dưỡng

---

## Chi tiết từng Role

### SUPER_ADMIN
- Toàn quyền tất cả resources
- Duy nhất có quyền cấu hình kế hoạch bảo dưỡng (`maintenance_plans`)
- Quản lý users, branches, permissions

### Giám đốc Hậu mãi
- Chỉ xem (read) toàn bộ hệ thống
- Không thể tạo/sửa/xóa bất kỳ dữ liệu nào

### Quản lý Xưởng
- Toàn quyền: vehicles, workshop_jobs, repair_orders, parts, technicians, maintenance, part_transfers
- Không truy cập: fleet, users, branches, notifications

### Cố vấn Dịch vụ
- Toàn quyền: workshop_jobs
- Tạo + xem + sửa: repair_orders
- Tạo + xem: part_transfers
- Chỉ xem: vehicles

### KTV Xưởng *(chưa có quyền — cần bổ sung)*
- Hiện chưa được gán permission nào trong hệ thống

### Quản lý Đội xe
- Toàn quyền: vehicles, fleet_costs, fleet_incidents, maintenance
- Chỉ xem: workshop_jobs, part_transfers, parts (xem full lịch sử sửa chữa & linh kiện)
- Không truy cập: users, branches, repair_orders, technicians

### KTV Đội xe
- Tạo + xem: fleet_part_replacements
- Chỉ xem: vehicles, parts

### Điều hành *(chưa có quyền — cần bổ sung)*
- Hiện chưa được gán permission nào trong hệ thống

### Tài xế
- Tạo + xem: fleet_incidents (báo sự cố)
- Chỉ xem: vehicles

---

## Ghi chú

- **KTV Xưởng** và **Điều hành** chưa có quyền → cần xác nhận để bổ sung
- Tất cả actions: `create`, `read`, `update`, `delete`, `approve`, `transfer`
- Backend kiểm tra quyền qua `PermissionsGuard` với decorator `@RequirePermissions('resource:action')`
