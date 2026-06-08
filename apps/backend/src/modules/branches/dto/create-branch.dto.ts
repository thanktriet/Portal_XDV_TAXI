import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchType } from '@prisma/client';

export class CreateBranchDto {
  @ApiProperty({ example: 'Chi nhánh Hà Nội' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'HN01' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ enum: BranchType, default: BranchType.COMBINED })
  @IsOptional()
  @IsEnum(BranchType)
  type?: BranchType;

  @ApiPropertyOptional({ example: '123 Nguyễn Trãi, Hà Nội' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0241234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
