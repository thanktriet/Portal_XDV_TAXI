import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TransferLineDto {
  @ApiProperty({ example: 'Lọc dầu động cơ' })
  @IsString()
  @IsNotEmpty()
  itemDescription: string;

  @ApiPropertyOptional({ description: 'ID phụ tùng nếu có trong hệ thống' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiProperty()
  @IsUUID()
  fromVehicleId: string;

  @ApiProperty()
  @IsUUID()
  toVehicleId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateTransferBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Liên kết với Workshop Job' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiProperty({ type: [TransferLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}
