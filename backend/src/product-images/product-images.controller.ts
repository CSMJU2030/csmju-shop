import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Controller,
  Delete,
  Module,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiError } from '../common/api-error';
import { deleted } from '../common/envelope';
import { UuidParam } from '../common/uuid.pipe';
import { ApiEnvelope, DeletedModel } from '../common/api-envelope.decorator';
import { ProductImageModel } from '../products/product.model';

/** ไฟล์ที่ multer ส่งมา (เก็บในหน่วยความจำ) */
interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** ชนิดไฟล์ที่รับ → นามสกุล + ลายเซ็นไบต์แรกของไฟล์ (กันไฟล์อื่นที่แอบตั้ง mimetype เป็นรูป) */
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
  'image/gif': { ext: '.gif', magic: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
};

/** โฟลเดอร์เก็บรูป (backend/uploads/products) — เสิร์ฟที่ /uploads/products/* */
export function productImageDir(): string {
  return join(process.cwd(), 'uploads', 'products');
}

@ApiTags('product-images')
@Controller('v1/product-images')
export class ProductImagesController {
  /**
   * อัปโหลดรูปสินค้า (multipart/form-data ฟิลด์ชื่อ file) → คืน url ไปใส่ imageUrl ของสินค้า
   * เก็บไฟล์ในดิสก์ ฐานข้อมูลเก็บแค่ที่อยู่ไฟล์
   */
  @Post()
  @RequirePermissions(Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  @ApiEnvelope(ProductImageModel, { created: true })
  upload(@UploadedFile() file?: UploadedImage) {
    if (!file) {
      throw new ApiError('VALIDATION_ERROR', 'ไม่พบไฟล์ — ต้องส่งไฟล์ในฟิลด์ชื่อ file', [
        'file is required',
      ]);
    }
    const kind = ALLOWED[file.mimetype];
    if (!kind || !kind.magic(file.buffer)) {
      throw new ApiError('VALIDATION_ERROR', 'รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP และ GIF', [
        'file must be a JPG, PNG, WEBP or GIF image',
      ]);
    }

    // ตั้งชื่อใหม่เป็น UUID เสมอ ไม่ใช้ชื่อไฟล์จากเครื่องผู้ใช้ (กันชื่อซ้ำและ path traversal)
    const id = randomUUID();
    const dir = productImageDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${id}${kind.ext}`), file.buffer);

    return {
      id,
      url: `/uploads/products/${id}${kind.ext}`,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  /** ลบรูปที่ไม่ใช้แล้ว */
  @Delete(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  @ApiEnvelope(DeletedModel)
  remove(@Param('id', UuidParam) id: string) {
    const dir = productImageDir();
    let files: string[] = [];
    try {
      files = readdirSync(dir);
    } catch {
      files = [];
    }
    const name = files.find((f) => f.startsWith(`${id}.`));
    if (!name) throw new ApiError('NOT_FOUND', 'ไม่พบไฟล์รูปนี้');
    unlinkSync(join(dir, name));
    return deleted(id);
  }
}

@Module({ controllers: [ProductImagesController] })
export class ProductImagesModule {}
