import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { RecordOdoDto } from './dto/record-odo.dto';
import { TransferVehicleDto } from './dto/transfer-vehicle.dto';
import { FilesService } from '../files/files.service';
import * as ExcelJS from 'exceljs';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  RESTING: 'Nghỉ',
  IN_WORKSHOP: 'Trong xưởng',
  ACCIDENT: 'Tai nạn',
  DECOMMISSIONED: 'Thanh lý',
};

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditLogService: AuditLogService,
    private requestContextService: RequestContextService,
    private filesService: FilesService,
  ) {}

  async create(dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        OR: [{ licensePlate: dto.licensePlate }, { vin: dto.vin }],
      },
    });
    if (existing) {
      throw new ConflictException('Biển số hoặc VIN đã tồn tại');
    }

    return this.prisma.vehicle.create({
      data: {
        ...dto,
        registeredAt: dto.registeredAt ? new Date(dto.registeredAt) : null,
        inspectionExpiry: dto.inspectionExpiry ? new Date(dto.inspectionExpiry) : null,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
      },
      include: { model: true, branch: true },
    });
  }

  async findAll(query: QueryVehicleDto, userBranchId?: string | null) {
    const { page = 1, limit = 20, search, branchId, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch scoping
    if (userBranchId) {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { model: true, branch: true },
      }),
      this.prisma.vehicle.count({ where }),
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

  async exportToExcel(query: QueryVehicleDto, userBranchId?: string | null): Promise<Buffer> {
    const { search, status } = query;
    const where: any = {};

    if (userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      orderBy,
      include: { model: true, branch: true },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách xe');

    sheet.columns = [
      { header: 'Biển số', key: 'licensePlate', width: 15 },
      { header: 'VIN', key: 'vin', width: 22 },
      { header: 'Model', key: 'modelName', width: 15 },
      { header: 'Năm SX', key: 'yearMfg', width: 10 },
      { header: 'Đơn vị sở hữu', key: 'ownerName', width: 22 },
      { header: 'Chi nhánh', key: 'branchName', width: 22 },
      { header: 'ODO (km)', key: 'currentOdo', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Ngày đăng ký', key: 'registeredAt', width: 14 },
      { header: 'Hạn đăng kiểm', key: 'inspectionExpiry', width: 14 },
      { header: 'Hạn bảo hiểm', key: 'insuranceExpiry', width: 14 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    for (const v of vehicles) {
      sheet.addRow({
        licensePlate: v.licensePlate,
        vin: v.vin,
        modelName: v.model?.name ?? '',
        yearMfg: v.yearMfg,
        ownerName: v.ownerName ?? '',
        branchName: v.branch?.name ?? '',
        currentOdo: v.currentOdo,
        status: VEHICLE_STATUS_LABELS[v.status] ?? v.status,
        registeredAt: v.registeredAt
          ? new Date(v.registeredAt).toLocaleDateString('vi-VN')
          : '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        model: true,
        branch: true,
        odoLogs: { take: 10, orderBy: { recordedAt: 'desc' }, include: { user: { select: { id: true, fullName: true } } } },
        maintenanceRecords: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: { file: true },
        },
      },
    });
    if (!vehicle) {
      throw new NotFoundException('Xe không tồn tại');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const oldVehicle = await this.findOne(id);

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        registeredAt: dto.registeredAt ? new Date(dto.registeredAt) : undefined,
        inspectionExpiry: dto.inspectionExpiry ? new Date(dto.inspectionExpiry) : undefined,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
      },
      include: { model: true, branch: true },
    });

    // Audit log
    const ctx = this.requestContextService.getContext();
    await this.auditLogService.log({
      userId: ctx.userId,
      action: 'VEHICLE_UPDATED',
      resource: 'Vehicle',
      resourceId: vehicle.id,
      oldData: { ...oldVehicle, odoLogs: undefined, maintenanceRecords: undefined },
      newData: { ...vehicle, odoLogs: undefined, maintenanceRecords: undefined },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return vehicle;
  }

  async recordOdo(vehicleId: string, dto: RecordOdoDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Xe không tồn tại');
    }

    if (dto.odo < vehicle.currentOdo) {
      throw new BadRequestException(
        `ODO mới (${dto.odo}) không thể nhỏ hơn ODO hiện tại (${vehicle.currentOdo})`,
      );
    }

    const delta = dto.odo - vehicle.currentOdo;

    const [odoLog] = await this.prisma.$transaction([
      this.prisma.vehicleOdoLog.create({
        data: {
          vehicleId,
          odo: dto.odo,
          previousOdo: vehicle.currentOdo,
          delta,
          source: dto.source || 'manual',
          userId,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentOdo: dto.odo },
      }),
    ]);

    this.eventEmitter.emit('vehicle.odo.updated', {
      vehicleId,
      odo: dto.odo,
      delta,
    });

    return odoLog;
  }

  async getOdoHistory(vehicleId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vehicleOdoLog.findMany({
        where: { vehicleId },
        skip,
        take: limit,
        orderBy: { recordedAt: 'desc' },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.vehicleOdoLog.count({ where: { vehicleId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async transfer(vehicleId: string, dto: TransferVehicleDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Xe không tồn tại');
    }

    if (vehicle.branchId === dto.toBranchId) {
      throw new BadRequestException('Xe đã thuộc chi nhánh này');
    }

    const [transfer] = await this.prisma.$transaction([
      this.prisma.vehicleTransfer.create({
        data: {
          vehicleId,
          fromBranchId: vehicle.branchId,
          toBranchId: dto.toBranchId,
          reason: dto.reason,
          approvedById: userId,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { branchId: dto.toBranchId },
      }),
    ]);

    // Audit log for vehicle transfer
    const ctx = this.requestContextService.getContext();
    await this.auditLogService.log({
      userId: ctx.userId,
      action: 'VEHICLE_TRANSFERRED',
      resource: 'Vehicle',
      resourceId: vehicleId,
      newData: {
        vehicleId,
        fromBranchId: vehicle.branchId,
        toBranchId: dto.toBranchId,
        reason: dto.reason,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    this.eventEmitter.emit('vehicle.transferred', {
      vehicleId,
      fromBranchId: vehicle.branchId,
      toBranchId: dto.toBranchId,
    });

    return transfer;
  }

  async getTransferHistory(vehicleId: string) {
    return this.prisma.vehicleTransfer.findMany({
      where: { vehicleId },
      orderBy: { transferredAt: 'desc' },
      include: {
        fromBranch: true,
        toBranch: true,
        approvedBy: { omit: { passwordHash: true } },
      },
    });
  }

  async addDocument(vehicleId: string, fileId: string, category: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Xe không tồn tại');

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File không tồn tại');

    return this.prisma.vehicleDocument.create({
      data: { vehicleId, fileId, category: category as any },
      include: { file: true },
    });
  }

  async removeDocument(vehicleId: string, docId: string) {
    const doc = await this.prisma.vehicleDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.vehicleId !== vehicleId) {
      throw new NotFoundException('Giấy tờ không tồn tại');
    }

    await this.prisma.vehicleDocument.delete({ where: { id: docId } });
    // Xoá luôn file vật lý + bản ghi File để tránh rác đĩa
    await this.filesService.delete(doc.fileId);

    return { success: true };
  }
}
