import { IsUUID, IsString, IsNotEmpty, IsInt, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReplacementItemDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Mô tả phụ tùng thay thế' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Tình trạng phụ tùng cũ' })
  @IsOptional()
  @IsString()
  oldPartCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateFleetReplacementDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Mô tả chung công việc thay thế' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'ODO xe khi thay' })
  @IsInt()
  @Min(0)
  odoAtService: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [ReplacementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplacementItemDto)
  items: ReplacementItemDto[];
}

export class RejectReplacementDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
