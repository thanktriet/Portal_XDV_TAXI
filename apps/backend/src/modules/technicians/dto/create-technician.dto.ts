import { IsUUID, IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTechnicianDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Kỹ thuật viên' })
  @IsString()
  title: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  skillLevel: number;

  @ApiPropertyOptional({ example: 'Hệ thống phanh' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;
}
