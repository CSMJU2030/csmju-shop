import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CoreHubTokenVerifier } from './core-hub-token.verifier';
import { CoreHubJwtGuard } from './guards/core-hub-jwt.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwksService } from './jwks.service';
import { MeController } from './me.controller';
import { SsoCallbackController } from './sso-callback.controller';

/**
 * ชั้น auth ของระบบย่อย — ตรวจ Core Hub JWT ผ่าน JWKS (jose) + role mapping + permission
 * guard สองตัวผูกระดับ global: ทุกเส้นทางต้องมี token เว้นแต่ติด @Public()
 */
@Global()
@Module({
  controllers: [MeController, SsoCallbackController],
  providers: [
    JwksService,
    CoreHubTokenVerifier,
    { provide: APP_GUARD, useClass: CoreHubJwtGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [JwksService, CoreHubTokenVerifier],
})
export class AuthModule {}
