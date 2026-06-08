import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WorkshopDashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(branchId?: string | null) {
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const statusCounts = await this.prisma.workshopJob.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count;
    });

    const totalInWorkshop = Object.values(statusMap).reduce((a, b) => a + b, 0) -
      (statusMap['DELIVERED'] || 0);

    // Overdue: jobs received > 7 days ago and not yet delivered
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdue = await this.prisma.workshopJob.count({
      where: {
        ...where,
        receivedAt: { lt: sevenDaysAgo },
        status: { notIn: ['COMPLETED', 'DELIVERED'] },
      },
    });

    // Job type breakdown
    const warrantyCount = await this.prisma.workshopJob.count({
      where: { ...where, jobType: 'WARRANTY', status: { notIn: ['DELIVERED'] } },
    });
    const paidCount = await this.prisma.workshopJob.count({
      where: { ...where, jobType: 'REPAIR', status: { notIn: ['DELIVERED'] } },
    });

    // Revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenue = await this.prisma.repairOrder.aggregate({
      where: {
        openedAt: { gte: startOfMonth },
        status: 'COMPLETED',
        ...(branchId && { job: { branchId } }),
      },
      _sum: { totalCost: true },
    });

    // Recent jobs
    const recentJobs = await this.prisma.workshopJob.findMany({
      where,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { include: { model: true } },
        advisor: { omit: { passwordHash: true } },
      },
    });

    return {
      totalInWorkshop,
      inProgress: statusMap['IN_PROGRESS'] || 0,
      waitingParts: statusMap['WAITING_PARTS'] || 0,
      qualityCheck: statusMap['QUALITY_CHECK'] || 0,
      completed: statusMap['COMPLETED'] || 0,
      diagnosing: statusMap['DIAGNOSING'] || 0,
      overdue,
      warrantyCount,
      paidCount,
      revenueThisMonth: Number(revenue._sum.totalCost || 0),
      recentJobs,
      statusBreakdown: statusCounts,
    };
  }
}
