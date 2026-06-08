import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateTransferBatchDto } from './dto/create-transfer-batch.dto';
import { QueryBatchDto } from './dto/query-batch.dto';

@Injectable()
export class TransferBatchesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.partTransferBatch.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    return `PTB-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateTransferBatchDto, userId: string) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Lô phải có ít nhất 1 dòng');
    }

    for (const line of dto.lines) {
      if (line.fromVehicleId === line.toVehicleId) {
        throw new BadRequestException('Xe nguồn và xe đích không được trùng nhau');
      }
    }

    const code = await this.generateCode();

    return this.prisma.partTransferBatch.create({
      data: {
        code,
        note: dto.note,
        jobId: dto.jobId,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            itemDescription: line.itemDescription,
            partId: line.partId,
            fromVehicleId: line.fromVehicleId,
            toVehicleId: line.toVehicleId,
            quantity: line.quantity,
            note: line.note,
          })),
        },
      },
      include: {
        lines: { include: { part: true, fromVehicle: true, toVehicle: true } },
        createdBy: { omit: { passwordHash: true } },
      },
    });
  }

  async findAll(query: QueryBatchDto) {
    const { status, vehicleId, jobId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (vehicleId) {
      where.lines = {
        some: {
          OR: [{ fromVehicleId: vehicleId }, { toVehicleId: vehicleId }],
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.partTransferBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { omit: { passwordHash: true } },
          approvedBy: { omit: { passwordHash: true } },
          lines: { include: { part: true, fromVehicle: true, toVehicle: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.partTransferBatch.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({
      where: { id },
      include: {
        createdBy: { omit: { passwordHash: true } },
        approvedBy: { omit: { passwordHash: true } },
        reversedFrom: { select: { id: true, code: true } },
        reversals: { select: { id: true, code: true, status: true } },
        lines: {
          include: {
            part: { include: { category: true } },
            fromVehicle: { include: { model: true } },
            toVehicle: { include: { model: true } },
          },
        },
      },
    });
    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    return batch;
  }

  async approve(id: string, userId: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    if (batch.status !== 'PENDING') {
      throw new ConflictException('Chỉ duyệt được lô đang chờ (PENDING)');
    }

    return this.prisma.partTransferBatch.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, userId: string, reason: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    if (batch.status !== 'PENDING') {
      throw new ConflictException('Chỉ từ chối được lô đang chờ (PENDING)');
    }

    return this.prisma.partTransferBatch.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });
  }

  async reverse(id: string, userId: string) {
    const batch = await this.prisma.partTransferBatch.findUnique({
      where: { id },
      include: { lines: true, reversals: true },
    });

    if (!batch) throw new NotFoundException('Lô hoán đổi không tồn tại');
    if (batch.status !== 'APPROVED') {
      throw new ConflictException('Chỉ hoàn trả được lô đã duyệt (APPROVED)');
    }
    if (batch.reversals.length > 0) {
      throw new ConflictException('Lô này đã có yêu cầu hoàn trả');
    }

    const code = await this.generateCode();

    const reverseBatch = await this.prisma.partTransferBatch.create({
      data: {
        code,
        note: `Hoàn trả lô ${batch.code}`,
        status: 'PENDING',
        createdById: userId,
        reversedFromId: batch.id,
        lines: {
          create: batch.lines.map((line) => ({
            itemDescription: line.itemDescription,
            partId: line.partId,
            fromVehicleId: line.toVehicleId,
            toVehicleId: line.fromVehicleId,
            quantity: line.quantity,
            note: `Hoàn trả từ lô ${batch.code}`,
          })),
        },
      },
      include: {
        lines: { include: { part: true, fromVehicle: true, toVehicle: true } },
        createdBy: { omit: { passwordHash: true } },
      },
    });

    await this.prisma.partTransferBatch.update({
      where: { id },
      data: { status: 'REVERSED' },
    });

    return reverseBatch;
  }

  async getVehicleHistory(vehicleId: string) {
    const lines = await this.prisma.partTransferLine.findMany({
      where: {
        OR: [{ fromVehicleId: vehicleId }, { toVehicleId: vehicleId }],
        batch: { status: { in: ['APPROVED', 'REVERSED'] } },
      },
      include: {
        batch: {
          select: { id: true, code: true, status: true, approvedAt: true, createdAt: true },
        },
        part: { select: { id: true, code: true, name: true } },
        fromVehicle: { select: { id: true, licensePlate: true } },
        toVehicle: { select: { id: true, licensePlate: true } },
      },
      orderBy: { batch: { createdAt: 'desc' } },
    });

    return lines.map((line) => ({
      ...line,
      direction: line.fromVehicleId === vehicleId ? 'OUT' : 'IN',
      counterpartVehicle:
        line.fromVehicleId === vehicleId ? line.toVehicle : line.fromVehicle,
    }));
  }
}
