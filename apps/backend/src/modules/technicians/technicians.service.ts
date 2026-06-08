import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';

@Injectable()
export class TechniciansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTechnicianDto) {
    const existing = await this.prisma.technician.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('User đã là kỹ thuật viên');

    return this.prisma.technician.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        skillLevel: dto.skillLevel,
        specialty: dto.specialty,
        branchId: dto.branchId,
      },
      include: { branch: true },
    });
  }

  async findAll(branchId?: string) {
    const where: any = { isActive: true };
    if (branchId) where.branchId = branchId;

    return this.prisma.technician.findMany({
      where,
      orderBy: { skillLevel: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        jobs: {
          where: { status: { notIn: ['COMPLETED', 'DELIVERED'] } },
          select: { id: true, code: true, status: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const tech = await this.prisma.technician.findUnique({
      where: { id },
      include: {
        branch: true,
        jobs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { vehicle: { include: { model: true } } },
        },
      },
    });
    if (!tech) throw new NotFoundException('Kỹ thuật viên không tồn tại');
    return tech;
  }

  async update(id: string, data: Partial<CreateTechnicianDto>) {
    const tech = await this.prisma.technician.findUnique({ where: { id } });
    if (!tech) throw new NotFoundException('Kỹ thuật viên không tồn tại');

    return this.prisma.technician.update({
      where: { id },
      data: {
        title: data.title,
        skillLevel: data.skillLevel,
        specialty: data.specialty,
        branchId: data.branchId,
      },
      include: { branch: true },
    });
  }

  async deactivate(id: string) {
    return this.prisma.technician.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
