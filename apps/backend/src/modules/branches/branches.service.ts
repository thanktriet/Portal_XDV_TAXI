import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Mã chi nhánh đã tồn tại');
    }

    return this.prisma.branch.create({
      data: dto,
      include: { manager: { omit: { passwordHash: true } } },
    });
  }

  async findAll() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      include: {
        manager: { omit: { passwordHash: true } },
        _count: { select: { users: true, vehicles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        manager: { omit: { passwordHash: true } },
        _count: { select: { users: true, vehicles: true } },
      },
    });
    if (!branch) {
      throw new NotFoundException('Chi nhánh không tồn tại');
    }
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
      include: { manager: { omit: { passwordHash: true } } },
    });
  }
}
