import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { FilesModule } from './modules/files/files.module';
import { WorkshopModule } from './modules/workshop/workshop.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    VehiclesModule,
    FilesModule,
    WorkshopModule,
    FleetModule,
    MaintenanceModule,
    TechniciansModule,
    NotificationsModule,
  ],
})
export class AppModule {}
