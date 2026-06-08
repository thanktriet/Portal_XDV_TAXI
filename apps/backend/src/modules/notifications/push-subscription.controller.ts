import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushService } from './push.service';
import { PushSubscriptionDto, UnsubscribeDto } from './dto/push-subscription.dto';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications/push')
export class PushSubscriptionController {
  constructor(private pushService: PushService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Đăng ký nhận push notification' })
  subscribe(
    @CurrentUser('sub') userId: string,
    @Body() dto: PushSubscriptionDto,
  ) {
    return this.pushService.saveSubscription(userId, dto);
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Hủy đăng ký push notification' })
  unsubscribe(
    @CurrentUser('sub') userId: string,
    @Body() dto: UnsubscribeDto,
  ) {
    return this.pushService.removeSubscription(userId, dto.endpoint);
  }
}
