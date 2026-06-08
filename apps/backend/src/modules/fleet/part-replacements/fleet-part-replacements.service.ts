import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateFleetReplacementDto, RejectReplacementDto } from './dto/create-replacement.dto';
import { PartTransactionType } from '@prisma/client';

@Injectable()
export class FleetPartReplacementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFleetReplacementDto, userId: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.fleetPartReplacement.count({
      where: { code: { startsWith: `FPR-${year}` } },
    });
    const code = `FPR-${year}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.fleetPartReplacement.create({
      data: {
        code,
        vehicleId: dto.vehicleId,
        branchId: dto.branchId,
        description: dto.description,
        odoAtService: dto.odoAtService,
        note: dto.note,
        createdById: userId,
        items: {
          create: dto.items.map((i) => ({
            partId: i.partId,
            quantity: i.quantity,
            description: i.description,
            oldPartCondition: i.oldPartCondition,
            note: i.note,
          })),
        },
      },
      include: {
        vehicle: { include: { model: true } },
        branch: true,
        createdBy: { omit: { passwordHash: true } },
        items: { include: { part: { include: { category: true } } } },
      },
    });
  }

  async findAll(page = 1, limit = 20, branchId?: string, status?: string, vehicleId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    const [data, total] = await Promise.all([
      this.prisma.fleetPartReplacement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { include: { model: true } },
          branch: true,
          createdBy: { omit: { passwordHash: true } },
          approvedBy: { omit: { passwordHash: true } },
          items: { include: { part: true } },
        },
      }),
      this.prisma.fleetPartReplacement.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const fpr = await this.prisma.fleetPartReplacement.findUnique({
      where: { id },
      include: {
        vehicle: { include: { model: true } },
        branch: true,
        createdBy: { omit: { passwordHash: true } },
        approvedBy: { omit: { passwordHash: true } },
        partsReturnedBy: { omit: { passwordHash: true } },
        items: { include: { part: { include: { category: true } } } },
      },
    });
    if (!fpr) throw new NotFoundException('Lệnh thay thế không tồn tại');
    return fpr;
  }

  async approve(id: string, userId: string) {
    const fpr = await this.prisma.fleetPartReplacement.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!fpr) throw new NotFoundException('Lệnh thay thế không tồn tại');
    if (fpr.status !== 'PENDING') throw new BadRequestException('Lệnh đã được xử lý');

    return this.prisma.$transaction(async (tx) => {
      // Deduct parts from branch stock
      for (const item of fpr.items) {
        const stock = await tx.partStock.findUnique({
          where: { partId_branchId: { partId: item.partId, branchId: fpr.branchId } },
          include: { part: true },
        });
        if (!stock) throw new BadRequestException(`Phụ tùng không có trong kho chi nhánh`);
        if (stock.stockQty < item.quantity)
          throw new BadRequestException(`Không đủ tồn kho: ${stock.part.name} (có: ${stock.stockQty})`);

        await tx.partStock.update({
          where: { partId_branchId: { partId: item.partId, branchId: fpr.branchId } },
          data: { stockQty: { decrement: item.quantity } },
        });
        await tx.partTransaction.create({
          data: {
            partId: item.partId,
            branchId: fpr.branchId,
            type: PartTransactionType.EXPORT,
            quantity: item.quantity,
            reference: fpr.code,
            note: `Thay thế xe ${fpr.vehicleId}`,
            userId,
          },
        });
      }

      return tx.fleetPartReplacement.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        include: { vehicle: true, branch: true, items: { include: { part: true } } },
      });
    });
  }

  async reject(id: string, dto: RejectReplacementDto, userId: string) {
    const fpr = await this.prisma.fleetPartReplacement.findUnique({ where: { id } });
    if (!fpr) throw new NotFoundException('Lệnh thay thế không tồn tại');
    if (fpr.status !== 'PENDING') throw new BadRequestException('Lệnh đã được xử lý');

    return this.prisma.fleetPartReplacement.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: dto.reason, approvedById: userId, approvedAt: new Date() },
    });
  }

  async confirmPartsReturned(id: string, itemIds: string[], userId: string) {
    const fpr = await this.prisma.fleetPartReplacement.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!fpr) throw new NotFoundException('Lệnh thay thế không tồn tại');
    if (fpr.status !== 'APPROVED') throw new BadRequestException('Lệnh chưa được duyệt');

    return this.prisma.$transaction(async (tx) => {
      // Mark items as returned
      await tx.fleetPartReplacementItem.updateMany({
        where: { id: { in: itemIds }, replacementId: id },
        data: { oldPartReturned: true },
      });

      // Check if all items returned
      const remaining = await tx.fleetPartReplacementItem.count({
        where: { replacementId: id, oldPartReturned: false },
      });

      let updateData: any = { partsReturnedById: userId };
      if (remaining === 0) {
        updateData.status = 'PARTS_RETURNED';
        updateData.partsReturnedAt = new Date();
      }

      // Add parts back to workshop stock (RETURN transaction)
      const workshopBranch = await tx.branch.findFirst({ where: { type: 'WORKSHOP' } });
      if (workshopBranch) {
        for (const itemId of itemIds) {
          const item = fpr.items.find((i) => i.id === itemId);
          if (!item) continue;
          await tx.partStock.upsert({
            where: { partId_branchId: { partId: item.partId, branchId: workshopBranch.id } },
            create: { partId: item.partId, branchId: workshopBranch.id, stockQty: item.quantity },
            update: { stockQty: { increment: item.quantity } },
          });
          await tx.partTransaction.create({
            data: {
              partId: item.partId,
              branchId: workshopBranch.id,
              type: PartTransactionType.RETURN,
              quantity: item.quantity,
              reference: fpr.code,
              note: `Phụ tùng cũ trả về từ ${fpr.branchId}`,
              userId,
            },
          });
        }
      }

      return tx.fleetPartReplacement.update({
        where: { id },
        data: updateData,
        include: { vehicle: true, branch: true, items: { include: { part: true } } },
      });
    });
  }
}
