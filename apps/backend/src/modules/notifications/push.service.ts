import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private isConfigured = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const vapidPublicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@xdvtaxi.com');

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      this.logger.log('Web Push configured successfully');
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  async saveSubscription(userId: string, data: { endpoint: string; p256dh: string; auth: string }) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { userId, p256dh: data.p256dh, auth: data.auth },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendPush(userId: string, payload: { title: string; body: string; url?: string; tag?: string; notificationId?: string }) {
    if (!this.isConfigured) {
      this.logger.warn('Push not configured, skipping');
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          );
        } catch (error: any) {
          // Remove invalid subscriptions (410 Gone or 404)
          if (error.statusCode === 410 || error.statusCode === 404) {
            this.logger.log(`Removing expired subscription: ${sub.endpoint.slice(0, 50)}...`);
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
          } else {
            this.logger.error(`Push failed for ${sub.endpoint.slice(0, 50)}...`, error.message);
          }
          throw error;
        }
      }),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(`Push to user ${userId}: ${sent} sent, ${failed} failed`);
    }
  }

  async sendPushToMultipleUsers(userIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) {
    await Promise.allSettled(
      userIds.map((userId) => this.sendPush(userId, payload)),
    );
  }
}
