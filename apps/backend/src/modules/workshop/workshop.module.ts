import { Module } from '@nestjs/common';
import { WorkshopJobsService } from './jobs/workshop-jobs.service';
import { WorkshopJobsController } from './jobs/workshop-jobs.controller';
import { RepairOrdersService } from './repair-orders/repair-orders.service';
import { RepairOrdersController } from './repair-orders/repair-orders.controller';
import { PartsService } from './parts/parts.service';
import { PartsController } from './parts/parts.controller';
import { TransferBatchesService } from './parts/transfer-batches/transfer-batches.service';
import { TransferBatchesController } from './parts/transfer-batches/transfer-batches.controller';
import { PartRequisitionsService } from './parts/requisitions/part-requisitions.service';
import { PartRequisitionsController } from './parts/requisitions/part-requisitions.controller';
import { WorkshopDashboardController } from './dashboard/workshop-dashboard.controller';
import { WorkshopDashboardService } from './dashboard/workshop-dashboard.service';

@Module({
  controllers: [
    WorkshopJobsController,
    RepairOrdersController,
    PartsController,
    TransferBatchesController,
    PartRequisitionsController,
    WorkshopDashboardController,
  ],
  providers: [
    WorkshopJobsService,
    RepairOrdersService,
    PartsService,
    TransferBatchesService,
    PartRequisitionsService,
    WorkshopDashboardService,
  ],
  exports: [WorkshopJobsService, PartsService],
})
export class WorkshopModule {}
