import { IsString, IsInt, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMaintenancePlanDto {
  @ApiProperty({ example: 'Thay dầu động cơ' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalKm: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['Thay dầu', 'Thay lọc dầu'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tasks?: string[];
}

export class UpdateMaintenancePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tasks?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
