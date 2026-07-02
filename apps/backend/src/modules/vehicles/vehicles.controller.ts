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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { VehiclesService } from './vehicles.service';
import { VehicleImportService } from './vehicle-import.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { RecordOdoDto } from './dto/record-odo.dto';
import { TransferVehicleDto } from './dto/transfer-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private vehiclesService: VehiclesService,
    private importService: VehicleImportService,
  ) {}

  @Post()
  @RequirePermissions('vehicles:create')
  @ApiOperation({ summary: 'Thêm xe mới' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Get()
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Danh sách xe' })
  findAll(@Query() query: QueryVehicleDto, @CurrentUser() user: JwtPayload) {
    const branchScope = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'].includes(user.role)
      ? null
      : user.branchId;
    return this.vehiclesService.findAll(query, branchScope);
  }

  @Get('export')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Xuất danh sách xe ra Excel' })
  async exportExcel(
    @Query() query: QueryVehicleDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const branchScope = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'].includes(user.role)
      ? null
      : user.branchId;
    const buffer = await this.vehiclesService.exportToExcel(query, branchScope);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=danh-sach-xe.xlsx');
    res.send(buffer);
  }

  @Get(':id')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Chi tiết xe' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post(':id/documents')
  @RequirePermissions('vehicles:update')
  @ApiOperation({ summary: 'Đính kèm giấy tờ xe (fileId từ /files/upload)' })
  addDocument(
    @Param('id') id: string,
    @Body() body: { fileId: string; category: string },
  ) {
    return this.vehiclesService.addDocument(id, body.fileId, body.category);
  }

  @Delete(':id/documents/:docId')
  @RequirePermissions('vehicles:update')
  @ApiOperation({ summary: 'Xoá giấy tờ xe' })
  removeDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.vehiclesService.removeDocument(id, docId);
  }

  @Patch(':id')
  @RequirePermissions('vehicles:update')
  @ApiOperation({ summary: 'Cập nhật thông tin xe' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Post(':id/odo')
  @RequirePermissions('vehicles:update')
  @ApiOperation({ summary: 'Ghi nhận ODO mới' })
  recordOdo(
    @Param('id') id: string,
    @Body() dto: RecordOdoDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.vehiclesService.recordOdo(id, dto, userId);
  }

  @Get(':id/odo-history')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Lịch sử ODO' })
  getOdoHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vehiclesService.getOdoHistory(id, page, limit);
  }

  @Post(':id/transfer')
  @RequirePermissions('vehicles:transfer')
  @ApiOperation({ summary: 'Điều chuyển xe sang chi nhánh khác' })
  transfer(
    @Param('id') id: string,
    @Body() dto: TransferVehicleDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.vehiclesService.transfer(id, dto, userId);
  }

  @Get(':id/transfer-history')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Lịch sử điều chuyển' })
  getTransferHistory(@Param('id') id: string) {
    return this.vehiclesService.getTransferHistory(id);
  }

  @Post('import')
  @RequirePermissions('vehicles:create')
  @ApiOperation({ summary: 'Import xe từ Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Vui lòng chọn file');
    return this.importService.importFromExcel(file.buffer);
  }

  @Get('import/template')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Tải template import xe' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.importService.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=import-xe-template.xlsx');
    res.send(buffer);
  }
}
