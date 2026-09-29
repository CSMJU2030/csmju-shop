import { Logger } from '@nestjs/common';

// เทสต์จงใจยิงเคสที่ถูกปฏิเสธจำนวนมาก — ปิด log ไม่ให้รกผลลัพธ์
Logger.overrideLogger(false);
