import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationListenerService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @OnEvent('workshop.job.created')
  async handleJobCreated(payload: { jobId: string; vehicleId: string }) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: payload.jobId },
      include: { vehicle: true, branch: true },
    });
    if (!job) return;

    // Notify Quản lý Xưởng
    const managers = await this.prisma.user.findMany({
      where: { role: { code: { in: ['SUPER_ADMIN', 'QUAN_LY_XUONG'] } }, branchId: job.branchId },
    });

    for (const user of managers) {
      await this.notificationsService.create({
        userId: user.id,
        type: 'WORKSHOP_STATUS_CHANGED',
        title: `Xe ${job.vehicle.licensePlate} vào xưởng`,
        message: `Lệnh ${job.code}: ${job.entryReason}`,
        data: { url: `/workshop/jobs/${job.id}` },
        channels: ['IN_APP', 'PUSH'],
      });
    }
  }

  @OnEvent('workshop.job.statusChanged')
  async handleJobStatusChanged(payload: { jobId: string; oldStatus: string; newStatus: string }) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: payload.jobId },
      include: { vehicle: true, advisor: true },
    });
    if (!job) return;

    const statusLabels: Record<string, string> = {
      RECEIVED: 'Tiếp nhận',
      DIAGNOSING: 'Chẩn đoán',
      QUOTED: 'Đã báo giá',
      APPROVED: 'Đã duyệt',
      WAITING_PARTS: 'Chờ linh kiện',
      IN_PROGRESS: 'Đang sửa',
      QUALITY_CHECK: 'Kiểm tra CL',
      COMPLETED: 'Hoàn thành',
      DELIVERED: 'Đã giao xe',
    };

    // Notify advisor + relevant managers
    const usersToNotify = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: job.advisorId },
          { role: { code: { in: ['SUPER_ADMIN', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE'] } } },
        ],
      },
    });

    for (const user of usersToNotify) {
      if (user.id === job.advisorId && payload.newStatus === 'QUOTED') continue; // advisor tự báo giá
      await this.notificationsService.create({
        userId: user.id,
        type: 'WORKSHOP_STATUS_CHANGED',
        title: `${job.code} → ${statusLabels[payload.newStatus] || payload.newStatus}`,
        message: `Xe ${job.vehicle.licensePlate}: ${job.entryReason}`,
        data: { url: `/workshop/jobs/${job.id}` },
        channels: ['IN_APP', 'PUSH'],
      });
    }
  }

  @OnEvent('workshop.job.completed')
  async handleJobCompleted(payload: { jobId: string }) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: payload.jobId },
      include: { vehicle: { include: { branch: true } } },
    });
    if (!job) return;

    // Notify Quản lý Đội xe (vehicle owner branch)
    const fleetManagers = await this.prisma.user.findMany({
      where: { role: { code: 'QUAN_LY_DOI_XE' }, branchId: job.vehicle.branchId },
    });

    for (const user of fleetManagers) {
      await this.notificationsService.create({
        userId: user.id,
        type: 'WORKSHOP_STATUS_CHANGED',
        title: `Xe ${job.vehicle.licensePlate} đã sửa xong`,
        message: `Lệnh ${job.code} hoàn thành, sẵn sàng giao xe`,
        data: { url: `/workshop/jobs/${job.id}` },
        channels: ['IN_APP', 'PUSH'],
      });
    }
  }

  @OnEvent('vehicle.odo.updated')
  async handleOdoUpdated(payload: { vehicleId: string; odo: number; delta: number }) {
    // Check if any maintenance is now DUE_SOON or OVERDUE
    const records = await this.prisma.maintenanceRecord.findMany({
      where: { vehicleId: payload.vehicleId, status: { in: ['UPCOMING', 'DUE_SOON'] } },
      include: { plan: true, vehicle: true },
    });

    for (const record of records) {
      const remaining = record.nextDueOdo - payload.odo;
      if (remaining <= 0 && record.status !== 'OVERDUE') {
        // Mark OVERDUE
        await this.prisma.maintenanceRecord.update({
          where: { id: record.id },
          data: { status: 'OVERDUE' },
        });
        // Notify
        const managers = await this.prisma.user.findMany({
          where: { role: { code: { in: ['SUPER_ADMIN', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE'] } } },
        });
        for (const user of managers) {
          await this.notificationsService.create({
            userId: user.id,
            type: 'MAINTENANCE_OVERDUE',
            title: `${record.vehicle.licensePlate} — Quá hạn bảo dưỡng`,
            message: `${record.plan?.name}: Quá hạn ${Math.abs(remaining)} km`,
            data: { url: `/vehicles/${payload.vehicleId}` },
            channels: ['IN_APP', 'PUSH'],
          });
        }
      } else if (remaining <= 1000 && remaining > 0 && record.status === 'UPCOMING') {
        // Mark DUE_SOON
        await this.prisma.maintenanceRecord.update({
          where: { id: record.id },
          data: { status: 'DUE_SOON' },
        });
        const managers = await this.prisma.user.findMany({
          where: { role: { code: { in: ['SUPER_ADMIN', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE'] } } },
        });
        for (const user of managers) {
          await this.notificationsService.create({
            userId: user.id,
            type: 'MAINTENANCE_DUE',
            title: `${record.vehicle.licensePlate} — Sắp đến hạn bảo dưỡng`,
            message: `${record.plan?.name}: Còn ${remaining} km`,
            data: { url: `/vehicles/${payload.vehicleId}` },
            channels: ['IN_APP', 'PUSH'],
          });
        }
      }
    }
  }

  @OnEvent('vehicle.transferred')
  async handleVehicleTransferred(payload: { vehicleId: string; fromBranchId: string; toBranchId: string }) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: payload.vehicleId } });
    const [fromBranch, toBranch] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: payload.fromBranchId } }),
      this.prisma.branch.findUnique({ where: { id: payload.toBranchId } }),
    ]);
    if (!vehicle || !fromBranch || !toBranch) return;

    // Notify managers of both branches
    const managers = await this.prisma.user.findMany({
      where: {
        role: { code: { in: ['SUPER_ADMIN', 'QUAN_LY_DOI_XE'] } },
        OR: [{ branchId: payload.fromBranchId }, { branchId: payload.toBranchId }, { branchId: null }],
      },
    });

    for (const user of managers) {
      await this.notificationsService.create({
        userId: user.id,
        type: 'VEHICLE_TRANSFERRED',
        title: `Điều chuyển xe ${vehicle.licensePlate}`,
        message: `${fromBranch.name} → ${toBranch.name}`,
        data: { url: `/vehicles/${vehicle.id}` },
        channels: ['IN_APP', 'PUSH'],
      });
    }
  }

  @OnEvent('fleet.incident.created')
  async handleIncidentCreated(payload: { incidentId: string; vehicleId: string; reporterId: string }) {
    const incident = await this.prisma.fleetIncident.findUnique({
      where: { id: payload.incidentId },
      include: { vehicle: true, reporter: true },
    });
    if (!incident) return;

    const priorityLabels: Record<string, string> = {
      CRITICAL: '🔴 Nghiêm trọng',
      HIGH: '🟠 Cao',
      MEDIUM: '🟡 Trung bình',
      LOW: '🟢 Thấp',
    };

    // Notify fleet managers + super admin
    const managers = await this.prisma.user.findMany({
      where: { role: { code: { in: ['SUPER_ADMIN', 'QUAN_LY_DOI_XE'] } } },
    });

    for (const user of managers) {
      await this.notificationsService.create({
        userId: user.id,
        type: 'INCIDENT_NEW',
        title: `Sự cố mới — ${incident.vehicle.licensePlate}`,
        message: `${priorityLabels[incident.priority] || incident.priority}: ${incident.description}`,
        data: { url: `/fleet/incidents` },
        channels: ['IN_APP', 'PUSH'],
      });
    }
  }
}
