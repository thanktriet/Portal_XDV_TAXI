import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { ApproveRequisitionDto, RejectRequisitionDto } from './dto/approve-requisition.dto';

@Injectable()
export class PartRequisitionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRequisitionDto, userId: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.partRequisition.count({
      where: { code: { startsWith: `REQ-${year}` } },
    });
    const code = `REQ-${year}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.partRequisition.create({
      data: {
        code,
        fromBranchId: dto.fromBranchId,
        toBranchId: dto.toBranchId,
        note: dto.note,
        status: 'SUBMITTED',
        createdById: userId,
        lines: {
          create: dto.lines.map((l) => ({
            partId: l.partId,
            requestedQty: l.requestedQty,
            note: l.note,
          })),
        },
      },
      include: {
        fromBranch: true,
        toBranch: true,
        createdBy: { omit: { passwordHash: true } },
        lines: { include: { part: true } },
      },
    });
  }

  async findAll(page = 1, limit = 20, fromBranchId?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (fromBranchId) where.fromBranchId = fromBranchId;
    if (status) {
      const statuses = status.split(',');
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }

    const [data, total] = await Promise.all([
      this.prisma.partRequisition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromBranch: true,
          toBranch: true,
          createdBy: { omit: { passwordHash: true } },
          fleetApprovedBy: { omit: { passwordHash: true } },
          partsApprovedBy: { omit: { passwordHash: true } },
          approvedBy: { omit: { passwordHash: true } },
          lines: { include: { part: { include: { category: true } } } },
        },
      }),
      this.prisma.partRequisition.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const req = await this.prisma.partRequisition.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
        createdBy: { omit: { passwordHash: true } },
        fleetApprovedBy: { omit: { passwordHash: true } },
        partsApprovedBy: { omit: { passwordHash: true } },
        approvedBy: { omit: { passwordHash: true } },
        dispatchedBy: { omit: { passwordHash: true } },
        receivedBy: { omit: { passwordHash: true } },
        receiptFile: true,
        lines: { include: { part: { include: { category: true, stocks: true } } } },
      },
    });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');
    return req;
  }

  // Step 1: Quản lý đội xe duyệt
  async fleetApprove(id: string, userId: string) {
    const req = await this.prisma.partRequisition.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');
    if (req.status !== 'SUBMITTED')
      throw new BadRequestException('Phiếu không ở trạng thái chờ QL đội xe duyệt');

    return this.prisma.partRequisition.update({
      where: { id },
      data: { status: 'FLEET_APPROVED', fleetApprovedById: userId, fleetApprovedAt: new Date() },
      include: { fromBranch: true, toBranch: true, lines: { include: { part: true } } },
    });
  }

  // Step 2: Nhân viên phụ tùng (Quản lý xưởng) duyệt số lượng
  async partsApprove(id: string, dto: ApproveRequisitionDto, userId: string) {
    const req = await this.prisma.partRequisition.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');
    if (req.status !== 'FLEET_APPROVED')
      throw new BadRequestException('Phiếu chưa được QL đội xe duyệt');

    const lineMap = new Map(dto.lines.map((l) => [l.lineId, l.approvedQty]));

    // Validate workshop stock availability per line
    for (const line of req.lines) {
      const approvedQty = lineMap.get(line.id) ?? 0;
      if (approvedQty <= 0) continue;

      const workshopStock = await this.prisma.partStock.findUnique({
        where: { partId_branchId: { partId: line.partId, branchId: req.toBranchId } },
        include: { part: true },
      });
      if (!workshopStock)
        throw new BadRequestException(`Phụ tùng chưa có tồn kho tại xưởng`);
      if (workshopStock.stockQty < approvedQty)
        throw new BadRequestException(
          `Không đủ tồn kho: ${workshopStock.part.name} (có: ${workshopStock.stockQty})`,
        );

      await this.prisma.partRequisitionLine.update({
        where: { id: line.id },
        data: { approvedQty },
      });
    }

    return this.prisma.partRequisition.update({
      where: { id },
      data: { status: 'PARTS_APPROVED', partsApprovedById: userId, partsApprovedAt: new Date() },
      include: { fromBranch: true, toBranch: true, lines: { include: { part: true } } },
    });
  }

  // Step 3: Giám đốc Hậu mãi / Super Admin duyệt cuối
  async finalApprove(id: string, userId: string) {
    const req = await this.prisma.partRequisition.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');
    if (req.status !== 'PARTS_APPROVED')
      throw new BadRequestException('Phiếu chưa được NV phụ tùng duyệt');

    return this.prisma.partRequisition.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      include: { fromBranch: true, toBranch: true, lines: { include: { part: true } } },
    });
  }

  // Step 4: Xưởng xác nhận đã gửi hàng — xuất kho
  async dispatch(id: string, dispatchNote: string | undefined, userId: string) {
    const req = await this.prisma.partRequisition.findUnique({
      where: { id },
      include: { lines: { include: { part: true } } },
    });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');
    if (req.status !== 'APPROVED')
      throw new BadRequestException('Phiếu chưa được duyệt cuối cùng');

    return this.prisma.$transaction(async (tx) => {
      for (const line of req.lines) {
        const approvedQty = line.approvedQty ?? 0;
        if (approvedQty <= 0) continue;

        const workshopStock = await tx.partStock.findUnique({
          where: { partId_branchId: { partId: line.partId, branchId: req.toBranchId } },
        });
        if (!workshopStock || workshopStock.stockQty < approvedQty) {
          throw new BadRequestException(
            `Không đủ tồn kho xưởng: ${line.part.name} (có: ${workshopStock?.stockQty ?? 0})`,
          );
        }

        await tx.partStock.update({
          where: { partId_branchId: { partId: line.partId, branchId: req.toBranchId } },
          data: { stockQty: { decrement: approvedQty } },
        });
        await tx.partTransaction.create({
          data: {
            partId: line.partId,
            branchId: req.toBranchId,
            type: 'TRANSFER_OUT',
            quantity: approvedQty,
            reference: req.code,
            note: `Xuất cấp phát cho ${req.fromBranchId}`,
            userId,
          },
        });
      }

      return tx.partRequisition.update({
        where: { id },
        data: { status: 'DISPATCHED', dispatchedById: userId, dispatchedAt: new Date(), dispatchNote },
        include: { fromBranch: true, toBranch: true, lines: { include: { part: true } } },
      });
    });
  }

  // Step 5: Chi nhánh đội xe xác nhận nhận + upload biên bản
  async confirmReceived(id: string, receiptFileId: string | undefined, userId: string) {
    const req = await this.prisma.partRequisition.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');
    if (req.status !== 'DISPATCHED')
      throw new BadRequestException('Hàng chưa được gửi đi');

    return this.prisma.$transaction(async (tx) => {
      for (const line of req.lines) {
        const approvedQty = line.approvedQty ?? 0;
        if (approvedQty <= 0) continue;

        // Upsert PartStock tại chi nhánh đội xe — catalog đã chia sẻ, chỉ cần tạo/cập nhật stock row
        await tx.partStock.upsert({
          where: { partId_branchId: { partId: line.partId, branchId: req.fromBranchId } },
          create: { partId: line.partId, branchId: req.fromBranchId, stockQty: approvedQty },
          update: { stockQty: { increment: approvedQty } },
        });
        await tx.partTransaction.create({
          data: {
            partId: line.partId,
            branchId: req.fromBranchId,
            type: 'TRANSFER_IN',
            quantity: approvedQty,
            reference: req.code,
            note: `Nhận cấp phát từ Xưởng`,
            userId,
          },
        });
      }

      return tx.partRequisition.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedById: userId,
          receivedAt: new Date(),
          receiptFileId: receiptFileId ?? null,
        },
        include: {
          fromBranch: true,
          toBranch: true,
          receivedBy: { omit: { passwordHash: true } },
          receiptFile: true,
          lines: { include: { part: true } },
        },
      });
    });
  }

  async reject(id: string, dto: RejectRequisitionDto, userId: string, step: string) {
    const req = await this.prisma.partRequisition.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Phiếu yêu cầu không tồn tại');

    const rejectableStatuses = ['SUBMITTED', 'FLEET_APPROVED', 'PARTS_APPROVED'];
    if (!rejectableStatuses.includes(req.status))
      throw new BadRequestException('Không thể từ chối phiếu ở trạng thái này');

    return this.prisma.partRequisition.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: dto.reason, rejectedStep: step },
    });
  }
}
