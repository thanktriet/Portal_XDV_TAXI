import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PartRequisitionsService } from './part-requisitions.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { ApproveRequisitionDto, RejectRequisitionDto } from './dto/approve-requisition.dto';

@ApiTags('Part Requisitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parts/requisitions')
export class PartRequisitionsController {
  constructor(private readonly service: PartRequisitionsService) {}

  @Post()
  create(@Body() dto: CreateRequisitionDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('fromBranchId') fromBranchId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(+page, +limit, fromBranchId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Step 1: Quản lý đội xe duyệt
  @Patch(':id/fleet-approve')
  fleetApprove(@Param('id') id: string, @Req() req: any) {
    return this.service.fleetApprove(id, req.user.sub);
  }

  // Step 2: NV phụ tùng / QL xưởng duyệt số lượng
  @Patch(':id/parts-approve')
  partsApprove(@Param('id') id: string, @Body() dto: ApproveRequisitionDto, @Req() req: any) {
    return this.service.partsApprove(id, dto, req.user.sub);
  }

  // Step 3: GĐ Hậu mãi / Super Admin duyệt cuối
  @Patch(':id/final-approve')
  finalApprove(@Param('id') id: string, @Req() req: any) {
    return this.service.finalApprove(id, req.user.sub);
  }

  // Step 4: Xưởng gửi hàng
  @Patch(':id/dispatch')
  dispatch(
    @Param('id') id: string,
    @Body() body: { dispatchNote?: string },
    @Req() req: any,
  ) {
    return this.service.dispatch(id, body.dispatchNote, req.user.sub);
  }

  // Step 5: Đội xe xác nhận nhận hàng
  @Patch(':id/receive')
  confirmReceived(
    @Param('id') id: string,
    @Body() body: { receiptFileId?: string },
    @Req() req: any,
  ) {
    return this.service.confirmReceived(id, body.receiptFileId, req.user.sub);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRequisitionDto,
    @Query('step') step: string,
    @Req() req: any,
  ) {
    return this.service.reject(id, dto, req.user.sub, step || 'unknown');
  }
}
