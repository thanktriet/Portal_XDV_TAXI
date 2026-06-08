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
import { FleetIncidentsService } from './fleet-incidents.service';
import { CreateFleetIncidentDto } from './dto/create-incident.dto';
import { QueryIncidentDto } from './dto/query-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Fleet Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fleet/incidents')
export class FleetIncidentsController {
  constructor(private service: FleetIncidentsService) {}

  @Post()
  @RequirePermissions('fleet_incidents:create')
  @ApiOperation({ summary: 'Báo sự cố' })
  create(
    @Body() dto: CreateFleetIncidentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Get()
  @RequirePermissions('fleet_incidents:read')
  @ApiOperation({ summary: 'Danh sách sự cố' })
  findAll(@Query() query: QueryIncidentDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('fleet_incidents:read')
  @ApiOperation({ summary: 'Chi tiết sự cố' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermissions('fleet_incidents:update')
  @ApiOperation({ summary: 'Cập nhật trạng thái sự cố' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }
}
