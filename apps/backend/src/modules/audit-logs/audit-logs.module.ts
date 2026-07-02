import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogService } from './audit-log.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogsController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogsModule {}
