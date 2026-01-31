import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { Dashboard } from './entities/dashboard.entity';
import { DashboardCard } from './entities/dashboard-card.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Dashboard, DashboardCard]),
        DatabaseModule
    ],
    controllers: [DashboardsController],
    providers: [DashboardsService],
    exports: [DashboardsService],
})
export class DashboardsModule { }
