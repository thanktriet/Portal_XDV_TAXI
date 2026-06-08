import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePartDto } from './dto/create-part.dto';
import { CreatePartTransactionDto } from './dto/create-part-transaction.dto';

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePartDto, userId: string) {
    const existing = await this.prisma.part.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Mã phụ tùng '${dto.code}' đã tồn tại`);

    const part = await this.prisma.part.create({
      data: {
        code: dto.code,
        name: dto.name,
        categoryId: dto.categoryId,
        unit: dto.unit ?? 'cái',
        minStock: dto.minStock ?? 0,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
        supplier: dto.supplier,
      },
      include: { category: true },
    });

    if (dto.initialStockBranchId && dto.initialQty && dto.initialQty > 0) {
      await this.prisma.$transaction([
        this.prisma.partStock.create({
          data: { partId: part.id, branchId: dto.initialStockBranchId, stockQty: dto.initialQty },
        }),
        this.prisma.partTransaction.create({
          data: {
            partId: part.id,
            branchId: dto.initialStockBranchId,
            type: 'IMPORT',
            quantity: dto.initialQty,
            userId,
            note: 'Nhập kho ban đầu',
          },
        }),
      ]);
    }

    return part;
  }

  async findAll(page = 1, limit = 20, search?: string, branchId?: string, categoryId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.part.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          category: true,
          stocks: branchId ? { where: { branchId } } : true,
        },
      }),
      this.prisma.part.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const part = await this.prisma.part.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: { include: { branch: true } },
        transactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { omit: { passwordHash: true } }, branch: true },
        },
      },
    });
    if (!part) throw new NotFoundException('Phụ tùng không tồn tại');
    return part;
  }

  async createTransaction(dto: CreatePartTransactionDto, userId: string) {
    const part = await this.prisma.part.findUnique({ where: { id: dto.partId } });
    if (!part) throw new NotFoundException('Phụ tùng không tồn tại');

    const stock = await this.prisma.partStock.upsert({
      where: { partId_branchId: { partId: dto.partId, branchId: dto.branchId } },
      create: { partId: dto.partId, branchId: dto.branchId, stockQty: 0 },
      update: {},
    });

    const OUT_TYPES = ['EXPORT', 'TRANSFER_OUT'];
    if (OUT_TYPES.includes(dto.type) && stock.stockQty < dto.quantity) {
      throw new BadRequestException(
        `Không đủ tồn kho. Hiện có: ${stock.stockQty}, yêu cầu: ${dto.quantity}`,
      );
    }

    const IN_TYPES = ['IMPORT', 'TRANSFER_IN', 'RETURN'];
    let delta: number;
    if (dto.type === 'ADJUST') {
      delta = dto.quantity - stock.stockQty;
    } else if (IN_TYPES.includes(dto.type)) {
      delta = dto.quantity;
    } else {
      delta = -dto.quantity;
    }

    await this.prisma.$transaction([
      this.prisma.partStock.update({
        where: { partId_branchId: { partId: dto.partId, branchId: dto.branchId } },
        data: { stockQty: { increment: delta } },
      }),
      this.prisma.partTransaction.create({
        data: {
          partId: dto.partId,
          branchId: dto.branchId,
          type: dto.type,
          quantity: dto.quantity,
          reference: dto.reference,
          note: dto.note,
          userId,
        },
      }),
    ]);

    return { success: true };
  }

  async getCategories() {
    return this.prisma.partCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async getLowStock(branchId?: string) {
    const stocks = await this.prisma.partStock.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        part: { isActive: true },
      },
      include: { part: { include: { category: true } }, branch: true },
    });
    return stocks.filter((s) => s.stockQty <= s.part.minStock);
  }
}
