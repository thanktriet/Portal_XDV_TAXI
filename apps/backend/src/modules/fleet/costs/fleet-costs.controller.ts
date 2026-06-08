import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FleetCostsService } from './fleet-costs.service';
import { CreateFleetCostDto } from './dto/create-fleet-cost.dto';
import { QueryFleetCostDto } from './dto/query-fleet-cost.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Fleet Costs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fleet/costs')
export class FleetCostsController {
  constructor(private service: FleetCostsService) {}

  @Post()
  @RequirePermissions('fleet_costs:create')
  @ApiOperation({ summary: 'Thêm chi phí xe' })
  create(
    @Body() dto: CreateFleetCostDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Get()
  @RequirePermissions('fleet_costs:read')
  @ApiOperation({ summary: 'Danh sách chi phí' })
  findAll(@Query() query: QueryFleetCostDto) {
    return this.service.findAll(query);
  }

  @Get('summary')
  @RequirePermissions('fleet_costs:read')
  @ApiOperation({ summary: 'Tổng hợp chi phí theo loại' })
  getSummary(
    @Query('vehicleId') vehicleId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSummary(vehicleId, from, to);
  }
}
