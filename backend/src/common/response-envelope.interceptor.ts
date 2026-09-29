import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Paginated } from './envelope';

/** ห่อทุก response เป็น { success: true, data[, meta] } — top-level มีได้แค่ 3 key */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof Paginated) {
          return { success: true, data: value.items, meta: value.meta };
        }
        return { success: true, data: value ?? null };
      }),
    );
  }
}
