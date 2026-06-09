import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        _count: {
          select: { permissions: true, users: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role không tồn tại');
    return role;
  }

  async updatePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role không tồn tại');
    if (role.code === 'SUPER_ADMIN') {
      throw new BadRequestException('Không thể thay đổi quyền của SUPER_ADMIN');
    }

    // Validate all permissionIds exist
    const existingPerms = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    if (existingPerms.length !== permissionIds.length) {
      throw new BadRequestException('Một số permission ID không hợp lệ');
    }

    // Transaction: delete all old, create new
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    return this.findOne(roleId);
  }

  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    // Group by resource
    const grouped: Record<string, { resource: string; permissions: typeof permissions }> = {};
    for (const perm of permissions) {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = { resource: perm.resource, permissions: [] };
      }
      grouped[perm.resource].permissions.push(perm);
    }

    return Object.values(grouped);
  }
}
