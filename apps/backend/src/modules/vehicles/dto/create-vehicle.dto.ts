import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ example: '30A-12345' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ example: 'VINFAST1234567890' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty()
  @IsUUID()
  modelId: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(2000)
  yearMfg: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registeredAt?: string;

  @ApiPropertyOptional({ description: 'Đơn vị sở hữu xe (nhập tay)' })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Số tài xế đang chạy xe' })
  @IsOptional()
  @IsString()
  driverCode?: string;

  @ApiPropertyOptional({ description: 'Họ tên tài xế đang chạy xe' })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại tài xế' })
  @IsOptional()
  @IsString()
  driverPhone?: string;

  @ApiPropertyOptional({ description: 'Hạn đăng kiểm (ISO date)' })
  @IsOptional()
  @IsDateString()
  inspectionExpiry?: string;

  @ApiPropertyOptional({ description: 'Hạn bảo hiểm (ISO date)' })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentOdo?: number;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
