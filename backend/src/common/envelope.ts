/** meta ของคอลเลกชัน (api-conventions.md ข้อ 3) */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * ผลลัพธ์แบบแบ่งหน้า — service คืนคลาสนี้แล้ว ResponseEnvelopeInterceptor
 * จะแปลงเป็น { success: true, data: items, meta }
 */
export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) {}

  static of<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
    return new Paginated(items, {
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  }
}

/** ผลลัพธ์ของ DELETE ตามมาตรฐาน: 200 + { id, deleted: true } */
export interface Deleted {
  id: string;
  deleted: true;
}

export function deleted(id: string): Deleted {
  return { id, deleted: true };
}
