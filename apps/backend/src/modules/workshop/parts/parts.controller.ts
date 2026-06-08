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
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { CreatePartTransactionDto } from './dto/create-part-transaction.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workshop/parts')
export class PartsController {
  constructor(private partsService: PartsService) {}

  @Post()
  @RequirePermissions('parts:create')
  @ApiOperation({ summary: 'Tạo phụ tùng mới' })
  create(@Body() dto: CreatePartDto, @CurrentUser('sub') userId: string) {
    return this.partsService.create(dto, userId);
  }

  @Get()
  @RequirePermissions('parts:read')
  @ApiOperation({ summary: 'Danh sách phụ tùng' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.partsService.findAll(page, limit, search, branchId, categoryId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Danh sách nhóm phụ tùng' })
  getCategories() {
    return this.partsService.getCategories();
  }

  @Get('low-stock')
  @RequirePermissions('parts:read')
  @ApiOperation({ summary: 'Phụ tùng sắp hết' })
  getLowStock(@Query('branchId') branchId?: string) {
    return this.partsService.getLowStock(branchId);
  }

  @Get(':id')
  @RequirePermissions('parts:read')
  @ApiOperation({ summary: 'Chi tiết phụ tùng' })
  findOne(@Param('id') id: string) {
    return this.partsService.findOne(id);
  }

  @Post('transactions')
  @RequirePermissions('parts:update')
  @ApiOperation({ summary: 'Nhập/Xuất kho phụ tùng' })
  createTransaction(
    @Body() dto: CreatePartTransactionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.partsService.createTransaction(dto, userId);
  }
}
