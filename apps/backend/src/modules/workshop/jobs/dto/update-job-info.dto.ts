import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobInfoDto {
  @ApiPropertyOptional({ description: 'Mã lệnh DMS — chỉ nhập 1 lần cho mỗi job' })
  @IsOptional()
  @IsString()
  dmsRef?: string;

  @ApiPropertyOptional({ description: 'File quyết toán đính kèm (id từ /files/upload)' })
  @IsOptional()
  @IsUUID()
  settlementFileId?: string;
}
