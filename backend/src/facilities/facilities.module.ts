import { Module } from '@nestjs/common';
import { DatabaseSchemasModule } from '../schemas/database-schemas.module';
import { FacilitiesService } from './facilities.service';
import { FacilitiesController } from './facilities.controller';

@Module({
  imports: [DatabaseSchemasModule],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
