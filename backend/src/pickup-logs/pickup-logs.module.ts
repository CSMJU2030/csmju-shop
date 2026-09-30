import { Module } from '@nestjs/common';
import { PickupLogsController } from './pickup-logs.controller.js';
import { PickupLogsService } from './pickup-logs.service.js';

@Module({
  controllers: [PickupLogsController],
  providers: [PickupLogsService],
  exports: [PickupLogsService],
})
export class PickupLogsModule {}
