import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private service: RolesService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Danh sách roles' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Chi tiết role + permissions' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/permissions')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Gán permissions cho role' })
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.service.updatePermissions(id, dto.permissionIds);
  }
}
