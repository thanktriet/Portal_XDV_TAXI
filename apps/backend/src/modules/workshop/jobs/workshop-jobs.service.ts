import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { RequestContextService } from '../../../common/context/request-context.service';
import { WorkshopJobStatus } from '@prisma/client';
import { CreateWorkshopJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { UpdateJobInfoDto } from './dto/update-job-info.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { JwtPayload } from '../../auth/auth.service';

const ALLOWED_TRANSITIONS: Record<WorkshopJobStatus, WorkshopJobStatus[]> = {
  RECEIVED:      [WorkshopJobStatus.DIAGNOSING],
  DIAGNOSING:    [WorkshopJobStatus.QUOTED],
  QUOTED:        [WorkshopJobStatus.APPROVED, WorkshopJobStatus.DIAGNOSING, WorkshopJobStatus.REJECTED],
  APPROVED:      [WorkshopJobStatus.WAITING_PARTS, WorkshopJobStatus.IN_PROGRESS],
  WAITING_PARTS: [WorkshopJobStatus.IN_PROGRESS],
  IN_PROGRESS:   [WorkshopJobStatus.QUALITY_CHECK],
  QUALITY_CHECK: [WorkshopJobStatus.COMPLETED, WorkshopJobStatus.IN_PROGRESS],
  COMPLETED:     [WorkshopJobStatus.DELIVERED],
  DELIVERED:     [],
  REJECTED:      [WorkshopJobStatus.DIAGNOSING],
};

@Injectable()
export class WorkshopJobsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditLogService: AuditLogService,
    private requestContextService: RequestContextService,
  ) {}

  async create(dto: CreateWorkshopJobDto) {
    // Generate code: WS-YYYY-NNNNNN
    const year = new Date().getFullYear();
    const count = await this.prisma.workshopJob.count({
      where: { code: { startsWith: `WS-${year}` } },
    });
    const code = `WS-${year}-${String(count + 1).padStart(6, '0')}`;

    const job = await this.prisma.workshopJob.create({
      data: {
        code,
        ...dto,
      },
      include: {
        vehicle: { include: { model: true } },
        branch: true,
        advisor: { omit: { passwordHash: true } },
        technician: true,
      },
    });

    // Update vehicle status
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: { status: 'IN_WORKSHOP' },
    });

    this.eventEmitter.emit('workshop.job.created', { jobId: job.id, vehicleId: dto.vehicleId });

    return job;
  }

  async findAll(query: QueryJobsDto, userBranchId?: string | null) {
    const { page = 1, limit = 20, search, branchId, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userBranchId) {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (status) where.status = status;
    if (query.vehicleId) where.vehicleId = query.vehicleId;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        { vehicle: { vin: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.workshopJob.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          vehicle: { include: { model: true } },
          branch: true,
          advisor: { omit: { passwordHash: true } },
          technician: true,
          plan: true,
          repairOrders: { include: { items: true } },
        },
      }),
      this.prisma.workshopJob.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id },
      include: {
        vehicle: { include: { model: true } },
        branch: true,
        advisor: { omit: { passwordHash: true } },
        technician: true,
        settlementFile: true,
        repairOrders: { include: { items: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { omit: { passwordHash: true } } },
        },
      },
    });
    if (!job) throw new NotFoundException('Workshop job không tồn tại');
    return job;
  }

  async updateStatus(id: string, dto: UpdateJobStatusDto, user: JwtPayload) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id },
      include: { plan: true, repairOrders: { include: { items: true } } },
    });
    if (!job) throw new NotFoundException('Workshop job không tồn tại');

    const allowed = ALLOWED_TRANSITIONS[job.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển từ ${job.status} sang ${dto.status}. Cho phép: ${allowed.join(', ')}`,
      );
    }

    // Must have Repair Order with items before moving to QUOTED
    if (dto.status === 'QUOTED') {
      const hasItems = job.repairOrders.some((ro: any) => ro.items.length > 0);
      if (!hasItems) {
        throw new BadRequestException(
          'Phải tạo phiếu báo giá chi tiết (có hạng mục) trước khi gửi báo giá',
        );
      }
    }

    // Only fleet/management roles can APPROVE or REJECT
    const FLEET_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE'];
    if (
      (dto.status === WorkshopJobStatus.APPROVED || dto.status === WorkshopJobStatus.REJECTED) &&
      !FLEET_ROLES.includes(user.role)
    ) {
      throw new ForbiddenException(
        'Chỉ Quản lý Đội xe hoặc Giám đốc mới có thể duyệt hoặc từ chối báo giá',
      );
    }

    const updateData: any = { status: dto.status };
    if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    if (dto.status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (dto.status === 'QUOTED' && dto.estimatedCost !== undefined) {
      updateData.estimatedCost = dto.estimatedCost;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.workshopJob.update({
        where: { id },
        data: updateData,
        include: {
          vehicle: { include: { model: true } },
          branch: true,
          advisor: { omit: { passwordHash: true } },
          technician: true,
        },
      }),
      this.prisma.workshopJobStatusLog.create({
        data: {
          jobId: id,
          fromStatus: job.status,
          toStatus: dto.status,
          note: dto.note,
          dmsRef: dto.dmsRef,
          changedById: user.sub,
        },
      }),
    ]);

    // Audit log for status change
    const ctx = this.requestContextService.getContext();
    await this.auditLogService.log({
      userId: user.sub,
      action: 'JOB_STATUS_CHANGED',
      resource: 'WorkshopJob',
      resourceId: id,
      oldData: { status: job.status },
      newData: { status: dto.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    // If delivered, set vehicle back to ACTIVE
    if (dto.status === 'DELIVERED') {
      await this.prisma.vehicle.update({
        where: { id: job.vehicleId },
        data: { status: 'ACTIVE' },
      });
      this.eventEmitter.emit('workshop.job.completed', {
        jobId: id,
        vehicleId: job.vehicleId,
      });
    }

    // Auto-create MaintenanceRecord when job completes and is linked to a plan
    if (dto.status === 'COMPLETED' && job.planId && job.plan) {
      const nextDueOdo = job.odoAtEntry + job.plan.intervalKm;
      await this.prisma.maintenanceRecord.create({
        data: {
          vehicleId: job.vehicleId,
          planId: job.planId,
          odoAtService: job.odoAtEntry,
          nextDueOdo,
          status: 'COMPLETED',
          serviceDate: new Date(),
        },
      });
    }

    this.eventEmitter.emit('workshop.job.statusChanged', {
      jobId: id,
      fromStatus: job.status,
      toStatus: dto.status,
    });

    return updated;
  }

  async updateJobType(id: string, jobType: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Workshop job không tồn tại');

    const updated = await this.prisma.workshopJob.update({
      where: { id },
      data: { jobType: jobType as any },
      include: {
        vehicle: { include: { model: true } },
        branch: true,
        advisor: { omit: { passwordHash: true } },
      },
    });

    // Audit log
    const ctx = this.requestContextService.getContext();
    await this.auditLogService.log({
      userId: ctx.userId,
      action: 'WORKSHOPJOB_UPDATED',
      resource: 'WorkshopJob',
      resourceId: id,
      oldData: { jobType: job.jobType },
      newData: { jobType },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  async updateInfo(id: string, dto: UpdateJobInfoDto, user: JwtPayload) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Workshop job không tồn tại');

    const data: any = {};

    // dmsRef chỉ nhập 1 lần — sau khi đã có thì khoá, chỉ admin/giám đốc được sửa lại
    if (dto.dmsRef !== undefined) {
      const ADMIN_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'];
      if (job.dmsRef && !ADMIN_ROLES.includes(user.role)) {
        throw new ForbiddenException(
          'Mã lệnh DMS đã được nhập và chỉ Giám đốc/Quản trị mới có thể chỉnh sửa',
        );
      }
      data.dmsRef = dto.dmsRef.trim() || null;
    }

    if (dto.settlementFileId !== undefined) {
      data.settlementFileId = dto.settlementFileId || null;
    }

    const updated = await this.prisma.workshopJob.update({
      where: { id },
      data,
      include: {
        vehicle: { include: { model: true } },
        branch: true,
        advisor: { omit: { passwordHash: true } },
        technician: true,
        settlementFile: true,
      },
    });

    const ctx = this.requestContextService.getContext();
    await this.auditLogService.log({
      userId: user.sub,
      action: 'WORKSHOPJOB_UPDATED',
      resource: 'WorkshopJob',
      resourceId: id,
      oldData: { dmsRef: job.dmsRef, settlementFileId: job.settlementFileId },
      newData: data,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }
}
