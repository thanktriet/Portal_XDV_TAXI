import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogParams {
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          oldData: params.oldData ?? undefined,
          newData: params.newData ?? undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      // Audit log failure should never break the actual operation
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
    }
  }

  formatAction(resource: string, operation: 'create' | 'update' | 'delete'): string {
    return `${resource.toUpperCase()}_${operation.toUpperCase()}`;
  }
}
