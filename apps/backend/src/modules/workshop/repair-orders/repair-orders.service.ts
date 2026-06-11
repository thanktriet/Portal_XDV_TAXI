import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateRepairOrderDto } from './dto/create-repair-order.dto';
import { AddRepairOrderItemDto } from './dto/add-ro-item.dto';

@Injectable()
export class RepairOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRepairOrderDto, userId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException('Workshop job không tồn tại');

    const year = new Date().getFullYear();
    const count = await this.prisma.repairOrder.count({
      where: { code: { startsWith: `RO-${year}` } },
    });
    const code = `RO-${year}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.repairOrder.create({
      data: {
        code,
        jobId: dto.jobId,
        odo: dto.odo,
        description: dto.description,
        dmsRef: dto.dmsRef,
        createdById: userId,
      },
      include: { items: true },
    });
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.repairOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          job: { include: { vehicle: { include: { model: true } } } },
          items: true,
          createdBy: { omit: { passwordHash: true } },
        },
      }),
      this.prisma.repairOrder.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const ro = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: {
        job: { include: { vehicle: { include: { model: true } }, branch: true } },
        items: { include: { part: true } },
        createdBy: { omit: { passwordHash: true } },
      },
    });
    if (!ro) throw new NotFoundException('Repair Order không tồn tại');
    return ro;
  }

  async addItem(roId: string, dto: AddRepairOrderItemDto) {
    const ro = await this.prisma.repairOrder.findUnique({ where: { id: roId } });
    if (!ro) throw new NotFoundException('Repair Order không tồn tại');

    const totalPrice = dto.quantity * dto.unitPrice;

    const item = await this.prisma.repairOrderItem.create({
      data: {
        roId,
        type: dto.type,
        description: dto.description,
        partId: dto.partId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
      },
      include: { part: true },
    });

    // Recalculate RO totals
    const allItems = await this.prisma.repairOrderItem.findMany({ where: { roId } });
    const laborCost = allItems
      .filter((i) => i.type === 'LABOR')
      .reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const partsCost = allItems
      .filter((i) => i.type === 'PART')
      .reduce((sum, i) => sum + Number(i.totalPrice), 0);

    await this.prisma.repairOrder.update({
      where: { id: roId },
      data: { laborCost, partsCost, totalCost: laborCost + partsCost },
    });

    return item;
  }

  async updateStatus(id: string, status: string) {
    const ro = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!ro) throw new NotFoundException('Repair Order không tồn tại');

    const ALLOWED: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'OPEN'],
      COMPLETED: [],
      CANCELLED: ['OPEN'],
    };

    const allowed = ALLOWED[ro.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Không thể chuyển từ ${ro.status} sang ${status}. Cho phép: ${allowed.join(', ') || 'không có'}`,
      );
    }

    const data: any = { status };
    if (status === 'COMPLETED') data.closedAt = new Date();

    const updated = await this.prisma.repairOrder.update({
      where: { id },
      data,
      include: { items: true },
    });

    // Auto-sync Job status based on RO changes
    if (ro.job) {
      const jobId = ro.job.id;
      const jobStatus = ro.job.status;

      // Any RO starts → Job moves to IN_PROGRESS
      if (status === 'IN_PROGRESS' && ['APPROVED', 'WAITING_PARTS'].includes(jobStatus)) {
        await this.prisma.workshopJob.update({
          where: { id: jobId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      // Check if ALL ROs are COMPLETED → Job moves to QUALITY_CHECK
      if (status === 'COMPLETED') {
        const allROs = await this.prisma.repairOrder.findMany({
          where: { jobId },
        });
        const allCompleted = allROs.every((r) => r.id === id ? true : r.status === 'COMPLETED');
        if (allCompleted && ['IN_PROGRESS', 'APPROVED', 'WAITING_PARTS'].includes(jobStatus)) {
          await this.prisma.workshopJob.update({
            where: { id: jobId },
            data: { status: 'QUALITY_CHECK' },
          });
        }
      }
    }

    return updated;
  }
}
