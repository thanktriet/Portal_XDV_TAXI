import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkshopJobType } from '@prisma/client';

export class CreateWorkshopJobDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: 15000 })
  @IsInt()
  @Min(0)
  odoAtEntry: number;

  @ApiProperty({ example: 'Xe bị rung khi phanh' })
  @IsString()
  @IsNotEmpty()
  entryReason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiProperty()
  @IsUUID()
  advisorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional({ enum: WorkshopJobType, description: 'Phân loại công việc — có thể chọn sau' })
  @IsOptional()
  @IsEnum(WorkshopJobType)
  jobType?: WorkshopJobType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryPersonName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryPersonPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dmsRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;
}
