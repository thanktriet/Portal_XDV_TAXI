import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateFleetCostDto } from './dto/create-fleet-cost.dto';
import { QueryFleetCostDto } from './dto/query-fleet-cost.dto';

@Injectable()
export class FleetCostsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFleetCostDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Xe không tồn tại');

    return this.prisma.fleetCost.create({
      data: {
        vehicleId: dto.vehicleId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        invoiceNo: dto.invoiceNo,
        costDate: new Date(dto.costDate),
        userId,
      },
      include: { vehicle: { include: { model: true } } },
    });
  }

  async findAll(query: QueryFleetCostDto) {
    const { vehicleId, category, from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (vehicleId) where.vehicleId = vehicleId;
    if (category) where.category = category;
    if (from || to) {
      where.costDate = {};
      if (from) where.costDate.gte = new Date(from);
      if (to) where.costDate.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.fleetCost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { costDate: 'desc' },
        include: {
          vehicle: { select: { id: true, licensePlate: true, model: { select: { name: true } } } },
          user: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.fleetCost.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary(vehicleId?: string, from?: string, to?: string) {
    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (from || to) {
      where.costDate = {};
      if (from) where.costDate.gte = new Date(from);
      if (to) where.costDate.lte = new Date(to);
    }

    const byCategory = await this.prisma.fleetCost.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const total = await this.prisma.fleetCost.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    return {
      total: Number(total._sum.amount || 0),
      count: total._count,
      byCategory: byCategory.map((item) => ({
        category: item.category,
        total: Number(item._sum.amount || 0),
        count: item._count,
      })),
    };
  }
}
