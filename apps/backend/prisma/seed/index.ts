import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Permissions
  const resources = [
    'users', 'branches', 'vehicles', 'workshop_jobs',
    'repair_orders', 'parts', 'technicians', 'fleet_costs',
    'fleet_incidents', 'maintenance', 'notifications', 'audit_logs',
    'part_transfers', 'maintenance_plans',
  ];
  const actions = ['create', 'read', 'update', 'delete', 'approve', 'transfer'];

  const permissions: any[] = [];
  for (const resource of resources) {
    for (const action of actions) {
      permissions.push(
        await prisma.permission.upsert({
          where: { resource_action: { resource, action } },
          update: {},
          create: { resource, action },
        }),
      );
    }
  }
  console.log(`✅ ${permissions.length} permissions created`);

  // 2. Roles
  const roles = [
    { code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Toàn quyền hệ thống' },
    { code: 'GIAM_DOC_HAU_MAI', name: 'Giám đốc Hậu mãi', description: 'Xem toàn hệ thống' },
    { code: 'QUAN_LY_XUONG', name: 'Quản lý Xưởng', description: 'Quản lý xưởng dịch vụ' },
    { code: 'CO_VAN_DICH_VU', name: 'Cố vấn Dịch vụ', description: 'Tạo và quản lý RO' },
    { code: 'KY_THUAT_VIEN', name: 'Kỹ thuật viên', description: 'Cập nhật công việc sửa chữa' },
    { code: 'QUAN_LY_DOI_XE', name: 'Quản lý Đội xe', description: 'Quản lý đội taxi' },
    { code: 'KTV_DOI_XE', name: 'KTV Đội xe', description: 'Kỹ thuật viên bảo dưỡng đội taxi' },
    { code: 'DIEU_HANH', name: 'Điều hành', description: 'Xem thông tin đội xe' },
    { code: 'TAI_XE', name: 'Tài xế', description: 'Báo sự cố' },
  ];

  const createdRoles: any[] = [];
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
    createdRoles.push(created);
  }
  console.log(`✅ ${createdRoles.length} roles created`);

  // 3. Assign all permissions to SUPER_ADMIN
  const superAdmin = createdRoles.find((r) => r.code === 'SUPER_ADMIN');
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: perm.id },
    });
  }

  // Assign read permissions to GIAM_DOC_HAU_MAI
  const giamDoc = createdRoles.find((r) => r.code === 'GIAM_DOC_HAU_MAI');
  const readPerms = permissions.filter((p) => p.action === 'read');
  for (const perm of readPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: giamDoc.id, permissionId: perm.id } },
      update: {},
      create: { roleId: giamDoc.id, permissionId: perm.id },
    });
  }

  // QUAN_LY_XUONG - workshop related
  const quanLyXuong = createdRoles.find((r) => r.code === 'QUAN_LY_XUONG');
  const workshopResources = ['vehicles', 'workshop_jobs', 'repair_orders', 'parts', 'technicians', 'maintenance', 'part_transfers'];
  const workshopPerms = permissions.filter(
    (p) => workshopResources.includes(p.resource),
  );
  for (const perm of workshopPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: quanLyXuong.id, permissionId: perm.id } },
      update: {},
      create: { roleId: quanLyXuong.id, permissionId: perm.id },
    });
  }

  // QUAN_LY_DOI_XE - fleet related + read workshop/parts history
  const quanLyDoiXe = createdRoles.find((r) => r.code === 'QUAN_LY_DOI_XE');
  const fleetResources = ['vehicles', 'fleet_costs', 'fleet_incidents', 'maintenance'];
  const fleetPerms = permissions.filter(
    (p) =>
      fleetResources.includes(p.resource) ||
      (p.resource === 'workshop_jobs' && p.action === 'read') ||
      (p.resource === 'part_transfers' && p.action === 'read') ||
      (p.resource === 'parts' && p.action === 'read'),
  );
  for (const perm of fleetPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: quanLyDoiXe.id, permissionId: perm.id } },
      update: {},
      create: { roleId: quanLyDoiXe.id, permissionId: perm.id },
    });
  }

  // KTV_DOI_XE - create/read fleet part replacements + read vehicles
  const ktvDoiXe = createdRoles.find((r) => r.code === 'KTV_DOI_XE');
  const ktvDoiXePerms = permissions.filter(
    (p) =>
      (p.resource === 'fleet_part_replacements' && ['create', 'read'].includes(p.action)) ||
      (p.resource === 'vehicles' && p.action === 'read') ||
      (p.resource === 'parts' && p.action === 'read'),
  );
  for (const perm of ktvDoiXePerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ktvDoiXe.id, permissionId: perm.id } },
      update: {},
      create: { roleId: ktvDoiXe.id, permissionId: perm.id },
    });
  }

  // TAI_XE - limited permissions
  const taiXe = createdRoles.find((r) => r.code === 'TAI_XE');
  const driverPerms = permissions.filter(
    (p) =>
      (p.resource === 'fleet_incidents' && ['create', 'read'].includes(p.action)) ||
      (p.resource === 'vehicles' && p.action === 'read'),
  );
  for (const perm of driverPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: taiXe.id, permissionId: perm.id } },
      update: {},
      create: { roleId: taiXe.id, permissionId: perm.id },
    });
  }

  // CO_VAN_DICH_VU - part_transfers create + read
  const coVan = createdRoles.find((r) => r.code === 'CO_VAN_DICH_VU');
  const coVanPerms = permissions.filter(
    (p) =>
      (p.resource === 'part_transfers' && ['create', 'read'].includes(p.action)) ||
      (p.resource === 'workshop_jobs') ||
      (p.resource === 'repair_orders' && ['create', 'read', 'update'].includes(p.action)) ||
      (p.resource === 'vehicles' && p.action === 'read'),
  );
  for (const perm of coVanPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: coVan.id, permissionId: perm.id } },
      update: {},
      create: { roleId: coVan.id, permissionId: perm.id },
    });
  }

  console.log('✅ Role permissions assigned');

  // 4. Branches
  const branches = [
    { name: '2S Rạch Giá',              code: 'XW01', type: 'WORKSHOP' as const, address: '168 Nguyễn Trung Trực, Rạch Giá, Kiên Giang', phone: '02973 500 001' },
    { name: 'Đội xe Rạch Giá',          code: 'RG01', type: 'FLEET'    as const, address: '56 Lạc Hồng, Rạch Giá, Kiên Giang',          phone: '02973 500 002' },
    { name: 'Đội xe An Giang',          code: 'AG01', type: 'FLEET'    as const, address: '123 Trần Hưng Đạo, Long Xuyên, An Giang',     phone: '02963 500 001' },
    { name: 'Đội xe Cần Thơ',           code: 'CT01', type: 'FLEET'    as const, address: '89 Nguyễn Văn Linh, Ninh Kiều, Cần Thơ',      phone: '02923 500 001' },
    { name: 'Đội xe Vĩnh Long',         code: 'VL01', type: 'FLEET'    as const, address: '45 Phạm Thái Bường, TP Vĩnh Long',            phone: '02703 500 001' },
    { name: 'Đội xe Bạc Liêu',          code: 'BL01', type: 'FLEET'    as const, address: '78 Trần Phú, TP Bạc Liêu',                    phone: '02913 500 001' },
  ];

  const createdBranches: any[] = [];
  for (const branch of branches) {
    const created = await prisma.branch.upsert({
      where: { code: branch.code },
      update: {},
      create: branch,
    });
    createdBranches.push(created);
  }
  console.log(`✅ ${createdBranches.length} branches created`);

  // 5. Vehicle Models
  const vehicleModels = [
    { name: 'VF e34', brand: 'VinFast', type: 'sedan' },
    { name: 'VF 5', brand: 'VinFast', type: 'hatchback' },
    { name: 'VF 6', brand: 'VinFast', type: 'suv' },
    { name: 'VF 7', brand: 'VinFast', type: 'suv' },
    { name: 'VF 8', brand: 'VinFast', type: 'suv' },
    { name: 'VF 9', brand: 'VinFast', type: 'suv' },
  ];

  const createdModels: any[] = [];
  for (const model of vehicleModels) {
    const existing = await prisma.vehicleModel.findFirst({
      where: { name: model.name },
    });
    if (existing) {
      createdModels.push(existing);
    } else {
      const created = await prisma.vehicleModel.create({ data: model });
      createdModels.push(created);
    }
  }
  console.log(`✅ ${createdModels.length} vehicle models created`);

  // 6. Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = [
    { email: 'admin@xdv.vn', fullName: 'Admin Hệ Thống', role: 'SUPER_ADMIN', branch: null },
    { email: 'giamdoc@xdv.vn', fullName: 'Nguyễn Văn Giám Đốc', role: 'GIAM_DOC_HAU_MAI', branch: null },
    { email: 'quanlyxuong@xdv.vn', fullName: 'Trần Văn Xưởng',    role: 'QUAN_LY_XUONG',   branch: 'XW01' },
    { email: 'covan@xdv.vn',       fullName: 'Lê Thị Cố Vấn',     role: 'CO_VAN_DICH_VU',  branch: 'XW01' },
    { email: 'kythuatvien@xdv.vn', fullName: 'Phạm Văn Kỹ Thuật', role: 'KY_THUAT_VIEN',   branch: 'XW01' },
    { email: 'quanlydoixe@xdv.vn', fullName: 'Hoàng Văn Đội Xe',  role: 'QUAN_LY_DOI_XE',  branch: 'RG01' },
    { email: 'ktvdoixe@xdv.vn',    fullName: 'Nguyễn Văn KTV Đội',role: 'KTV_DOI_XE',       branch: 'RG01' },
    { email: 'dieuhanh@xdv.vn',    fullName: 'Vũ Thị Điều Hành',  role: 'DIEU_HANH',        branch: 'RG01' },
    { email: 'taixe01@xdv.vn',     fullName: 'Đỗ Văn Tài Xế',     role: 'TAI_XE',           branch: 'RG01' },
    { email: 'taixe02@xdv.vn', fullName: 'Bùi Văn Lái', role: 'TAI_XE', branch: 'AG01' },
    { email: 'quanlydoixe2@xdv.vn', fullName: 'Ngô Văn Quản Lý', role: 'QUAN_LY_DOI_XE', branch: 'CT01' },
    { email: 'taixe03@xdv.vn', fullName: 'Trần Văn Minh', role: 'TAI_XE', branch: 'CT01' },
    { email: 'taixe04@xdv.vn', fullName: 'Lý Văn Hùng', role: 'TAI_XE', branch: 'VL01' },
    { email: 'taixe05@xdv.vn', fullName: 'Võ Văn Thành', role: 'TAI_XE', branch: 'BL01' },
  ];

  for (const user of users) {
    const role = createdRoles.find((r) => r.code === user.role);
    const branch = user.branch
      ? createdBranches.find((b) => b.code === user.branch)
      : null;

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        fullName: user.fullName,
        passwordHash,
        phone: '09' + Math.floor(10000000 + Math.random() * 90000000).toString(),
        roleId: role.id,
        branchId: branch?.id || null,
      },
    });
  }
  console.log(`✅ ${users.length} users created (password: password123)`);

  // 7. Part Categories
  const partCategories = [
    { name: 'Hệ thống phanh', code: 'BRAKE' },
    { name: 'Hệ thống lái', code: 'STEERING' },
    { name: 'Hệ thống treo', code: 'SUSPENSION' },
    { name: 'Hệ thống điện', code: 'ELECTRICAL' },
    { name: 'Thân vỏ', code: 'BODY' },
    { name: 'Lốp & bánh xe', code: 'TIRE' },
    { name: 'Pin & ắc quy', code: 'BATTERY' },
    { name: 'Khác', code: 'OTHER' },
  ];

  for (const cat of partCategories) {
    await prisma.partCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${partCategories.length} part categories created`);

  // 8. Maintenance Plans — VinFast Checksheet 4 cấp (theo tài liệu kỹ thuật 2026)
  const maintenancePlans = [
    {
      name: 'Cấp 1 — 5.000 km',
      intervalKm: 5000,
      description: 'Bảo dưỡng định kỳ cấp 1 mỗi 5.000 km hoặc 6 tháng',
      tasks: [
        'Dùng dung dịch tẩy rửa động cơ đánh giá tình trạng đầu lọc dầu hộp số',
        'Thay dầu động cơ & lọc dầu động cơ',
        'Trang dụng kiểm soát áp lực lốp xe (TPMS) — Kiểm tra, bơm lốp đúng áp suất',
        'Kiểm tra ắc quy — vệ sinh cực, kiểm tra điện áp',
        'Kiểm tra chổi gạt nước',
        'Cân bằng động & xoay lốp',
        'Kiểm tra đèn xe toàn bộ (đèn pha, đèn hậu, đèn xi nhan)',
        'Vệ sinh khoang động cơ',
        'Kiểm tra hệ thống làm mát — mức nước làm mát',
        'Kiểm tra dây đai (belt) — tình trạng, độ căng',
        'Kiểm tra má phanh trước / sau',
        'Kiểm tra hệ thống lái, trợ lực',
        'Kiểm tra khung gầm, gioăng cao su',
        'Kiểm tra hệ thống treo trước / sau',
        'Kiểm tra rò rỉ dầu, nước',
        'Kiểm tra hệ thống điều hòa',
        'Vệ sinh lọc gió điều hòa cabin',
        'Tra mỡ bản lề cửa, bản lề capo',
        'Kiểm tra thắt lưng an toàn',
        'Kiểm tra tổng thể & lập báo cáo',
      ],
    },
    {
      name: 'Cấp 2 — 10.000 km',
      intervalKm: 10000,
      description: 'Bảo dưỡng định kỳ cấp 2 mỗi 10.000 km hoặc 12 tháng',
      tasks: [
        'Thực hiện toàn bộ hạng mục Cấp 1',
        'Thay lọc gió động cơ',
        'Thay lọc gió điều hòa cabin',
        'Kiểm tra bugi — tình trạng, khe hở điện cực',
        'Kiểm tra & vệ sinh hệ thống phanh — xi lanh, ống dầu',
        'Kiểm tra dầu trợ lực tay lái',
        'Kiểm tra dầu hộp số tự động',
        'Kiểm tra ắc quy 12V — thay nếu cần',
        'Kiểm tra hệ thống khởi động & sạc',
        'Kiểm tra cảm biến Oxy (O2 sensor)',
        'Cập nhật phần mềm ECU / hệ thống thông tin giải trí nếu có',
      ],
    },
    {
      name: 'Cấp 3 — 20.000 km',
      intervalKm: 20000,
      description: 'Bảo dưỡng định kỳ cấp 3 mỗi 20.000 km hoặc 24 tháng',
      tasks: [
        'Thực hiện toàn bộ hạng mục Cấp 1 & Cấp 2',
        'Thay bugi',
        'Thay dầu phanh',
        'Thay dầu hộp số tự động',
        'Kiểm tra & thay má phanh nếu mòn dưới ngưỡng',
        'Kiểm tra đĩa phanh — độ dày, độ méo',
        'Kiểm tra hệ thống truyền động — cao su chắn bụi, khớp các đăng',
        'Kiểm tra hệ thống treo — lò xo, giảm chấn, cao su',
        'Kiểm tra rò rỉ hộp số, cầu xe',
        'Vệ sinh kim phun nhiên liệu',
        'Kiểm tra hệ thống xả & catalytic converter',
      ],
    },
    {
      name: 'Cấp 4 — 40.000 km',
      intervalKm: 40000,
      description: 'Bảo dưỡng định kỳ cấp 4 mỗi 40.000 km hoặc 48 tháng',
      tasks: [
        'Thực hiện toàn bộ hạng mục Cấp 1, 2 & 3',
        'Thay nước làm mát động cơ',
        'Thay dầu vi sai (nếu có)',
        'Kiểm tra & thay đai cam / đai dẫn động nếu cần',
        'Kiểm tra bơm nước làm mát',
        'Kiểm tra van hằng nhiệt (thermostat)',
        'Thay lốp nếu mòn hoặc quá 4 năm sử dụng',
        'Kiểm tra toàn diện hệ thống điện — cầu chì, relay',
        'Kiểm tra khung xe — hàn, han gỉ',
        'Đại bảo dưỡng tổng thể & lập biên bản kiểm tra',
      ],
    },
  ];

  for (const plan of maintenancePlans) {
    await prisma.maintenancePlan.upsert({
      where: { name: plan.name } as any,
      update: { intervalKm: plan.intervalKm, description: plan.description, tasks: plan.tasks },
      create: plan,
    });
  }
  console.log(`✅ ${maintenancePlans.length} maintenance plans upserted`);

  // ==================== SAMPLE DATA ====================

  // Lấy user IDs cần dùng
  const advisorUser = await prisma.user.findUnique({ where: { email: 'covan@xdv.vn' } });
  const adminUser   = await prisma.user.findUnique({ where: { email: 'admin@xdv.vn' } });
  const xuongUser   = await prisma.user.findUnique({ where: { email: 'quanlyxuong@xdv.vn' } });
  if (!advisorUser || !adminUser || !xuongUser) throw new Error('Seed users not found');

  const planCap1 = await prisma.maintenancePlan.findFirst({ where: { intervalKm: 5000 } });
  const planCap2 = await prisma.maintenancePlan.findFirst({ where: { intervalKm: 10000 } });
  const planCap3 = await prisma.maintenancePlan.findFirst({ where: { intervalKm: 20000 } });
  const planCap4 = await prisma.maintenancePlan.findFirst({ where: { intervalKm: 40000 } });
  if (!planCap1 || !planCap2 || !planCap3 || !planCap4) throw new Error('Maintenance plans not found');

  // 9. Xe mẫu VinFast
  const vehicleDataList = [
    // RG01 — Đội xe Rạch Giá (8 xe)
    { licensePlate: '68A-001.11', vin: 'VF9S1AADN4M100001', modelName: 'VF e34', yearMfg: 2022, currentOdo: 12500, branchCode: 'RG01', status: 'ACTIVE' },
    { licensePlate: '68A-002.22', vin: 'VF9S1AADN5M100002', modelName: 'VF 5',   yearMfg: 2023, currentOdo: 22300, branchCode: 'RG01', status: 'ACTIVE' },
    { licensePlate: '68A-003.33', vin: 'VF9S1AADN6M100003', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 8800,  branchCode: 'RG01', status: 'ACTIVE' },
    { licensePlate: '68A-004.44', vin: 'VF9S1AADN7M100004', modelName: 'VF e34', yearMfg: 2022, currentOdo: 45200, branchCode: 'RG01', status: 'ACTIVE' },
    { licensePlate: '68A-005.55', vin: 'VF9S1AADN8M100005', modelName: 'VF 8',   yearMfg: 2023, currentOdo: 5100,  branchCode: 'RG01', status: 'ACTIVE' },
    { licensePlate: '68A-006.66', vin: 'VF9S1AADN9M100006', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 15400, branchCode: 'RG01', status: 'ACTIVE' },
    { licensePlate: '68A-007.77', vin: 'VF9S1AADNAM100007', modelName: 'VF 5',   yearMfg: 2023, currentOdo: 3200,  branchCode: 'RG01', status: 'IN_WORKSHOP' },
    { licensePlate: '68A-008.88', vin: 'VF9S1AADN0M100008', modelName: 'VF 9',   yearMfg: 2022, currentOdo: 31500, branchCode: 'RG01', status: 'ACTIVE' },
    // AG01 — Đội xe An Giang (4 xe)
    { licensePlate: '67A-001.11', vin: 'VF9S1AADN1M200001', modelName: 'VF 5',   yearMfg: 2023, currentOdo: 18100, branchCode: 'AG01', status: 'ACTIVE' },
    { licensePlate: '67A-002.22', vin: 'VF9S1AADN2M200002', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 9600,  branchCode: 'AG01', status: 'ACTIVE' },
    { licensePlate: '67A-003.33', vin: 'VF9S1AADN3M200003', modelName: 'VF e34', yearMfg: 2022, currentOdo: 26000, branchCode: 'AG01', status: 'ACTIVE' },
    { licensePlate: '67A-004.44', vin: 'VF9S1AADN4M200004', modelName: 'VF 8',   yearMfg: 2023, currentOdo: 11200, branchCode: 'AG01', status: 'ACTIVE' },
    // CT01 — Đội xe Cần Thơ (4 xe)
    { licensePlate: '65A-001.11', vin: 'VF9S1AADN1M300001', modelName: 'VF 8',   yearMfg: 2022, currentOdo: 38500, branchCode: 'CT01', status: 'ACTIVE' },
    { licensePlate: '65A-002.22', vin: 'VF9S1AADN2M300002', modelName: 'VF 9',   yearMfg: 2022, currentOdo: 17800, branchCode: 'CT01', status: 'ACTIVE' },
    { licensePlate: '65A-003.33', vin: 'VF9S1AADN3M300003', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 6900,  branchCode: 'CT01', status: 'ACTIVE' },
    { licensePlate: '65A-004.44', vin: 'VF9S1AADN4M300004', modelName: 'VF 5',   yearMfg: 2024, currentOdo: 3500,  branchCode: 'CT01', status: 'ACTIVE' },
    // VL01 — Đội xe Vĩnh Long (3 xe)
    { licensePlate: '64A-001.11', vin: 'VF9S1AADN1M400001', modelName: 'VF e34', yearMfg: 2023, currentOdo: 14200, branchCode: 'VL01', status: 'ACTIVE' },
    { licensePlate: '64A-002.22', vin: 'VF9S1AADN2M400002', modelName: 'VF 5',   yearMfg: 2024, currentOdo: 7800,  branchCode: 'VL01', status: 'ACTIVE' },
    { licensePlate: '64A-003.33', vin: 'VF9S1AADN3M400003', modelName: 'VF 6',   yearMfg: 2024, currentOdo: 4100,  branchCode: 'VL01', status: 'ACTIVE' },
    // BL01 — Đội xe Bạc Liêu (3 xe)
    { licensePlate: '94A-001.11', vin: 'VF9S1AADN1M500001', modelName: 'VF 5',   yearMfg: 2024, currentOdo: 8900,  branchCode: 'BL01', status: 'ACTIVE' },
    { licensePlate: '94A-002.22', vin: 'VF9S1AADN2M500002', modelName: 'VF e34', yearMfg: 2023, currentOdo: 19500, branchCode: 'BL01', status: 'ACTIVE' },
    { licensePlate: '94A-003.33', vin: 'VF9S1AADN3M500003', modelName: 'VF 8',   yearMfg: 2023, currentOdo: 12300, branchCode: 'BL01', status: 'ACTIVE' },
  ];

  const createdVehicles: any[] = [];
  for (const vd of vehicleDataList) {
    const model  = createdModels.find((m) => m.name === vd.modelName);
    const branch = createdBranches.find((b) => b.code === vd.branchCode);
    const v = await prisma.vehicle.upsert({
      where: { licensePlate: vd.licensePlate },
      update: { currentOdo: vd.currentOdo, status: vd.status as any },
      create: {
        licensePlate: vd.licensePlate,
        vin: vd.vin,
        modelId: model!.id,
        yearMfg: vd.yearMfg,
        currentOdo: vd.currentOdo,
        status: vd.status as any,
        branchId: branch!.id,
      },
    });
    createdVehicles.push(v);
  }
  console.log(`✅ ${createdVehicles.length} vehicles upserted`);

  // Lấy xe theo biển
  const vByPlate = (plate: string) => createdVehicles.find((v) => v.licensePlate === plate)!;

  // 10. ODO logs mẫu
  const odoLogs = [
    { licensePlate: '68A-001.11', logs: [7000, 10000, 12500] },
    { licensePlate: '68A-002.22', logs: [5000, 10000, 15000, 22300] },
    { licensePlate: '68A-004.44', logs: [10000, 20000, 30000, 40000, 45200] },
    { licensePlate: '68A-008.88', logs: [10000, 20000, 31500] },
    { licensePlate: '65A-001.11', logs: [10000, 20000, 30000, 38500] },
    { licensePlate: '94A-002.22', logs: [5000, 10000, 15000, 19500] },
  ];
  for (const entry of odoLogs) {
    const vehicle = vByPlate(entry.licensePlate);
    let prev = 0;
    for (const odo of entry.logs) {
      const exists = await prisma.vehicleOdoLog.findFirst({
        where: { vehicleId: vehicle.id, odo },
      });
      if (!exists) {
        await prisma.vehicleOdoLog.create({
          data: {
            vehicleId: vehicle.id,
            odo,
            previousOdo: prev,
            delta: odo - prev,
            source: 'manual',
            userId: adminUser.id,
            recordedAt: new Date(Date.now() - (entry.logs[entry.logs.length - 1] - odo) * 3600000),
          },
        });
      }
      prev = odo;
    }
  }
  console.log('✅ ODO logs created');

  // 11. Workshop Jobs mẫu
  const jobDefs = [
    {
      code: 'WS-2025-000001',
      licensePlate: '68A-007.77',
      branchCode: 'XW01',
      odoAtEntry: 3200,
      entryReason: 'Bảo dưỡng định kỳ Cấp 1',
      status: 'IN_PROGRESS' as const,
      planId: planCap1.id,
    },
    {
      code: 'WS-2025-000002',
      licensePlate: '68A-002.22',
      branchCode: 'XW01',
      odoAtEntry: 20000,
      entryReason: 'Bảo dưỡng định kỳ Cấp 3 — 20.000 km',
      status: 'COMPLETED' as const,
      planId: planCap3.id,
    },
    {
      code: 'WS-2025-000003',
      licensePlate: '68A-004.44',
      branchCode: 'XW01',
      odoAtEntry: 40000,
      entryReason: 'Bảo dưỡng định kỳ Cấp 4 — 40.000 km',
      status: 'DELIVERED' as const,
      planId: planCap4.id,
    },
    {
      code: 'WS-2025-000004',
      licensePlate: '67A-003.33',
      branchCode: 'XW01',
      odoAtEntry: 25800,
      entryReason: 'Xe rung lắc khi phanh, kiểm tra má phanh',
      status: 'RECEIVED' as const,
      planId: null,
    },
    {
      code: 'WS-2025-000005',
      licensePlate: '65A-001.11',
      branchCode: 'XW01',
      odoAtEntry: 38000,
      entryReason: 'Bảo dưỡng định kỳ Cấp 4 — kiểm tra đai cam',
      status: 'QUOTED' as const,
      planId: planCap4.id,
    },
    {
      code: 'WS-2025-000006',
      licensePlate: '94A-002.22',
      branchCode: 'XW01',
      odoAtEntry: 19500,
      entryReason: 'Bảo dưỡng định kỳ Cấp 3 — 20.000 km',
      status: 'DELIVERED' as const,
      planId: planCap3.id,
    },
  ];

  const createdJobs: any[] = [];
  for (const jd of jobDefs) {
    const vehicle = vByPlate(jd.licensePlate);
    const branch  = createdBranches.find((b) => b.code === jd.branchCode)!;
    const existing = await prisma.workshopJob.findUnique({ where: { code: jd.code } });
    if (!existing) {
      const job = await prisma.workshopJob.create({
        data: {
          code: jd.code,
          vehicleId: vehicle.id,
          branchId: branch.id,
          planId: jd.planId || null,
          odoAtEntry: jd.odoAtEntry,
          entryReason: jd.entryReason,
          status: jd.status,
          advisorId: advisorUser.id,
          jobType: 'REPAIR',
          completedAt: ['COMPLETED', 'DELIVERED'].includes(jd.status) ? new Date() : null,
          deliveredAt: jd.status === 'DELIVERED' ? new Date() : null,
        },
      });
      createdJobs.push(job);
    } else {
      createdJobs.push(existing);
    }
  }
  console.log(`✅ ${createdJobs.length} workshop jobs created`);

  // 12. Repair Orders cho job đã COMPLETED / DELIVERED
  const completedJobs = createdJobs.filter((j) =>
    ['COMPLETED', 'DELIVERED'].includes(j.status),
  );
  const roDefs = [
    {
      jobCode: 'WS-2025-000002',
      code: 'RO-2025-000001',
      odo: 20000,
      description: 'Bảo dưỡng Cấp 3 — thay dầu, lọc gió, bugi, dầu phanh',
      items: [
        { type: 'LABOR', description: 'Công bảo dưỡng Cấp 3', quantity: 1, unitPrice: 500000 },
        { type: 'PART',  description: 'Dầu động cơ 5W-30 (4L)',   quantity: 1, unitPrice: 350000 },
        { type: 'PART',  description: 'Lọc dầu động cơ',          quantity: 1, unitPrice: 85000  },
        { type: 'PART',  description: 'Lọc gió động cơ',          quantity: 1, unitPrice: 120000 },
        { type: 'PART',  description: 'Bugi (bộ 4)',              quantity: 1, unitPrice: 480000 },
        { type: 'PART',  description: 'Dầu phanh DOT 4',          quantity: 1, unitPrice: 95000  },
      ],
    },
    {
      jobCode: 'WS-2025-000003',
      code: 'RO-2025-000002',
      odo: 40000,
      description: 'Bảo dưỡng Cấp 4 — đại bảo dưỡng tổng thể',
      items: [
        { type: 'LABOR', description: 'Công đại bảo dưỡng Cấp 4', quantity: 1, unitPrice: 900000 },
        { type: 'PART',  description: 'Dầu động cơ 5W-30 (4L)',    quantity: 1, unitPrice: 350000 },
        { type: 'PART',  description: 'Lọc dầu động cơ',           quantity: 1, unitPrice: 85000  },
        { type: 'PART',  description: 'Nước làm mát',              quantity: 2, unitPrice: 120000 },
        { type: 'PART',  description: 'Dầu vi sai',                quantity: 1, unitPrice: 280000 },
        { type: 'PART',  description: 'Lọc gió điều hòa cabin',    quantity: 1, unitPrice: 95000  },
      ],
    },
  ];

  for (const rod of roDefs) {
    const existing = await prisma.repairOrder.findUnique({ where: { code: rod.code } });
    if (existing) continue;
    const job = createdJobs.find((j) => j.code === rod.jobCode);
    if (!job) continue;
    const laborTotal = rod.items.filter((i) => i.type === 'LABOR').reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const partsTotal = rod.items.filter((i) => i.type === 'PART').reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    await prisma.repairOrder.create({
      data: {
        code: rod.code,
        jobId: job.id,
        odo: rod.odo,
        description: rod.description,
        laborCost: laborTotal,
        partsCost: partsTotal,
        totalCost: laborTotal + partsTotal,
        status: 'COMPLETED',
        closedAt: new Date(),
        createdById: advisorUser.id,
        items: {
          create: rod.items.map((item) => ({
            type: item.type as any,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
    });
  }
  console.log('✅ Repair orders created');

  // 13. Maintenance Records — lịch sử đã BD (để getDueVehicles hoạt động đúng)
  const maintenanceRecordDefs = [
    // 68A-002.22 — đã BD Cấp 1 tại 5k, Cấp 2 tại 10k, Cấp 1 tại 15k; còn thiếu BD Cấp 1 tại 20k → hiện OVERDUE
    { licensePlate: '68A-002.22', planId: planCap1.id, odoAtService: 5000,  nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '68A-002.22', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    { licensePlate: '68A-002.22', planId: planCap1.id, odoAtService: 15000, nextDueOdo: 20000, status: 'COMPLETED' },
    // 68A-004.44 — đã BD Cấp 4 tại 40k (từ job WS-2025-000003)
    { licensePlate: '68A-004.44', planId: planCap4.id, odoAtService: 40000, nextDueOdo: 80000, status: 'COMPLETED' },
    // 68A-001.11 — đã BD Cấp 2 tại 10k, sắp đến Cấp 1 tại 15k (còn 2500)
    { licensePlate: '68A-001.11', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    // 65A-001.11 — đã BD tại 30k, sắp đến Cấp 4 tại 40k (còn 1500)
    { licensePlate: '65A-001.11', planId: planCap1.id, odoAtService: 30000, nextDueOdo: 35000, status: 'COMPLETED' },
    { licensePlate: '65A-001.11', planId: planCap3.id, odoAtService: 20000, nextDueOdo: 40000, status: 'COMPLETED' },
    // 67A-003.33 — đã BD Cấp 1 tại 25k
    { licensePlate: '67A-003.33', planId: planCap1.id, odoAtService: 25000, nextDueOdo: 30000, status: 'COMPLETED' },
    // 94A-002.22 — đã BD Cấp 2 tại 10k, Cấp 1 tại 15k
    { licensePlate: '94A-002.22', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    { licensePlate: '94A-002.22', planId: planCap1.id, odoAtService: 15000, nextDueOdo: 20000, status: 'COMPLETED' },
  ];

  for (const mrd of maintenanceRecordDefs) {
    const vehicle = vByPlate(mrd.licensePlate);
    const exists = await prisma.maintenanceRecord.findFirst({
      where: { vehicleId: vehicle.id, planId: mrd.planId, odoAtService: mrd.odoAtService },
    });
    if (!exists) {
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: vehicle.id,
          planId: mrd.planId,
          odoAtService: mrd.odoAtService,
          nextDueOdo: mrd.nextDueOdo,
          status: mrd.status as any,
          serviceDate: new Date(Date.now() - (mrd.nextDueOdo - mrd.odoAtService) * 3600 * 1000),
          cost: mrd.odoAtService <= 10000 ? 630000 : mrd.odoAtService <= 20000 ? 1630000 : 2800000,
        },
      });
    }
  }
  console.log('✅ Maintenance records created');

  // 14. Fleet Costs
  const costDefs = [
    { licensePlate: '68A-001.11', category: 'ELECTRICITY', amount: 850000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '68A-002.22', category: 'ELECTRICITY', amount: 920000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '68A-003.33', category: 'TIRE',        amount: 3200000, description: 'Thay 2 lốp trước',       costDate: new Date('2025-04-10') },
    { licensePlate: '68A-004.44', category: 'MAINTENANCE', amount: 2800000, description: 'Đại bảo dưỡng Cấp 4',    costDate: new Date('2025-05-20') },
    { licensePlate: '68A-005.55', category: 'INSURANCE',   amount: 8500000, description: 'Bảo hiểm xe 2025',       costDate: new Date('2025-01-05') },
    { licensePlate: '68A-006.66', category: 'ELECTRICITY', amount: 780000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '68A-008.88', category: 'ELECTRICITY', amount: 1100000, description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '67A-001.11', category: 'ELECTRICITY', amount: 860000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '67A-002.22', category: 'BRAKE',       amount: 1500000, description: 'Thay má phanh 4 bánh',   costDate: new Date('2025-03-22') },
    { licensePlate: '67A-003.33', category: 'MAINTENANCE', amount: 1630000, description: 'Bảo dưỡng Cấp 3',        costDate: new Date('2025-02-14') },
    { licensePlate: '65A-001.11', category: 'ELECTRICITY', amount: 950000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '65A-001.11', category: 'TIRE',        amount: 6400000, description: 'Thay 4 lốp đồng bộ',     costDate: new Date('2025-04-05') },
    { licensePlate: '65A-002.22', category: 'ELECTRICITY', amount: 870000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '68A-001.11', category: 'ELECTRICITY', amount: 830000,  description: 'Sạc điện tháng 6/2025',  costDate: new Date('2025-06-01') },
    { licensePlate: '68A-002.22', category: 'ELECTRICITY', amount: 890000,  description: 'Sạc điện tháng 6/2025',  costDate: new Date('2025-06-01') },
    { licensePlate: '68A-004.44', category: 'ACCIDENT',    amount: 4500000, description: 'Sửa cản trước do va chạm nhẹ', costDate: new Date('2025-05-28') },
    { licensePlate: '94A-001.11', category: 'ELECTRICITY', amount: 750000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '94A-003.33', category: 'INSURANCE',   amount: 8500000, description: 'Bảo hiểm xe 2025',       costDate: new Date('2025-01-10') },
    { licensePlate: '64A-001.11', category: 'ELECTRICITY', amount: 810000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
  ];

  for (const cd of costDefs) {
    const vehicle = vByPlate(cd.licensePlate);
    const exists = await prisma.fleetCost.findFirst({
      where: { vehicleId: vehicle.id, category: cd.category as any, costDate: cd.costDate },
    });
    if (!exists) {
      await prisma.fleetCost.create({
        data: {
          vehicleId: vehicle.id,
          category: cd.category as any,
          amount: cd.amount,
          description: cd.description,
          costDate: cd.costDate,
          userId: adminUser.id,
        },
      });
    }
  }
  console.log(`✅ ${costDefs.length} fleet costs created`);

  // 15. Fleet Incidents
  const incidentDefs = [
    {
      code: 'INC-2025-000001',
      licensePlate: '68A-004.44',
      description: 'Va chạm nhẹ tại ngã tư Nguyễn Trung Trực — 3/2, Rạch Giá. Cản trước bị trầy xước',
      status: 'RESOLVED',
      priority: 'MEDIUM',
    },
    {
      code: 'INC-2025-000002',
      licensePlate: '67A-003.33',
      description: 'Xe bị xịt lốp trên QL91 đoạn Long Xuyên, đã thay lốp dự phòng tại chỗ',
      status: 'RESOLVED',
      priority: 'LOW',
    },
    {
      code: 'INC-2025-000003',
      licensePlate: '68A-006.66',
      description: 'Màn hình trung tâm không nhận cảm ứng, đang chờ linh kiện từ VinFast',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
    },
    {
      code: 'INC-2025-000004',
      licensePlate: '65A-001.11',
      description: 'Tiếng kêu bất thường từ hệ thống treo trước khi đi qua ổ gà trên đường Nguyễn Văn Linh, Cần Thơ',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
    {
      code: 'INC-2025-000005',
      licensePlate: '94A-001.11',
      description: 'Đèn cảnh báo pin sáng liên tục, nghi lỗi cell pin. Xe đã tạm dừng hoạt động',
      status: 'NEW',
      priority: 'CRITICAL',
    },
    {
      code: 'INC-2025-000006',
      licensePlate: '64A-002.22',
      description: 'Gương chiếu hậu bên trái bị gãy do va quẹt khi đậu xe',
      status: 'ACKNOWLEDGED',
      priority: 'LOW',
    },
  ];

  for (const ind of incidentDefs) {
    const vehicle = vByPlate(ind.licensePlate);
    const exists  = await prisma.fleetIncident.findUnique({ where: { code: ind.code } });
    if (!exists) {
      await prisma.fleetIncident.create({
        data: {
          code: ind.code,
          vehicleId: vehicle.id,
          reporterId: adminUser.id,
          description: ind.description,
          status: ind.status as any,
          priority: ind.priority as any,
          resolvedAt: ind.status === 'RESOLVED' ? new Date() : null,
        },
      });
    }
  }
  console.log(`✅ ${incidentDefs.length} fleet incidents created`);

  // 16. Part Transfer Batches (logbook linh kiện giữa xe)
  const ptbDefs = [
    {
      code: 'PTB-2025-000001',
      status: 'APPROVED',
      note: 'Điều chuyển lốp dự phòng từ xe Rạch Giá sang xe đang sửa',
      lines: [
        {
          fromPlate: '68A-005.55',
          toPlate: '68A-007.77',
          itemDescription: 'Lốp dự phòng 215/55R17',
          quantity: 1,
        },
      ],
    },
    {
      code: 'PTB-2025-000002',
      status: 'APPROVED',
      note: 'Chuyển kích và dụng cụ thay lốp sang chi nhánh An Giang',
      lines: [
        {
          fromPlate: '68A-008.88',
          toPlate: '67A-001.11',
          itemDescription: 'Kích nâng xe thủy lực mini',
          quantity: 1,
        },
        {
          fromPlate: '68A-008.88',
          toPlate: '67A-001.11',
          itemDescription: 'Bộ cờ lê mở bulong bánh xe',
          quantity: 1,
        },
      ],
    },
  ];

  for (const ptb of ptbDefs) {
    const exists = await prisma.partTransferBatch.findUnique({ where: { code: ptb.code } });
    if (!exists) {
      await prisma.partTransferBatch.create({
        data: {
          code: ptb.code,
          status: ptb.status as any,
          note: ptb.note,
          createdById: advisorUser.id,
          approvedById: xuongUser.id,
          approvedAt: new Date(),
          lines: {
            create: ptb.lines.map((line) => ({
              itemDescription: line.itemDescription,
              fromVehicleId: vByPlate(line.fromPlate).id,
              toVehicleId: vByPlate(line.toPlate).id,
              quantity: line.quantity,
            })),
          },
        },
      });
    }
  }
  console.log(`✅ ${ptbDefs.length} part transfer batches created`);

  // 17. Parts (phụ tùng tồn kho)
  const partDefs = [
    { code: 'PT-001', name: 'Dầu động cơ 5W-30 (4L)', categoryCode: 'OTHER', unit: 'bình', costPrice: 280000, sellPrice: 350000, supplier: 'VinFast' },
    { code: 'PT-002', name: 'Lọc dầu động cơ', categoryCode: 'OTHER', unit: 'cái', costPrice: 65000, sellPrice: 85000, supplier: 'VinFast' },
    { code: 'PT-003', name: 'Lọc gió động cơ', categoryCode: 'OTHER', unit: 'cái', costPrice: 90000, sellPrice: 120000, supplier: 'VinFast' },
    { code: 'PT-004', name: 'Lọc gió điều hòa cabin', categoryCode: 'OTHER', unit: 'cái', costPrice: 70000, sellPrice: 95000, supplier: 'VinFast' },
    { code: 'PT-005', name: 'Bugi (bộ 4)', categoryCode: 'ELECTRICAL', unit: 'bộ', costPrice: 380000, sellPrice: 480000, supplier: 'NGK' },
    { code: 'PT-006', name: 'Dầu phanh DOT 4 (1L)', categoryCode: 'BRAKE', unit: 'chai', costPrice: 75000, sellPrice: 95000, supplier: 'Bosch' },
    { code: 'PT-007', name: 'Má phanh trước (bộ)', categoryCode: 'BRAKE', unit: 'bộ', costPrice: 450000, sellPrice: 600000, supplier: 'Brembo' },
    { code: 'PT-008', name: 'Má phanh sau (bộ)', categoryCode: 'BRAKE', unit: 'bộ', costPrice: 380000, sellPrice: 500000, supplier: 'Brembo' },
    { code: 'PT-009', name: 'Lốp 215/55R17', categoryCode: 'TIRE', unit: 'cái', costPrice: 1800000, sellPrice: 2200000, supplier: 'Michelin' },
    { code: 'PT-010', name: 'Nước làm mát (4L)', categoryCode: 'OTHER', unit: 'bình', costPrice: 90000, sellPrice: 120000, supplier: 'VinFast' },
    { code: 'PT-011', name: 'Chổi gạt nước (bộ)', categoryCode: 'BODY', unit: 'bộ', costPrice: 180000, sellPrice: 250000, supplier: 'Bosch' },
    { code: 'PT-012', name: 'Ắc quy 12V 60Ah', categoryCode: 'BATTERY', unit: 'cái', costPrice: 1500000, sellPrice: 1900000, supplier: 'GS' },
    { code: 'PT-013', name: 'Giảm chấn trước (cái)', categoryCode: 'SUSPENSION', unit: 'cái', costPrice: 2200000, sellPrice: 2800000, supplier: 'KYB' },
    { code: 'PT-014', name: 'Giảm chấn sau (cái)', categoryCode: 'SUSPENSION', unit: 'cái', costPrice: 1800000, sellPrice: 2300000, supplier: 'KYB' },
    { code: 'PT-015', name: 'Dầu hộp số tự động (4L)', categoryCode: 'OTHER', unit: 'bình', costPrice: 450000, sellPrice: 580000, supplier: 'VinFast' },
    { code: 'PT-016', name: 'Đèn pha LED (bên trái)', categoryCode: 'ELECTRICAL', unit: 'cái', costPrice: 3500000, sellPrice: 4500000, supplier: 'VinFast' },
    { code: 'PT-017', name: 'Đèn pha LED (bên phải)', categoryCode: 'ELECTRICAL', unit: 'cái', costPrice: 3500000, sellPrice: 4500000, supplier: 'VinFast' },
    { code: 'PT-018', name: 'Gương chiếu hậu trái', categoryCode: 'BODY', unit: 'cái', costPrice: 1200000, sellPrice: 1600000, supplier: 'VinFast' },
    { code: 'PT-019', name: 'Gương chiếu hậu phải', categoryCode: 'BODY', unit: 'cái', costPrice: 1200000, sellPrice: 1600000, supplier: 'VinFast' },
    { code: 'PT-020', name: 'Bộ côn ly (clutch kit)', categoryCode: 'OTHER', unit: 'bộ', costPrice: 3800000, sellPrice: 4800000, supplier: 'VinFast' },
  ];

  const partCategories2 = await prisma.partCategory.findMany();
  for (const pd of partDefs) {
    const cat = partCategories2.find((c) => c.code === pd.categoryCode);
    await prisma.part.upsert({
      where: { code: pd.code },
      update: {},
      create: {
        code: pd.code,
        name: pd.name,
        categoryId: cat!.id,
        unit: pd.unit,
        costPrice: pd.costPrice,
        sellPrice: pd.sellPrice,
        supplier: pd.supplier,
      },
    });
  }
  console.log(`✅ ${partDefs.length} parts created`);

  // 18. Part Stocks (tồn kho tại xưởng)
  const createdParts = await prisma.part.findMany();
  const workshopBranch = createdBranches.find((b) => b.code === 'XW01')!;
  for (const part of createdParts) {
    const qty = Math.floor(Math.random() * 20) + 2;
    await prisma.partStock.upsert({
      where: { partId_branchId: { partId: part.id, branchId: workshopBranch.id } },
      update: {},
      create: {
        partId: part.id,
        branchId: workshopBranch.id,
        quantity: qty,
      },
    });
  }
  console.log(`✅ Part stocks created for ${createdParts.length} parts`);

  // 19. Technicians
  const ktvUser = await prisma.user.findUnique({ where: { email: 'kythuatvien@xdv.vn' } });
  if (ktvUser) {
    await prisma.technician.upsert({
      where: { userId: ktvUser.id },
      update: {},
      create: {
        userId: ktvUser.id,
        title: 'Kỹ thuật viên chính',
        skillLevel: 4,
        specialty: 'Hệ thống điện & pin',
        branchId: workshopBranch.id,
      },
    });
  }
  // Thêm KTV từ user KTV đội xe
  const ktvDoiXeUser = await prisma.user.findUnique({ where: { email: 'ktvdoixe@xdv.vn' } });
  const rgBranch = createdBranches.find((b) => b.code === 'RG01')!;
  if (ktvDoiXeUser) {
    await prisma.technician.upsert({
      where: { userId: ktvDoiXeUser.id },
      update: {},
      create: {
        userId: ktvDoiXeUser.id,
        title: 'KTV bảo dưỡng đội xe',
        skillLevel: 3,
        specialty: 'Bảo dưỡng định kỳ & lốp',
        branchId: rgBranch.id,
      },
    });
  }
  console.log('✅ Technicians created');

  // 20. Thêm nhiều Workshop Jobs hơn (nhiều trạng thái khác nhau)
  const extraJobDefs = [
    { code: 'WS-2025-000007', licensePlate: '68A-001.11', odoAtEntry: 12500, entryReason: 'Kiểm tra tiếng ồn hệ thống treo trước', status: 'DIAGNOSING' as const, planId: null },
    { code: 'WS-2025-000008', licensePlate: '67A-001.11', odoAtEntry: 18000, entryReason: 'Bảo dưỡng định kỳ Cấp 2 — 10.000 km (đã trễ)', status: 'APPROVED' as const, planId: planCap2.id },
    { code: 'WS-2025-000009', licensePlate: '65A-002.22', odoAtEntry: 17800, entryReason: 'Thay má phanh trước + sau, kiểm tra đĩa phanh', status: 'WAITING_PARTS' as const, planId: null },
    { code: 'WS-2025-000010', licensePlate: '68A-003.33', odoAtEntry: 8800, entryReason: 'Cập nhật phần mềm ECU + kiểm tra hệ thống sạc', status: 'COMPLETED' as const, planId: null },
    { code: 'WS-2025-000011', licensePlate: '94A-003.33', odoAtEntry: 12300, entryReason: 'Bảo dưỡng Cấp 2 — thay lọc gió + bugi', status: 'QUALITY_CHECK' as const, planId: planCap2.id },
    { code: 'WS-2025-000012', licensePlate: '64A-001.11', odoAtEntry: 14200, entryReason: 'Xe bị rung tay lái khi chạy > 80km/h, cân bằng động', status: 'DELIVERED' as const, planId: null },
    { code: 'WS-2025-000013', licensePlate: '68A-006.66', odoAtEntry: 15400, entryReason: 'Thay màn hình trung tâm (bảo hành VinFast)', status: 'IN_PROGRESS' as const, planId: null },
    { code: 'WS-2025-000014', licensePlate: '67A-004.44', odoAtEntry: 11200, entryReason: 'Bảo dưỡng Cấp 2 + kiểm tra pin EV', status: 'RECEIVED' as const, planId: planCap2.id },
  ];

  for (const jd of extraJobDefs) {
    const vehicle = vByPlate(jd.licensePlate);
    const existing = await prisma.workshopJob.findUnique({ where: { code: jd.code } });
    if (!existing) {
      await prisma.workshopJob.create({
        data: {
          code: jd.code,
          vehicleId: vehicle.id,
          branchId: workshopBranch.id,
          planId: jd.planId || null,
          odoAtEntry: jd.odoAtEntry,
          entryReason: jd.entryReason,
          status: jd.status,
          advisorId: advisorUser.id,
          technicianId: ktvUser ? (await prisma.technician.findUnique({ where: { userId: ktvUser.id } }))?.id : undefined,
          jobType: jd.planId ? 'MAINTENANCE' : 'REPAIR',
          completedAt: ['COMPLETED', 'DELIVERED'].includes(jd.status) ? new Date() : null,
          deliveredAt: jd.status === 'DELIVERED' ? new Date() : null,
        },
      });
    }
  }
  console.log(`✅ ${extraJobDefs.length} extra workshop jobs created`);

  // 21. Thêm nhiều Fleet Costs cho báo cáo
  const extraCosts = [
    { licensePlate: '68A-001.11', category: 'ELECTRICITY', amount: 790000,  description: 'Sạc điện tháng 4/2025', costDate: new Date('2025-04-15') },
    { licensePlate: '68A-001.11', category: 'ELECTRICITY', amount: 810000,  description: 'Sạc điện tháng 3/2025', costDate: new Date('2025-03-15') },
    { licensePlate: '68A-002.22', category: 'ELECTRICITY', amount: 880000,  description: 'Sạc điện tháng 4/2025', costDate: new Date('2025-04-15') },
    { licensePlate: '68A-002.22', category: 'ELECTRICITY', amount: 850000,  description: 'Sạc điện tháng 3/2025', costDate: new Date('2025-03-15') },
    { licensePlate: '67A-001.11', category: 'ELECTRICITY', amount: 820000,  description: 'Sạc điện tháng 4/2025', costDate: new Date('2025-04-15') },
    { licensePlate: '67A-001.11', category: 'ELECTRICITY', amount: 790000,  description: 'Sạc điện tháng 3/2025', costDate: new Date('2025-03-15') },
    { licensePlate: '65A-001.11', category: 'ELECTRICITY', amount: 920000,  description: 'Sạc điện tháng 4/2025', costDate: new Date('2025-04-15') },
    { licensePlate: '65A-001.11', category: 'ELECTRICITY', amount: 880000,  description: 'Sạc điện tháng 3/2025', costDate: new Date('2025-03-15') },
    { licensePlate: '65A-003.33', category: 'ELECTRICITY', amount: 680000,  description: 'Sạc điện tháng 5/2025', costDate: new Date('2025-05-15') },
    { licensePlate: '64A-001.11', category: 'ELECTRICITY', amount: 780000,  description: 'Sạc điện tháng 4/2025', costDate: new Date('2025-04-15') },
    { licensePlate: '94A-001.11', category: 'ELECTRICITY', amount: 720000,  description: 'Sạc điện tháng 4/2025', costDate: new Date('2025-04-15') },
    { licensePlate: '94A-002.22', category: 'ELECTRICITY', amount: 830000,  description: 'Sạc điện tháng 5/2025', costDate: new Date('2025-05-15') },
    { licensePlate: '68A-003.33', category: 'INSURANCE',   amount: 8500000, description: 'Bảo hiểm xe 2025',      costDate: new Date('2025-01-08') },
    { licensePlate: '67A-003.33', category: 'INSURANCE',   amount: 8500000, description: 'Bảo hiểm xe 2025',      costDate: new Date('2025-01-12') },
    { licensePlate: '65A-001.11', category: 'INSURANCE',   amount: 9200000, description: 'Bảo hiểm xe 2025',      costDate: new Date('2025-01-03') },
    { licensePlate: '68A-008.88', category: 'MAINTENANCE', amount: 1630000, description: 'Bảo dưỡng Cấp 3 (20k km)', costDate: new Date('2025-03-10') },
    { licensePlate: '67A-002.22', category: 'TIRE',        amount: 4400000, description: 'Thay 2 lốp sau',         costDate: new Date('2025-05-02') },
    { licensePlate: '68A-006.66', category: 'BODY',        amount: 2800000, description: 'Sơn lại cánh cửa phải (trầy)', costDate: new Date('2025-04-22') },
  ];

  for (const cd of extraCosts) {
    const vehicle = vByPlate(cd.licensePlate);
    const exists = await prisma.fleetCost.findFirst({
      where: { vehicleId: vehicle.id, category: cd.category as any, costDate: cd.costDate },
    });
    if (!exists) {
      await prisma.fleetCost.create({
        data: { vehicleId: vehicle.id, category: cd.category as any, amount: cd.amount, description: cd.description, costDate: cd.costDate, userId: adminUser.id },
      });
    }
  }
  console.log(`✅ ${extraCosts.length} extra fleet costs created`);

  // 22. Thêm Maintenance Records cho nhiều xe hơn
  const extraMaintRecords = [
    { licensePlate: '68A-003.33', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '68A-005.55', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'UPCOMING' },
    { licensePlate: '68A-006.66', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '68A-006.66', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    { licensePlate: '68A-006.66', planId: planCap1.id, odoAtService: 15000, nextDueOdo: 20000, status: 'DUE_SOON' },
    { licensePlate: '68A-008.88', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '68A-008.88', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    { licensePlate: '68A-008.88', planId: planCap3.id, odoAtService: 20000, nextDueOdo: 40000, status: 'COMPLETED' },
    { licensePlate: '68A-008.88', planId: planCap1.id, odoAtService: 30000, nextDueOdo: 35000, status: 'OVERDUE' },
    { licensePlate: '67A-001.11', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '67A-001.11', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'DUE_SOON' },
    { licensePlate: '94A-002.22', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '65A-002.22', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '65A-002.22', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'DUE_SOON' },
    { licensePlate: '64A-001.11', planId: planCap1.id, odoAtService: 5000, nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '64A-001.11', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'DUE_SOON' },
  ];

  for (const mrd of extraMaintRecords) {
    const vehicle = vByPlate(mrd.licensePlate);
    const exists = await prisma.maintenanceRecord.findFirst({
      where: { vehicleId: vehicle.id, planId: mrd.planId, odoAtService: mrd.odoAtService },
    });
    if (!exists) {
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: vehicle.id,
          planId: mrd.planId,
          odoAtService: mrd.odoAtService,
          nextDueOdo: mrd.nextDueOdo,
          status: mrd.status as any,
          serviceDate: mrd.status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 90 * 86400000) : null,
          cost: mrd.status === 'COMPLETED' ? (mrd.odoAtService <= 5000 ? 630000 : mrd.odoAtService <= 10000 ? 1200000 : 2800000) : null,
        },
      });
    }
  }
  console.log(`✅ ${extraMaintRecords.length} extra maintenance records created`);

  // 23. Thêm ODO logs cho các xe khác
  const extraOdoLogs = [
    { licensePlate: '68A-003.33', logs: [3000, 5000, 8800] },
    { licensePlate: '68A-005.55', logs: [2000, 5100] },
    { licensePlate: '68A-006.66', logs: [5000, 10000, 15400] },
    { licensePlate: '67A-001.11', logs: [5000, 10000, 15000, 18100] },
    { licensePlate: '67A-003.33', logs: [10000, 20000, 26000] },
    { licensePlate: '65A-002.22', logs: [5000, 10000, 17800] },
    { licensePlate: '64A-001.11', logs: [5000, 10000, 14200] },
    { licensePlate: '94A-001.11', logs: [5000, 8900] },
    { licensePlate: '94A-003.33', logs: [5000, 10000, 12300] },
  ];
  for (const entry of extraOdoLogs) {
    const vehicle = vByPlate(entry.licensePlate);
    let prev = 0;
    for (const odo of entry.logs) {
      const exists = await prisma.vehicleOdoLog.findFirst({ where: { vehicleId: vehicle.id, odo } });
      if (!exists) {
        await prisma.vehicleOdoLog.create({
          data: {
            vehicleId: vehicle.id, odo, previousOdo: prev, delta: odo - prev, source: 'manual', userId: adminUser.id,
            recordedAt: new Date(Date.now() - (entry.logs[entry.logs.length - 1] - odo) * 3600000),
          },
        });
      }
      prev = odo;
    }
  }
  console.log('✅ Extra ODO logs created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@xdv.vn');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
