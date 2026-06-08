import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartTransactionType } from '@prisma/client';

export class CreatePartTransactionDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Chi nhánh thay đổi tồn kho' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ enum: PartTransactionType })
  @IsEnum(PartTransactionType)
  type: PartTransactionType;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'PO-2024-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
