import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Technicians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('technicians')
export class TechniciansController {
  constructor(private service: TechniciansService) {}

  @Post()
  @RequirePermissions('technicians:create')
  @ApiOperation({ summary: 'Thêm kỹ thuật viên' })
  create(@Body() dto: CreateTechnicianDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions('technicians:read')
  @ApiOperation({ summary: 'Danh sách kỹ thuật viên' })
  findAll(@Query('branchId') branchId?: string) {
    return this.service.findAll(branchId);
  }

  @Get(':id')
  @RequirePermissions('technicians:read')
  @ApiOperation({ summary: 'Chi tiết kỹ thuật viên' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('technicians:update')
  @ApiOperation({ summary: 'Cập nhật kỹ thuật viên' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTechnicianDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('technicians:delete')
  @ApiOperation({ summary: 'Vô hiệu hoá kỹ thuật viên' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
