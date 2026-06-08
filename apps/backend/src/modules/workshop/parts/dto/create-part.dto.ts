import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePartDto {
  @ApiProperty({ example: 'PT-BRAKE-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Má phanh trước VF e34' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ default: 'cái' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiProperty({ example: 350000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ description: 'Chi nhánh kho ban đầu (thường là xưởng)' })
  @IsOptional()
  @IsUUID()
  initialStockBranchId?: string;

  @ApiPropertyOptional({ example: 10, description: 'Số lượng nhập kho ban đầu' })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialQty?: number;
}
