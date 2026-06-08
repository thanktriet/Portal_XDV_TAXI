import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ example: '30A-12345' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ example: 'VINFAST1234567890' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty()
  @IsUUID()
  modelId: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(2000)
  yearMfg: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registeredAt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentOdo?: number;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
