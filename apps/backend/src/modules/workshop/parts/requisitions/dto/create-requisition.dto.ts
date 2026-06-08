import { IsUUID, IsOptional, IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RequisitionLineDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  requestedQty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateRequisitionDto {
  @ApiProperty({ description: 'Chi nhánh yêu cầu (from)' })
  @IsUUID()
  fromBranchId: string;

  @ApiProperty({ description: 'Chi nhánh cấp phát (HQ/to)' })
  @IsUUID()
  toBranchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [RequisitionLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitionLineDto)
  lines: RequisitionLineDto[];
}
