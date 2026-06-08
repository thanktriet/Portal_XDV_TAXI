import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordOdoDto {
  @ApiProperty({ example: 15000 })
  @IsInt()
  @Min(0)
  odo: number;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  source?: string;
}
