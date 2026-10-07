import { HttpException, HttpStatus } from '@nestjs/common';

/** รายการปิดของ error code (standards/contracts/error-codes.json · มาตรฐาน 1.0) */
export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** โยน error ที่ระบุ code มาตรฐานได้ตรง ๆ เช่น new ApiError('VALIDATION_ERROR', '...') */
export class ApiError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: string[],
  ) {
    super({ code, message, details }, ERROR_HTTP_STATUS[code]);
  }
}
