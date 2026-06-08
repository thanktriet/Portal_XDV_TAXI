import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransferBatchesService } from './transfer-batches.service';
import { CreateTransferBatchDto } from './dto/create-transfer-batch.dto';
import { RejectBatchDto } from './dto/reject-batch.dto';
import { QueryBatchDto } from './dto/query-batch.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@ApiTags('Part Transfer Batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parts/transfer-batches')
export class TransferBatchesController {
  constructor(private service: TransferBatchesService) {}

  @Post()
  @RequirePermissions('part_transfers:create')
  @ApiOperation({ summary: 'Tạo lô hoán đổi phụ tùng' })
  create(
    @Body() dto: CreateTransferBatchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Get()
  @RequirePermissions('part_transfers:read')
  @ApiOperation({ summary: 'Danh sách lô hoán đổi' })
  findAll(@Query() query: QueryBatchDto) {
    return this.service.findAll(query);
  }

  @Get('vehicle/:vehicleId/history')
  @RequirePermissions('part_transfers:read')
  @ApiOperation({ summary: 'Lịch sử hoán đổi phụ tùng theo xe' })
  getVehicleHistory(@Param('vehicleId') vehicleId: string) {
    return this.service.getVehicleHistory(vehicleId);
  }

  @Get(':id')
  @RequirePermissions('part_transfers:read')
  @ApiOperation({ summary: 'Chi tiết lô hoán đổi' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve')
  @RequirePermissions('part_transfers:approve')
  @ApiOperation({ summary: 'Duyệt lô hoán đổi' })
  approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('part_transfers:approve')
  @ApiOperation({ summary: 'Từ chối lô hoán đổi' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectBatchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.reject(id, userId, dto.reason);
  }

  @Post(':id/reverse')
  @RequirePermissions('part_transfers:approve')
  @ApiOperation({ summary: 'Tạo lô hoàn trả' })
  reverse(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.reverse(id, userId);
  }
}
