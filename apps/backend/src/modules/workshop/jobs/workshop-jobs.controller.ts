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
import { WorkshopJobsService } from './workshop-jobs.service';
import { CreateWorkshopJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { UpdateJobInfoDto } from './dto/update-job-info.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/auth.service';

@ApiTags('Workshop Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workshop/jobs')
export class WorkshopJobsController {
  constructor(private jobsService: WorkshopJobsService) {}

  @Post()
  @RequirePermissions('workshop_jobs:create')
  @ApiOperation({ summary: 'Tạo workshop job mới' })
  create(@Body() dto: CreateWorkshopJobDto) {
    return this.jobsService.create(dto);
  }

  @Get()
  @RequirePermissions('workshop_jobs:read')
  @ApiOperation({ summary: 'Danh sách workshop jobs' })
  findAll(@Query() query: QueryJobsDto, @CurrentUser() user: JwtPayload) {
    const branchScope = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'].includes(user.role)
      ? null
      : user.branchId;
    return this.jobsService.findAll(query, branchScope);
  }

  @Get(':id')
  @RequirePermissions('workshop_jobs:read')
  @ApiOperation({ summary: 'Chi tiết workshop job' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermissions('workshop_jobs:update')
  @ApiOperation({ summary: 'Cập nhật trạng thái workshop job' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.updateStatus(id, dto, user);
  }

  @Patch(':id/info')
  @RequirePermissions('workshop_jobs:update')
  @ApiOperation({ summary: 'Cập nhật mã DMS / file quyết toán (DMS chỉ nhập 1 lần)' })
  updateInfo(
    @Param('id') id: string,
    @Body() dto: UpdateJobInfoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.updateInfo(id, dto, user);
  }

  @Patch(':id/job-type')
  @RequirePermissions('workshop_jobs:update')
  @ApiOperation({ summary: 'Phân loại công việc (có thể chọn sau khi tiếp nhận)' })
  updateJobType(
    @Param('id') id: string,
    @Body() body: { jobType: string },
  ) {
    return this.jobsService.updateJobType(id, body.jobType);
  }
}
