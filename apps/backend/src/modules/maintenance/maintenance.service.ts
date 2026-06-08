import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { CreateMaintenancePlanDto, UpdateMaintenancePlanDto } from './dto/maintenance-plan.dto';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  // ── Plans ──────────────────────────────────────────────

  async getPlans() {
    return this.prisma.maintenancePlan.findMany({
      orderBy: { intervalKm: 'asc' },
      include: { _count: { select: { records: true } } },
    });
  }

  async createPlan(dto: CreateMaintenancePlanDto) {
    return this.prisma.maintenancePlan.create({
      data: {
        name: dto.name,
        intervalKm: dto.intervalKm,
        description: dto.description,
        tasks: dto.tasks ?? [],
      },
    });
  }

  async updatePlan(id: string, dto: UpdateMaintenancePlanDto) {
    const plan = await this.prisma.maintenancePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Kế hoạch không tồn tại');
    return this.prisma.maintenancePlan.update({ where: { id }, data: dto });
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: { _count: { select: { records: true } } },
    });
    if (!plan) throw new NotFoundException('Kế hoạch không tồn tại');
    // soft-delete: deactivate instead of hard delete if records exist
    if (plan._count.records > 0) {
      return this.prisma.maintenancePlan.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.maintenancePlan.delete({ where: { id } });
  }

  // ── Records ────────────────────────────────────────────

  async createRecord(dto: CreateMaintenanceRecordDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Xe không tồn tại');

    const plan = await this.prisma.maintenancePlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Kế hoạch bảo dưỡng không tồn tại');

    const nextDueOdo = dto.odoAtService + plan.intervalKm;

    return this.prisma.maintenanceRecord.create({
      data: {
        vehicleId: dto.vehicleId,
        planId: dto.planId,
        odoAtService: dto.odoAtService,
        nextDueOdo,
        status: 'COMPLETED',
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        cost: dto.cost,
        note: dto.note,
      },
      include: { vehicle: { include: { model: true } }, plan: true },
    });
  }

  async findAll(query: QueryMaintenanceDto) {
    const { vehicleId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.maintenanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { select: { id: true, licensePlate: true, currentOdo: true, model: { select: { name: true } } } },
          plan: { select: { id: true, name: true, intervalKm: true } },
        },
      }),
      this.prisma.maintenanceRecord.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getDueVehicles(branchId?: string) {
    // Get all active vehicles with their latest maintenance record per plan
    const where: any = { status: 'ACTIVE' };
    if (branchId) where.branchId = branchId;

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      select: {
        id: true,
        licensePlate: true,
        currentOdo: true,
        model: { select: { name: true } },
        branch: { select: { name: true } },
        maintenanceRecords: {
          where: { status: 'COMPLETED' },
          orderBy: { odoAtService: 'desc' },
          include: { plan: true },
          take: 20,
        },
      },
    });

    const plans = await this.prisma.maintenancePlan.findMany({ where: { isActive: true } });

    const result: any[] = [];

    for (const vehicle of vehicles) {
      const dueItems: any[] = [];

      for (const plan of plans) {
        // Find latest record for this plan on this vehicle
        const lastRecord = vehicle.maintenanceRecords.find((r) => r.planId === plan.id);

        let nextDueOdo: number;
        let lastServiceOdo: number | null = null;

        if (lastRecord) {
          nextDueOdo = lastRecord.nextDueOdo;
          lastServiceOdo = lastRecord.odoAtService;
        } else {
          // Never serviced — due from 0
          nextDueOdo = plan.intervalKm;
        }

        const remaining = nextDueOdo - vehicle.currentOdo;

        // DUE_SOON within 500km, OVERDUE past due
        if (remaining <= 500) {
          dueItems.push({
            planId: plan.id,
            planName: plan.name,
            intervalKm: plan.intervalKm,
            nextDueOdo,
            lastServiceOdo,
            remaining,
            status: remaining <= 0 ? 'OVERDUE' : 'DUE_SOON',
          });
        }
      }

      if (dueItems.length > 0) {
        result.push({
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          currentOdo: vehicle.currentOdo,
          modelName: vehicle.model.name,
          branchName: vehicle.branch?.name,
          dueItems,
          mostUrgent: dueItems.sort((a, b) => a.remaining - b.remaining)[0],
        });
      }
    }

    return result.sort((a, b) => a.mostUrgent.remaining - b.mostUrgent.remaining);
  }

  async markStatus(id: string, status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED') {
    const record = await this.prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Bản ghi bảo dưỡng không tồn tại');
    return this.prisma.maintenanceRecord.update({ where: { id }, data: { status } });
  }
}
