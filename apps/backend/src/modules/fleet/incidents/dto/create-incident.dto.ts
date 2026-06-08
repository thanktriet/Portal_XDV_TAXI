import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentPriority } from '@prisma/client';

export class CreateFleetIncidentDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ example: 'Xe bị va chạm tại ngã tư Cầu Giấy' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: IncidentPriority, default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;
}
