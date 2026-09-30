import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serialize } from '../utils/serialize.js';

/**
 * ห่อ response ทุกอันให้อยู่ในรูป { success, message, data, meta? }
 * และแปลง Prisma Decimal เป็น number ให้อ่านง่ายใน Postman
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((payload) => {
        // service คืนค่าในรูป { message, data, meta? } อยู่แล้ว
        if (payload && typeof payload === 'object' && 'data' in payload) {
          const { message, data, meta } = payload as Record<string, unknown>;
          return {
            success: true,
            message: message ?? 'success',
            data: serialize(data),
            ...(meta ? { meta } : {}),
          };
        }
        return { success: true, message: 'success', data: serialize(payload) };
      }),
    );
  }
}
