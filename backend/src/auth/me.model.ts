import { ApiProperty } from '@nestjs/swagger';

export class MeModel {
  /** claim `sub` ของ Core Hub */
  id!: string;
  email!: string;
  /** student · alumni · staff · admin */
  coreRole!: string;
  /** STUDENT · ALUMNI · STAFF · ADMIN */
  subsystemRole!: string;
  @ApiProperty({ type: [String] })
  permissions!: string[];
  /** เวลาที่ session (Core Hub token) หมดอายุ */
  expiresAt!: string;
}
