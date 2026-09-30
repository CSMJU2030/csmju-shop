import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * แปลง exception ทุกชนิดให้เป็น { success: false, message } รูปแบบเดียวกัน
 * รวมถึงแปลง error code ของ Prisma เป็น HTTP status ที่สื่อความหมาย
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
    let details: unknown;

    // ── Prisma error ──
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | undefined) ?? [];
          status = HttpStatus.CONFLICT;
          message = `ข้อมูลซ้ำ: ${target.join(', ')} ถูกใช้ไปแล้ว`;
          break;
        }
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = `อ้างอิงข้อมูลไม่ถูกต้อง (foreign key): ${exception.meta?.field_name ?? ''}`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = (exception.meta?.cause as string) ?? 'ไม่พบข้อมูลที่ต้องการ';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `ฐานข้อมูลปฏิเสธคำสั่ง (${exception.code})`;
      }
    }
    // ── HttpException ของ Nest (รวม ValidationPipe) ──
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, any>;
        // ValidationPipe คืน message เป็น array ของข้อความ
        if (Array.isArray(b.message)) {
          message = b.message[0];
          details = b.message;
        } else {
          message = b.message ?? exception.message;
        }
      }

      // multer เด้งไฟล์ที่ใหญ่เกินลิมิตออกมาเป็นข้อความอังกฤษ — แปลให้ผู้ใช้อ่านรู้เรื่อง
      if (status === HttpStatus.PAYLOAD_TOO_LARGE && /file too large/i.test(String(message))) {
        message = 'ไฟล์ใหญ่เกินไป — รูปสินค้าต้องไม่เกิน 5MB';
      }
    }
    // ── อย่างอื่น ──
    else if (exception instanceof Error) {
      this.logger.error(`${req.method} ${req.url} — ${exception.message}`, exception.stack);
      if (process.env.NODE_ENV !== 'production') details = exception.message;
    }

    res.status(status).json({
      success: false,
      message,
      ...(details ? { details } : {}),
    });
  }
}
