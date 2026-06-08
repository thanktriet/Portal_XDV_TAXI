import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectBatchDto {
  @ApiProperty({ example: 'Không đủ tồn kho tại chi nhánh' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
