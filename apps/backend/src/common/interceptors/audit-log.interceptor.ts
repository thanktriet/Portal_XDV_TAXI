import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextService } from '../context/request-context.service';
import { AuditLogService } from '../../modules/audit-logs/audit-log.service';
import { JwtPayload } from '../../modules/auth/auth.service';

// Map HTTP methods to action suffixes
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATED',
  PUT: 'UPDATED',
  PATCH: 'UPDATED',
  DELETE: 'DELETED',
};

// Map URL patterns to resource names
// This maps URL prefixes to model names
const URL_RESOURCE_MAP: Record<string, string> = {
  '/users': 'User',
  '/branches': 'Branch',
  '/vehicles': 'Vehicle',
  '/vehicle-models': 'VehicleModel',
  '/workshop/jobs': 'WorkshopJob',
  '/workshop/repair-orders': 'RepairOrder',
  '/workshop/parts': 'Part',
  '/workshop/transfer-batches': 'PartTransferBatch',
  '/workshop/requisitions': 'PartRequisition',
  '/fleet/costs': 'FleetCost',
  '/fleet/incidents': 'FleetIncident',
  '/fleet/part-replacements': 'FleetPartReplacement',
  '/maintenance/plans': 'MaintenancePlan',
  '/maintenance/records': 'MaintenanceRecord',
  '/technicians': 'Technician',
  '/roles': 'Role',
  '/permissions': 'Permission',
  '/files': 'File',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method.toUpperCase();

    // Only intercept mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user as JwtPayload | undefined;
    const ipAddress =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'] || '';

    this.requestContextService.setContext({
      userId: user?.sub,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
      userAgent,
    });

    // Get resource from URL
    const resource = this.getResourceFromUrl(request.url);

    return next.handle().pipe(
      tap(async (responseBody) => {
        // Only log successful responses with data
        if (!responseBody || responseBody === undefined) return;

        // For DELETE, response might be empty or just { success: true }
        if (method === 'DELETE') {
          // Try to extract resourceId from response or request
          const resourceId = responseBody?.id?.toString() ||
                           request.params?.id?.toString() ||
                           '';
          await this.safeLog({
            userId: user?.sub,
            action: `${resource}_DELETED`,
            resource,
            resourceId,
            userAgent,
            ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
          });
          return;
        }

        // For POST (create), responseBody should contain the created object
        if (method === 'POST' && responseBody?.data) {
          const data = responseBody.data;
          const resourceId = data?.id?.toString() || '';
          await this.safeLog({
            userId: user?.sub,
            action: `${resource}_CREATED`,
            resource,
            resourceId,
            newData: data,
            userAgent,
            ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
          });
        }
      }),
    );
  }

  private getResourceFromUrl(url: string): string {
    for (const [prefix, resource] of Object.entries(URL_RESOURCE_MAP)) {
      if (url.startsWith(prefix)) {
        return resource;
      }
    }
    return 'Unknown';
  }

  private async safeLog(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.log(data);
    } catch (e) {
      this.logger.error(`Failed to write audit log: ${e.message}`);
    }
  }
}
