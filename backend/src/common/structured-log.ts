import { Logger } from '@nestjs/common';

/**
 * structured log บรรทัดเดียวตาม standards/docs/logging.md
 * ชื่อ event เป็นรายการปิดใน standards/contracts/log-events.json
 * ห้ามส่ง token / Authorization header / รหัสผ่านเข้ามาในฟังก์ชันนี้เด็ดขาด
 */
export type LogEvent =
  | 'subsystem.started'
  | 'jwks.refresh'
  | 'jwks.refresh.failure'
  | 'jwks.unknown_kid'
  | 'jwt.verification.success'
  | 'jwt.verification.failure'
  | 'authorization.role_mapping_failed'
  | 'authorization.denied';

const logger = new Logger('Audit');

export function logEvent(
  event: LogEvent,
  fields: Record<string, unknown>,
  level: 'log' | 'warn' = 'log',
): void {
  const line = JSON.stringify({ event, ...fields, at: new Date().toISOString() });
  if (level === 'warn') logger.warn(line);
  else logger.log(line);
}
