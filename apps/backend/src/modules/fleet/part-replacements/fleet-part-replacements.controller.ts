import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FleetPartReplacementsService } from './fleet-part-replacements.service';
import { CreateFleetReplacementDto, RejectReplacementDto } from './dto/create-replacement.dto';

@ApiTags('Fleet Part Replacements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/part-replacements')
export class FleetPartReplacementsController {
  constructor(private readonly service: FleetPartReplacementsService) {}

  @Post()
  create(@Body() dto: CreateFleetReplacementDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.service.findAll(+page, +limit, branchId, status, vehicleId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.service.approve(id, req.user.sub);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectReplacementDto, @Req() req: any) {
    return this.service.reject(id, dto, req.user.sub);
  }

  @Patch(':id/return-parts')
  confirmPartsReturned(
    @Param('id') id: string,
    @Body() body: { itemIds: string[] },
    @Req() req: any,
  ) {
    return this.service.confirmPartsReturned(id, body.itemIds, req.user.sub);
  }
}
