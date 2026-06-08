import { Module } from '@nestjs/common';
import { FleetCostsService } from './costs/fleet-costs.service';
import { FleetCostsController } from './costs/fleet-costs.controller';
import { FleetIncidentsService } from './incidents/fleet-incidents.service';
import { FleetIncidentsController } from './incidents/fleet-incidents.controller';
import { FleetPartReplacementsService } from './part-replacements/fleet-part-replacements.service';
import { FleetPartReplacementsController } from './part-replacements/fleet-part-replacements.controller';

@Module({
  controllers: [FleetCostsController, FleetIncidentsController, FleetPartReplacementsController],
  providers: [FleetCostsService, FleetIncidentsService, FleetPartReplacementsService],
  exports: [FleetCostsService, FleetIncidentsService, FleetPartReplacementsService],
})
export class FleetModule {}
