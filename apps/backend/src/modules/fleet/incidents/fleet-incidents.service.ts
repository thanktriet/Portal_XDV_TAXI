import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
import { CreateFleetIncidentDto } from './dto/create-incident.dto';
import { QueryIncidentDto } from './dto/query-incident.dto';
import { IncidentStatus } from '@prisma/client';

@Injectable()
export class FleetIncidentsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async generateCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.fleetIncident.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    return `INC-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateFleetIncidentDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Xe không tồn tại');

    const code = await this.generateCode();

    const incident = await this.prisma.fleetIncident.create({
      data: {
        code,
        vehicleId: dto.vehicleId,
        reporterId: userId,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, model: { select: { name: true } } } },
        reporter: { select: { id: true, fullName: true } },
      },
    });

    this.eventEmitter.emit('fleet.incident.created', {
      incidentId: incident.id,
      vehicleId: dto.vehicleId,
      reporterId: userId,
    });

    return incident;
  }

  async findAll(query: QueryIncidentDto) {
    const { vehicleId, status, priority, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [data, total] = await Promise.all([
      this.prisma.fleetIncident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { select: { id: true, licensePlate: true, model: { select: { name: true } } } },
          reporter: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.fleetIncident.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const incident = await this.prisma.fleetIncident.findUnique({
      where: { id },
      include: {
        vehicle: { include: { model: true, branch: true } },
        reporter: { select: { id: true, fullName: true, phone: true } },
        files: true,
      },
    });
    if (!incident) throw new NotFoundException('Sự cố không tồn tại');
    return incident;
  }

  async updateStatus(id: string, status: IncidentStatus) {
    const incident = await this.prisma.fleetIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Sự cố không tồn tại');

    const data: any = { status };
    if (status === IncidentStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    return this.prisma.fleetIncident.update({
      where: { id },
      data,
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        reporter: { select: { id: true, fullName: true } },
      },
    });
  }
}
