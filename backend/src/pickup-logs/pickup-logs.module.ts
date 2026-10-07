import { Module } from '@nestjs/common';
import { PickupLogsController, PickupVerificationsController } from './pickup-logs.controller';
import { PickupLogsService } from './pickup-logs.service';

@Module({
  controllers: [PickupLogsController, PickupVerificationsController],
  providers: [PickupLogsService],
})
export class PickupLogsModule {}
