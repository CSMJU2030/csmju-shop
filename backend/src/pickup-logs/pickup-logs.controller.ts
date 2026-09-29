import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { UuidParam } from '../common/uuid.pipe';
import {
  CreatePickupLogDto,
  CreatePickupVerificationDto,
  QueryPickupLogDto,
} from './dto/pickup-log.dto';
import { PickupLogsService } from './pickup-logs.service';
import { ApiEnvelope, DeletedModel } from '../common/api-envelope.decorator';
import { PickupLogModel, PickupVerificationModel } from './pickup-log.model';

@ApiTags('pickup-logs')
@Controller('v1/pickup-logs')
export class PickupLogsController {
  constructor(private readonly logs: PickupLogsService) {}

  @Get()
  @RequirePermissions(Permission.PICKUP_READ)
  @ApiEnvelope(PickupLogModel, { paginated: true })
  findAll(@Query() query: QueryPickupLogDto) {
    return this.logs.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PICKUP_READ)
  @ApiEnvelope(PickupLogModel)
  findOne(@Param('id', UuidParam) id: string) {
    return this.logs.findOne(id);
  }

  /** บันทึกการส่งมอบสินค้า (เจ้าหน้าที่) — ปิดคำสั่งซื้อเป็น COMPLETED */
  @Post()
  @RequirePermissions(Permission.PICKUP_CREATE)
  @ApiEnvelope(PickupLogModel, { created: true })
  create(@CurrentUser() staff: CoreHubIdentity, @Body() dto: CreatePickupLogDto) {
    return this.logs.create(staff, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PICKUP_DELETE)
  @ApiEnvelope(DeletedModel)
  remove(@Param('id', UuidParam) id: string) {
    return this.logs.remove(id);
  }
}

/** ตรวจรหัสรับสินค้า (ไม่บันทึกอะไร จึงตอบ 200) */
@ApiTags('pickup-logs')
@Controller('v1/pickup-verifications')
export class PickupVerificationsController {
  constructor(private readonly logs: PickupLogsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PICKUP_READ)
  @ApiEnvelope(PickupVerificationModel)
  verify(@Body() dto: CreatePickupVerificationDto) {
    return this.logs.verify(dto);
  }
}
