import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehicleImportService } from './vehicle-import.service';
import { VehiclesController } from './vehicles.controller';
import { VehicleModelsController } from './vehicle-models.controller';

@Module({
  controllers: [VehiclesController, VehicleModelsController],
  providers: [VehiclesService, VehicleImportService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
