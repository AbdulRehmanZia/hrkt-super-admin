import { Module } from '@nestjs/common';
import { DatabaseSchemasModule } from '../schemas/database-schemas.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [DatabaseSchemasModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
