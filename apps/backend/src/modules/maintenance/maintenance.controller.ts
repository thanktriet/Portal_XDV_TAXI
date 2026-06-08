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
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { CreateMaintenancePlanDto, UpdateMaintenancePlanDto } from './dto/maintenance-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  // ── Plans ──────────────────────────────────────────────

  @Get('plans')
  @RequirePermissions('maintenance:read')
  @ApiOperation({ summary: 'Danh sách kế hoạch bảo dưỡng' })
  getPlans() {
    return this.service.getPlans();
  }

  @Post('plans')
  @RequirePermissions('maintenance_plans:create')
  @ApiOperation({ summary: 'Tạo kế hoạch bảo dưỡng' })
  createPlan(@Body() dto: CreateMaintenancePlanDto) {
    return this.service.createPlan(dto);
  }

  @Patch('plans/:id')
  @RequirePermissions('maintenance_plans:update')
  @ApiOperation({ summary: 'Cập nhật kế hoạch bảo dưỡng' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateMaintenancePlanDto) {
    return this.service.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @RequirePermissions('maintenance_plans:delete')
  @ApiOperation({ summary: 'Xóa / vô hiệu kế hoạch bảo dưỡng' })
  deletePlan(@Param('id') id: string) {
    return this.service.deletePlan(id);
  }

  // ── Records ────────────────────────────────────────────

  @Post('records')
  @RequirePermissions('maintenance:create')
  @ApiOperation({ summary: 'Ghi nhận bảo dưỡng' })
  createRecord(@Body() dto: CreateMaintenanceRecordDto) {
    return this.service.createRecord(dto);
  }

  @Get('records')
  @RequirePermissions('maintenance:read')
  @ApiOperation({ summary: 'Danh sách bảo dưỡng' })
  findAll(@Query() query: QueryMaintenanceDto) {
    return this.service.findAll(query);
  }

  @Get('due')
  @RequirePermissions('maintenance:read')
  @ApiOperation({ summary: 'Xe cần bảo dưỡng (tính động từ ODO)' })
  getDueVehicles(@Query('branchId') branchId?: string) {
    return this.service.getDueVehicles(branchId);
  }

  @Patch('records/:id/status')
  @RequirePermissions('maintenance:update')
  @ApiOperation({ summary: 'Cập nhật trạng thái bảo dưỡng' })
  markStatus(
    @Param('id') id: string,
    @Body('status') status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED',
  ) {
    return this.service.markStatus(id, status);
  }
}
