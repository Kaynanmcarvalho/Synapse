import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { HeavyJobQueue } from './heavy-job.queue';
import { MaterializedAggregateService } from './materialized-aggregate.service';
import { PerformanceController } from './performance.controller';

@Module({
  controllers: [PerformanceController],
  providers: [CacheService, HeavyJobQueue, MaterializedAggregateService],
  exports: [CacheService, HeavyJobQueue, MaterializedAggregateService],
})
export class PerformanceModule {}
