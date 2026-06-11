import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';
import { PushSubscriptionController } from './push-subscription.controller';
import { NotificationListenerService } from './notification-listener.service';

@Module({
  controllers: [NotificationsController, PushSubscriptionController],
  providers: [NotificationsService, PushService, NotificationListenerService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
