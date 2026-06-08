import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { RecordOdoDto } from './dto/record-odo.dto';
import { TransferVehicleDto } from './dto/transfer-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
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

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        model: true,
        branch: true,
        odoLogs: { take: 10, orderBy: { recordedAt: 'desc' } },
        maintenanceRecords: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
      },
    });
    if (!vehicle) {
      throw new NotFoundException('Xe không tồn tại');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        registeredAt: dto.registeredAt ? new Date(dto.registeredAt) : undefined,
      },
      include: { model: true, branch: true },
    });
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
}
