import { Injectable } from '@nestjs/common';
import { requestContextStorage } from './request-context-storage';

@Injectable()
export class RequestContextService {
  setContext(ctx: { userId?: string; ipAddress?: string; userAgent?: string }): void {
    requestContextStorage.enterWith(ctx);
  }

  getContext(): { userId?: string; ipAddress?: string; userAgent?: string } {
    return requestContextStorage.getStore() || {};
  }
}
