import { randomBytes } from 'node:crypto';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * ไฟล์ที่ multer ส่งมาให้ (เก็บในหน่วยความจำ)
 * ประกาศเองเพื่อไม่ต้องติดตั้ง @types/multer เพิ่ม
 */
interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** ชนิดไฟล์ที่ยอมรับ → นามสกุลที่จะใช้บันทึก */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** โฟลเดอร์เก็บรูป — อยู่ในโปรเจกต์ backend ชื่อ uploads/products */
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'products');

@Controller('uploads')
export class UploadsController {
  /**
   * POST /api/uploads/image
   * รับไฟล์รูปในฟิลด์ชื่อ file (multipart/form-data) แล้วคืน URL ที่เอาไปใส่ image_url ได้เลย
   *
   * เก็บไฟล์ไว้ในดิสก์ ไม่ได้เก็บลงฐานข้อมูล — ฐานข้อมูลเก็บแค่ที่อยู่ไฟล์
   * เพราะรูปมักหนักและไม่ควรไปถ่วงตารางสินค้า
   */
  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  uploadImage(@UploadedFile() file?: UploadedImage) {
    if (!file) throw new UnprocessableEntityException('ไม่พบไฟล์ — ต้องส่งไฟล์ในฟิลด์ชื่อ file');

    const ext = ALLOWED[file.mimetype];
    if (!ext) {
      throw new UnprocessableEntityException(
        'รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP และ GIF เท่านั้น',
      );
    }
    if (file.size > MAX_BYTES) {
      throw new UnprocessableEntityException('ไฟล์ใหญ่เกิน 5MB');
    }

    // ตั้งชื่อไฟล์ใหม่แบบสุ่มเสมอ ไม่ใช้ชื่อเดิมจากเครื่องผู้ใช้
    // กันทั้งไฟล์ชื่อซ้ำทับกัน และกันชื่อไฟล์แปลก ๆ ที่หลุดออกนอกโฟลเดอร์
    const filename = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;

    mkdirSync(UPLOAD_DIR, { recursive: true });
    writeFileSync(join(UPLOAD_DIR, filename), file.buffer);

    return {
      message: 'อัปโหลดรูปสำเร็จ',
      data: {
        url: `/uploads/products/${filename}`,
        filename,
        size: file.size,
        original_name: file.originalname,
      },
    };
  }

  /**
   * DELETE /api/uploads/image?url=/uploads/products/xxx.jpg
   * ลบไฟล์รูปที่ไม่ได้ใช้แล้ว (เช่น เปลี่ยนรูปสินค้า รูปเก่าจะค้างอยู่)
   */
  @Delete('image')
  removeImage(@Query('url') url?: string) {
    if (!url) throw new UnprocessableEntityException('ต้องระบุ url ของรูปที่จะลบ');

    // รับเฉพาะรูปในโฟลเดอร์ของเราเท่านั้น และเอาเฉพาะชื่อไฟล์ กัน ../ หลุดออกนอกโฟลเดอร์
    const name = normalize(url).replace(/\\/g, '/').split('/').pop() ?? '';
    if (!url.startsWith('/uploads/products/') || !/^[\w.-]+\.(jpg|png|webp|gif)$/i.test(name)) {
      throw new UnprocessableEntityException('ลบได้เฉพาะรูปที่อัปโหลดผ่านระบบนี้');
    }

    try {
      unlinkSync(join(UPLOAD_DIR, name));
    } catch {
      throw new NotFoundException('ไม่พบไฟล์รูปนี้แล้ว');
    }

    return { message: 'ลบรูปสำเร็จ', data: { url } };
  }
}
