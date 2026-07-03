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
import { RejectTransferDto } from './dto/reject-transfer.dto';
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

  @Get('transfers')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Danh sách yêu cầu điều chuyển (chờ duyệt/nhận)' })
  findTransfers(
    @Query('status') status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const branchScope = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'].includes(user.role)
      ? null
      : user.branchId;
    return this.vehiclesService.findTransfers(status, branchScope);
  }

  @Post(':id/transfers')
  @RequirePermissions('vehicles:transfer')
  @ApiOperation({ summary: 'Tạo yêu cầu điều chuyển xe' })
  requestTransfer(
    @Param('id') id: string,
    @Body() dto: TransferVehicleDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.vehiclesService.requestTransfer(id, dto, userId);
  }

  @Patch('transfers/:transferId/approve')
  @RequirePermissions('vehicles:transfer')
  @ApiOperation({ summary: 'Duyệt yêu cầu điều chuyển' })
  approveTransfer(@Param('transferId') transferId: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.approveTransfer(transferId, user);
  }

  @Patch('transfers/:transferId/receive')
  @RequirePermissions('vehicles:transfer')
  @ApiOperation({ summary: 'Đội nhận xác nhận đã nhận xe' })
  receiveTransfer(@Param('transferId') transferId: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.receiveTransfer(transferId, user);
  }

  @Patch('transfers/:transferId/reject')
  @RequirePermissions('vehicles:transfer')
  @ApiOperation({ summary: 'Từ chối yêu cầu điều chuyển' })
  rejectTransfer(
    @Param('transferId') transferId: string,
    @Body() dto: RejectTransferDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.rejectTransfer(transferId, dto.reason, user);
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

  @Post('import/odo')
  @RequirePermissions('vehicles:update')
  @ApiOperation({ summary: 'Cập nhật ODO hàng loạt từ Excel (không thêm xe mới)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importOdo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) throw new Error('Vui lòng chọn file');
    return this.importService.importOdoFromExcel(file.buffer, userId);
  }

  @Get('import/odo/template')
  @RequirePermissions('vehicles:read')
  @ApiOperation({ summary: 'Tải template cập nhật ODO' })
  async downloadOdoTemplate(@Res() res: Response) {
    const buffer = await this.importService.getOdoTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cap-nhat-odo-template.xlsx');
    res.send(buffer);
  }
}
