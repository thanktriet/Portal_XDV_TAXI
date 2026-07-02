import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
