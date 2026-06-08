import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRepairOrderDto {
  @ApiProperty()
  @IsUUID()
  jobId: string;

  @ApiProperty({ example: 15000 })
  @IsInt()
  @Min(0)
  odo: number;

  @ApiProperty({ example: 'Thay má phanh trước + sau' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Mã lệnh sửa chữa DMS' })
  @IsOptional()
  @IsString()
  dmsRef?: string;
}
