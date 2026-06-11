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
import { RepairOrdersService } from './repair-orders.service';
import { CreateRepairOrderDto } from './dto/create-repair-order.dto';
import { AddRepairOrderItemDto } from './dto/add-ro-item.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Repair Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workshop/repair-orders')
export class RepairOrdersController {
  constructor(private roService: RepairOrdersService) {}

  @Post()
  @RequirePermissions('repair_orders:create')
  @ApiOperation({ summary: 'Tạo Repair Order' })
  create(@Body() dto: CreateRepairOrderDto, @CurrentUser('sub') userId: string) {
    return this.roService.create(dto, userId);
  }

  @Get()
  @RequirePermissions('repair_orders:read')
  @ApiOperation({ summary: 'Danh sách Repair Orders' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.roService.findAll(page, limit, search);
  }

  @Get(':id')
  @RequirePermissions('repair_orders:read')
  @ApiOperation({ summary: 'Chi tiết Repair Order' })
  findOne(@Param('id') id: string) {
    return this.roService.findOne(id);
  }

  @Post(':id/items')
  @RequirePermissions('repair_orders:update')
  @ApiOperation({ summary: 'Thêm item vào Repair Order' })
  addItem(@Param('id') id: string, @Body() dto: AddRepairOrderItemDto) {
    return this.roService.addItem(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('repair_orders:update')
  @ApiOperation({ summary: 'Cập nhật trạng thái Repair Order' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.roService.updateStatus(id, status);
  }
}
