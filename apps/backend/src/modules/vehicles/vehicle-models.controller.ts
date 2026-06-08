import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vehicle Models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicle-models')
export class VehicleModelsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách model xe' })
  findAll() {
    return this.prisma.vehicleModel.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
