import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsNotEmpty()
  @IsUrl({}, { message: 'endpoint must be a valid URL' })
  endpoint: string;

  @ApiProperty({ description: 'Client public key (p256dh)' })
  @IsNotEmpty()
  @IsString()
  p256dh: string;

  @ApiProperty({ description: 'Client auth secret' })
  @IsNotEmpty()
  @IsString()
  auth: string;
}

export class UnsubscribeDto {
  @ApiProperty({ description: 'Push subscription endpoint URL to remove' })
  @IsNotEmpty()
  @IsUrl({}, { message: 'endpoint must be a valid URL' })
  endpoint: string;
}
