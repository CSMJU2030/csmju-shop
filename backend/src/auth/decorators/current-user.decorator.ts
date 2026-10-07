import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CoreHubIdentity } from '../core-hub-identity';

export interface AuthenticatedRequest {
  user?: CoreHubIdentity;
}

/** ตัวตนของผู้เรียกที่ผ่าน CoreHubJwtGuard แล้ว (มาจาก claim ที่ตรวจลายเซ็นแล้วเท่านั้น) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CoreHubIdentity => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as CoreHubIdentity;
  },
);
