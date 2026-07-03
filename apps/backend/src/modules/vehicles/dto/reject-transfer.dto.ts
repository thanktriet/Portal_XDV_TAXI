import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectTransferDto {
  @ApiProperty({ description: 'Lý do từ chối điều chuyển' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
