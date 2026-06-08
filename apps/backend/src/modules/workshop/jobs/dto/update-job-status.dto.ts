import { IsEnum, IsOptional, IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkshopJobStatus } from '@prisma/client';

export class UpdateJobStatusDto {
  @ApiProperty({ enum: WorkshopJobStatus })
  @IsEnum(WorkshopJobStatus)
  status: WorkshopJobStatus;

  @ApiProperty({ description: 'Ghi chú bắt buộc khi chuyển giai đoạn' })
  @IsString()
  @IsNotEmpty()
  note: string;

  @ApiPropertyOptional({ description: 'Mã lệnh DMS (bảo hành, phụ tùng, sửa chữa...)' })
  @IsOptional()
  @IsString()
  dmsRef?: string;

  @ApiPropertyOptional({ description: 'Chi phí dự kiến — nhập khi chuyển sang QUOTED' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;
}
