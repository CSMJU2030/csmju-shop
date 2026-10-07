import { Controller, Get } from '@nestjs/common';
import type { CoreHubIdentity } from './core-hub-identity';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiEnvelope } from '../common/api-envelope.decorator';
import { MeModel } from './me.model';

@Controller('v1/me')
export class MeController {
  /** ตัวตนของผู้ใช้ปัจจุบัน + role/permission ภายในร้านค้า */
  @Get()
  @ApiEnvelope(MeModel)
  me(@CurrentUser() user: CoreHubIdentity) {
    return {
      id: user.coreUserId,
      email: user.email,
      coreRole: user.coreRole,
      subsystemRole: user.subsystemRole,
      permissions: user.permissions,
      expiresAt: new Date(user.exp * 1000).toISOString(),
    };
  }
}
