import { Transform } from 'class-transformer';

/** แปลง query string "true"/"false" เป็น boolean — ค่าอื่นปล่อยไว้ให้ @IsBoolean ตีตก */
export function QueryBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });
}
