import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Controller,
  Get,
  Module,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiError } from '../common/api-error';
import { ApiEnvelope } from '../common/api-envelope.decorator';
import { PaymentSlipModel } from '../orders/order.model';

/** ไฟล์ที่ multer ส่งมา (เก็บในหน่วยความจำ) */
interface UploadedSlip {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const FILE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** ชนิดไฟล์ที่รับ → นามสกุล + ลายเซ็นไบต์แรกของไฟล์ (กันไฟล์ปลอมนามสกุล) */
const ALLOWED: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': {
    ext: '.png',
    magic: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: '.webp',
    magic: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

/** โฟลเดอร์เก็บสลิป (backend/uploads/slips) — ไม่เสิร์ฟเป็นไฟล์สาธารณะ ต้องผ่าน API ที่ตรวจสิทธิ์ */
export function paymentSlipDir(): string {
  return join(process.cwd(), 'uploads', 'slips');
}

@ApiTags('payment-slips')
@Controller('v1/payment-slips')
export class PaymentSlipsController {
  /**
   * อัปโหลดสลิปโอนเงิน (multipart/form-data ฟิลด์ชื่อ file) → คืน url ไปใส่ paymentSlip ของคำสั่งซื้อ
   * สลิปเป็นเอกสารการเงิน จึงเก็บในดิสก์และเปิดดูผ่าน GET ที่ตรวจสิทธิ์ทุกครั้ง (ไม่มี static)
   */
  @Post()
  @RequirePermissions(Permission.ORDER_CREATE_OWN, Permission.ORDER_UPDATE_OWN, Permission.ORDER_UPDATE_ANY)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  @ApiEnvelope(PaymentSlipModel, { created: true })
  upload(@UploadedFile() file?: UploadedSlip) {
    if (!file) {
      throw new ApiError('VALIDATION_ERROR', 'ไม่พบไฟล์ — ต้องส่งไฟล์ในฟิลด์ชื่อ file', [
        'file is required',
      ]);
    }
    const kind = ALLOWED[file.mimetype];
    if (!kind || !kind.magic(file.buffer)) {
      throw new ApiError('VALIDATION_ERROR', 'รองรับเฉพาะไฟล์รูป JPG, PNG และ WEBP', [
        'file must be a JPG, PNG or WEBP image',
      ]);
    }

    // ตั้งชื่อใหม่เป็น UUID เสมอ ไม่ใช้ชื่อไฟล์จากเครื่องผู้ใช้
    const id = randomUUID();
    const name = `${id}${kind.ext}`;
    const dir = paymentSlipDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), file.buffer);

    return {
      id,
      url: `/api/v1/payment-slips/${name}`,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  /** เปิดดูไฟล์สลิป — ต้องเข้าสู่ระบบและมีสิทธิ์อ่านคำสั่งซื้อ (ส่งเป็น attachment-safe: nosniff + no-store) */
  @Get(':name')
  @RequirePermissions(Permission.ORDER_READ_ANY, Permission.ORDER_READ_OWN)
  @ApiExcludeEndpoint()
  download(@Param('name') name: string, @Res() res: Response) {
    if (!FILE_NAME.test(name)) throw new ApiError('NOT_FOUND', 'ไม่พบไฟล์สลิปนี้');
    const path = join(paymentSlipDir(), name);
    if (!existsSync(path)) throw new ApiError('NOT_FOUND', 'ไม่พบไฟล์สลิปนี้');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path);
  }
}

@Module({ controllers: [PaymentSlipsController] })
export class PaymentSlipsModule {}
