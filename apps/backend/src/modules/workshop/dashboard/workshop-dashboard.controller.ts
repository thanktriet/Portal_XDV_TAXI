import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkshopDashboardService } from './workshop-dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/auth.service';

@ApiTags('Workshop Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workshop/dashboard')
export class WorkshopDashboardController {
  constructor(private dashboardService: WorkshopDashboardService) {}

  @Get()
  @RequirePermissions('workshop_jobs:read')
  @ApiOperation({ summary: 'Workshop dashboard stats' })
  getStats(@CurrentUser() user: JwtPayload) {
    const branchScope = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'].includes(user.role)
      ? null
      : user.branchId;
    return this.dashboardService.getStats(branchScope);
  }
}
