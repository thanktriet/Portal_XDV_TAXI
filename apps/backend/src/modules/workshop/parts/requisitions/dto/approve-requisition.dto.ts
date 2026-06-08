import { IsArray, ValidateNested, IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApproveLineDto {
  @ApiProperty()
  @IsUUID()
  lineId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  approvedQty: number;
}

export class ApproveRequisitionDto {
  @ApiProperty({ type: [ApproveLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveLineDto)
  lines: ApproveLineDto[];
}

export class RejectRequisitionDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
