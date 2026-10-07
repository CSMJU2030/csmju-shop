import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiError, ERROR_HTTP_STATUS, type ErrorCode } from './api-error';

interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: string[];
}

/** error code มาตรฐานของ HTTP status ที่ Nest โยนมา */
function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
  }
}

const DEFAULT_MESSAGE: Record<ErrorCode, string> = {
  BAD_REQUEST: 'คำขอไม่ถูกต้อง',
  VALIDATION_ERROR: 'ข้อมูลไม่ผ่านการตรวจสอบ',
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบผ่าน Core Hub',
  FORBIDDEN: 'คุณไม่มีสิทธิ์ทำรายการนี้',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  CONFLICT: 'ทำรายการไม่ได้เพราะขัดกับกฎของระบบ',
  INTERNAL_ERROR: 'เกิดข้อผิดพลาดภายในระบบ',
};

/** Prisma known request error (ตรวจแบบ duck-typing ไม่ผูกกับคลาสของ generated client) */
function prismaCode(exception: unknown): string | undefined {
  if (exception && typeof exception === 'object' && 'code' in exception) {
    const code = exception.code;
    const name = (exception as { name?: unknown }).name;
    if (typeof code === 'string' && /^P\d{4}$/.test(code) && String(name).startsWith('Prisma')) {
      return code;
    }
  }
  return undefined;
}

/**
 * แปลง exception ทุกชนิดเป็น { success: false, error: { code, message, details? } }
 * - code อยู่ในรายการปิด 7 ค่าเท่านั้น
 * - ไม่ส่ง stack trace / ข้อความจาก ORM / SQL / path ของไฟล์ออกไป
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, body } = this.toError(exception, req);
    res.status(status).json({ success: false, error: body });
  }

  private toError(exception: unknown, req: Request): { status: number; body: ErrorBody } {
    if (exception instanceof ApiError) {
      const body = exception.getResponse() as ErrorBody;
      return { status: exception.getStatus(), body: this.clean(body) };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // ValidationPipe / ParseUUIDPipe → 400 VALIDATION_ERROR พร้อม details เป็น array ของข้อความ
      if (status === 400 && response && typeof response === 'object') {
        const message = (response as { message?: unknown }).message;
        if (Array.isArray(message)) {
          const details = message.map(String);
          return {
            status,
            body: {
              code: 'VALIDATION_ERROR',
              message: details[0] ?? DEFAULT_MESSAGE.VALIDATION_ERROR,
              details,
            },
          };
        }
        if (typeof message === 'string' && /validation failed|uuid/i.test(message)) {
          return {
            status,
            body: {
              code: 'VALIDATION_ERROR',
              message: 'รูปแบบ id ไม่ถูกต้อง (ต้องเป็น UUID v4)',
              details: [message],
            },
          };
        }
      }

      // ไฟล์ใหญ่เกินลิมิต (multer) — ไม่มี code 413 ในรายการปิด จึงตอบ 400 BAD_REQUEST
      if (status === 413) {
        return {
          status: HttpStatus.BAD_REQUEST,
          body: { code: 'BAD_REQUEST', message: 'ไฟล์ใหญ่เกินไป — รูปสินค้าต้องไม่เกิน 5MB' },
        };
      }

      const code = codeForStatus(status);
      const mappedStatus = ERROR_HTTP_STATUS[code];
      const message =
        status === 404 && /^Cannot (GET|POST|PUT|PATCH|DELETE)/.test(exception.message)
          ? 'ไม่พบเส้นทางที่ร้องขอ'
          : (this.messageOf(response) ?? DEFAULT_MESSAGE[code]);
      return { status: mappedStatus, body: { code, message } };
    }

    const pCode = prismaCode(exception);
    if (pCode === 'P2025') {
      return { status: 404, body: { code: 'NOT_FOUND', message: DEFAULT_MESSAGE.NOT_FOUND } };
    }
    if (pCode === 'P2002') {
      return { status: 409, body: { code: 'CONFLICT', message: 'ข้อมูลนี้มีอยู่แล้ว (ค่าซ้ำ)' } };
    }
    if (pCode === 'P2003') {
      return {
        status: 409,
        body: { code: 'CONFLICT', message: 'ข้อมูลนี้ถูกอ้างอิงอยู่ ลบหรือแก้ไม่ได้' },
      };
    }

    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`${req.method} ${req.path} — ${err.name}: ${err.message}`);
    return {
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGE.INTERNAL_ERROR },
    };
  }

  private messageOf(response: string | object): string | undefined {
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }

  private clean(body: ErrorBody): ErrorBody {
    return body.details?.length ? body : { code: body.code, message: body.message };
  }
}
