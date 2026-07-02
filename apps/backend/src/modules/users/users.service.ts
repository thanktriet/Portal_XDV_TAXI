import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private requestContextService: RequestContextService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã tồn tại');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        fullName: dto.fullName,
        roleId: dto.roleId,
        branchId: dto.branchId,
      },
      include: { role: true, branch: true },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 20, search, roleId, branchId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (roleId) where.roleId = roleId;
    if (branchId) where.branchId = branchId;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { role: true, branch: true },
        omit: { passwordHash: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, branch: true },
      omit: { passwordHash: true },
    });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const oldUser = await this.findOne(id);

    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, branch: true },
      omit: { passwordHash: true },
    });

    // Audit log for update
    const ctx = this.requestContextService.getContext();
    await this.auditLogService.log({
      userId: ctx.userId,
      action: 'USER_UPDATED',
      resource: 'User',
      resourceId: user.id,
      oldData: oldUser,
      newData: user,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return user;
  }
}
