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
    { name: 'Xưởng Trung tâm',              code: 'XW01', type: 'WORKSHOP' as const, address: '1 Phạm Hùng, Hà Nội',                phone: '0241000001' },
    { name: 'Đội xe Hà Nội - Cầu Giấy',     code: 'HN01', type: 'FLEET'    as const, address: '123 Cầu Giấy, Hà Nội',              phone: '0241001001' },
    { name: 'Đội xe Hà Nội - Long Biên',     code: 'HN02', type: 'FLEET'    as const, address: '456 Nguyễn Văn Cừ, Long Biên',      phone: '0241001002' },
    { name: 'Đội xe Hải Phòng',              code: 'HP01', type: 'FLEET'    as const, address: '789 Lạch Tray, Hải Phòng',          phone: '0225001001' },
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
    { email: 'quanlydoixe@xdv.vn', fullName: 'Hoàng Văn Đội Xe',  role: 'QUAN_LY_DOI_XE',  branch: 'HN01' },
    { email: 'ktvdoixe@xdv.vn',    fullName: 'Nguyễn Văn KTV Đội',role: 'KTV_DOI_XE',       branch: 'HN01' },
    { email: 'dieuhanh@xdv.vn',    fullName: 'Vũ Thị Điều Hành',  role: 'DIEU_HANH',        branch: 'HN01' },
    { email: 'taixe01@xdv.vn',     fullName: 'Đỗ Văn Tài Xế',     role: 'TAI_XE',           branch: 'HN01' },
    { email: 'taixe02@xdv.vn', fullName: 'Bùi Văn Lái', role: 'TAI_XE', branch: 'HN02' },
    { email: 'quanlyxuong2@xdv.vn', fullName: 'Ngô Văn Xưởng', role: 'QUAN_LY_XUONG', branch: 'HP01' },
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
    // HN01 — 8 xe
    { licensePlate: '30A-001.11', vin: 'VF9S1AADN4M100001', modelName: 'VF e34', yearMfg: 2022, currentOdo: 12500, branchCode: 'HN01', status: 'ACTIVE' },
    { licensePlate: '30A-002.22', vin: 'VF9S1AADN5M100002', modelName: 'VF 5',   yearMfg: 2023, currentOdo: 22300, branchCode: 'HN01', status: 'ACTIVE' },
    { licensePlate: '30A-003.33', vin: 'VF9S1AADN6M100003', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 8800,  branchCode: 'HN01', status: 'ACTIVE' },
    { licensePlate: '30A-004.44', vin: 'VF9S1AADN7M100004', modelName: 'VF e34', yearMfg: 2022, currentOdo: 45200, branchCode: 'HN01', status: 'ACTIVE' },
    { licensePlate: '30A-005.55', vin: 'VF9S1AADN8M100005', modelName: 'VF 8',   yearMfg: 2023, currentOdo: 5100,  branchCode: 'HN01', status: 'ACTIVE' },
    { licensePlate: '30A-006.66', vin: 'VF9S1AADN9M100006', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 15400, branchCode: 'HN01', status: 'ACTIVE' },
    { licensePlate: '30A-007.77', vin: 'VF9S1AADNAM100007', modelName: 'VF 5',   yearMfg: 2023, currentOdo: 3200,  branchCode: 'HN01', status: 'IN_WORKSHOP' },
    { licensePlate: '30A-008.88', vin: 'VF9S1AADN0M100008', modelName: 'VF 9',   yearMfg: 2022, currentOdo: 31500, branchCode: 'HN01', status: 'ACTIVE' },
    // HN02 — 4 xe
    { licensePlate: '29A-001.11', vin: 'VF9S1AADN1M200001', modelName: 'VF 5',   yearMfg: 2023, currentOdo: 18100, branchCode: 'HN02', status: 'ACTIVE' },
    { licensePlate: '29A-002.22', vin: 'VF9S1AADN2M200002', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 9600,  branchCode: 'HN02', status: 'ACTIVE' },
    { licensePlate: '29A-003.33', vin: 'VF9S1AADN3M200003', modelName: 'VF e34', yearMfg: 2022, currentOdo: 26000, branchCode: 'HN02', status: 'ACTIVE' },
    { licensePlate: '29A-004.44', vin: 'VF9S1AADN4M200004', modelName: 'VF 8',   yearMfg: 2023, currentOdo: 11200, branchCode: 'HN02', status: 'ACTIVE' },
    // HP01 — 3 xe
    { licensePlate: '15A-001.11', vin: 'VF9S1AADN1M300001', modelName: 'VF 8',   yearMfg: 2022, currentOdo: 38500, branchCode: 'HP01', status: 'ACTIVE' },
    { licensePlate: '15A-002.22', vin: 'VF9S1AADN2M300002', modelName: 'VF 9',   yearMfg: 2022, currentOdo: 17800, branchCode: 'HP01', status: 'ACTIVE' },
    { licensePlate: '15A-003.33', vin: 'VF9S1AADN3M300003', modelName: 'VF 6',   yearMfg: 2023, currentOdo: 6900,  branchCode: 'HP01', status: 'ACTIVE' },
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
    { licensePlate: '30A-001.11', logs: [7000, 10000, 12500] },
    { licensePlate: '30A-002.22', logs: [5000, 10000, 15000, 22300] },
    { licensePlate: '30A-004.44', logs: [10000, 20000, 30000, 40000, 45200] },
    { licensePlate: '30A-008.88', logs: [10000, 20000, 31500] },
    { licensePlate: '15A-001.11', logs: [10000, 20000, 30000, 38500] },
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
      licensePlate: '30A-007.77',
      branchCode: 'XW01',
      odoAtEntry: 3200,
      entryReason: 'Bảo dưỡng định kỳ Cấp 1',
      status: 'IN_PROGRESS' as const,
      planId: planCap1.id,
    },
    {
      code: 'WS-2025-000002',
      licensePlate: '30A-002.22',
      branchCode: 'XW01',
      odoAtEntry: 20000,
      entryReason: 'Bảo dưỡng định kỳ Cấp 3 — 20.000 km',
      status: 'COMPLETED' as const,
      planId: planCap3.id,
    },
    {
      code: 'WS-2025-000003',
      licensePlate: '30A-004.44',
      branchCode: 'XW01',
      odoAtEntry: 40000,
      entryReason: 'Bảo dưỡng định kỳ Cấp 4 — 40.000 km',
      status: 'DELIVERED' as const,
      planId: planCap4.id,
    },
    {
      code: 'WS-2025-000004',
      licensePlate: '29A-003.33',
      branchCode: 'XW01',
      odoAtEntry: 25800,
      entryReason: 'Xe rung lắc khi phanh, kiểm tra má phanh',
      status: 'RECEIVED' as const,
      planId: null,
    },
    {
      code: 'WS-2025-000005',
      licensePlate: '15A-001.11',
      branchCode: 'XW01',
      odoAtEntry: 38000,
      entryReason: 'Bảo dưỡng định kỳ Cấp 4 — kiểm tra đai cam',
      status: 'QUOTED' as const,
      planId: planCap4.id,
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
    // 30A-002.22 — đã BD Cấp 1 tại 5k, Cấp 2 tại 10k, Cấp 1 tại 15k; còn thiếu BD Cấp 1 tại 20k → hiện OVERDUE
    { licensePlate: '30A-002.22', planId: planCap1.id, odoAtService: 5000,  nextDueOdo: 10000, status: 'COMPLETED' },
    { licensePlate: '30A-002.22', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    { licensePlate: '30A-002.22', planId: planCap1.id, odoAtService: 15000, nextDueOdo: 20000, status: 'COMPLETED' },
    // 30A-004.44 — đã BD Cấp 4 tại 40k (từ job WS-2025-000003)
    { licensePlate: '30A-004.44', planId: planCap4.id, odoAtService: 40000, nextDueOdo: 80000, status: 'COMPLETED' },
    // 30A-001.11 — đã BD Cấp 2 tại 10k, sắp đến Cấp 1 tại 12500 (còn 2500)
    { licensePlate: '30A-001.11', planId: planCap2.id, odoAtService: 10000, nextDueOdo: 20000, status: 'COMPLETED' },
    // 15A-001.11 — đã BD tại 30k, sắp đến Cấp 4 tại 40k (còn 1500)
    { licensePlate: '15A-001.11', planId: planCap1.id, odoAtService: 30000, nextDueOdo: 35000, status: 'COMPLETED' },
    { licensePlate: '15A-001.11', planId: planCap3.id, odoAtService: 20000, nextDueOdo: 40000, status: 'COMPLETED' },
    // 29A-003.33 — đã BD Cấp 1 tại 25k
    { licensePlate: '29A-003.33', planId: planCap1.id, odoAtService: 25000, nextDueOdo: 30000, status: 'COMPLETED' },
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
    { licensePlate: '30A-001.11', category: 'ELECTRICITY', amount: 850000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '30A-002.22', category: 'ELECTRICITY', amount: 920000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '30A-003.33', category: 'TIRE',        amount: 3200000, description: 'Thay 2 lốp trước',       costDate: new Date('2025-04-10') },
    { licensePlate: '30A-004.44', category: 'MAINTENANCE', amount: 2800000, description: 'Đại bảo dưỡng Cấp 4',    costDate: new Date('2025-05-20') },
    { licensePlate: '30A-005.55', category: 'INSURANCE',   amount: 8500000, description: 'Bảo hiểm xe 2025',       costDate: new Date('2025-01-05') },
    { licensePlate: '30A-006.66', category: 'ELECTRICITY', amount: 780000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '30A-008.88', category: 'ELECTRICITY', amount: 1100000, description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '29A-001.11', category: 'ELECTRICITY', amount: 860000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '29A-002.22', category: 'BRAKE',       amount: 1500000, description: 'Thay má phanh 4 bánh',   costDate: new Date('2025-03-22') },
    { licensePlate: '29A-003.33', category: 'MAINTENANCE', amount: 1630000, description: 'Bảo dưỡng Cấp 3',        costDate: new Date('2025-02-14') },
    { licensePlate: '15A-001.11', category: 'ELECTRICITY', amount: 950000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '15A-001.11', category: 'TIRE',        amount: 6400000, description: 'Thay 4 lốp đồng bộ',     costDate: new Date('2025-04-05') },
    { licensePlate: '15A-002.22', category: 'ELECTRICITY', amount: 870000,  description: 'Sạc điện tháng 5/2025',  costDate: new Date('2025-05-15') },
    { licensePlate: '30A-001.11', category: 'ELECTRICITY', amount: 830000,  description: 'Sạc điện tháng 6/2025',  costDate: new Date('2025-06-01') },
    { licensePlate: '30A-002.22', category: 'ELECTRICITY', amount: 890000,  description: 'Sạc điện tháng 6/2025',  costDate: new Date('2025-06-01') },
    { licensePlate: '30A-004.44', category: 'ACCIDENT',    amount: 4500000, description: 'Sửa cản trước do va chạm nhẹ', costDate: new Date('2025-05-28') },
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
      licensePlate: '30A-004.44',
      description: 'Va chạm nhẹ tại nút giao Láng Hạ — Đê La Thành, cản trước bị trầy xước',
      status: 'RESOLVED',
      priority: 'MEDIUM',
    },
    {
      code: 'INC-2025-000002',
      licensePlate: '29A-003.33',
      description: 'Xe bị xịt lốp trên đường Nguyễn Văn Cừ, đã thay lốp dự phòng tại chỗ',
      status: 'RESOLVED',
      priority: 'LOW',
    },
    {
      code: 'INC-2025-000003',
      licensePlate: '30A-006.66',
      description: 'Màn hình trung tâm không nhận cảm ứng, đang chờ linh kiện từ VinFast',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
    },
    {
      code: 'INC-2025-000004',
      licensePlate: '15A-001.11',
      description: 'Tiếng kêu bất thường từ hệ thống treo trước khi đi qua ổ gà',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
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
      note: 'Điều chuyển lốp dự phòng từ xe HN01 sang xe đang sửa',
      lines: [
        {
          fromPlate: '30A-005.55',
          toPlate: '30A-007.77',
          itemDescription: 'Lốp dự phòng 215/55R17',
          quantity: 1,
        },
      ],
    },
    {
      code: 'PTB-2025-000002',
      status: 'APPROVED',
      note: 'Chuyển kích và dụng cụ thay lốp sang chi nhánh HN02',
      lines: [
        {
          fromPlate: '30A-008.88',
          toPlate: '29A-001.11',
          itemDescription: 'Kích nâng xe thủy lực mini',
          quantity: 1,
        },
        {
          fromPlate: '30A-008.88',
          toPlate: '29A-001.11',
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
