import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentStatus } from '@prisma/client';

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
