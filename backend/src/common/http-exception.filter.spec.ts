import { BadRequestException, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { ApiError } from './api-error';
import { HttpExceptionFilter } from './http-exception.filter';

function run(exception: unknown) {
  const res = { statusCode: 0, body: undefined as unknown, status: jest.fn(), json: jest.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'GET', path: '/api/v1/x' }),
    }),
  } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return {
    status: res.statusCode,
    body: res.body as { success: boolean; error: Record<string, unknown> },
  };
}

describe('HttpExceptionFilter (api-conventions.md ข้อ 4)', () => {
  it('ValidationPipe → 400 VALIDATION_ERROR + details', () => {
    const out = run(new BadRequestException({ message: ['limit ต้องเป็นจำนวนเต็ม'] }));
    expect(out.status).toBe(400);
    expect(out.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'limit ต้องเป็นจำนวนเต็ม',
        details: ['limit ต้องเป็นจำนวนเต็ม'],
      },
    });
  });

  it('route ที่ไม่มี → 404 NOT_FOUND', () => {
    const out = run(new NotFoundException('Cannot GET /api/v1/nope'));
    expect(out.status).toBe(404);
    expect(out.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(out.body)).not.toContain('Cannot GET');
  });

  it('ApiError ส่ง code ตามที่ระบุ', () => {
    const out = run(new ApiError('CONFLICT', 'สต็อกไม่พอ'));
    expect(out).toEqual({
      status: 409,
      body: { success: false, error: { code: 'CONFLICT', message: 'สต็อกไม่พอ' } },
    });
  });

  it('Prisma P2002 → 409 CONFLICT โดยไม่ส่งข้อความจาก ORM', () => {
    const prismaError = Object.assign(
      new Error('Unique constraint failed on the fields: (`order_number`)'),
      {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
      },
    );
    const out = run(prismaError);
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('CONFLICT');
    expect(JSON.stringify(out.body)).not.toMatch(/order_number|Unique constraint/);
  });

  it('error ที่ไม่คาดคิด → 500 INTERNAL_ERROR ไม่รั่วรายละเอียดภายใน', () => {
    const out = run(new Error('SELECT * FROM orders failed at /app/src/x.ts:1:1'));
    expect(out.status).toBe(500);
    expect(out.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(out.body)).not.toMatch(/SELECT|\.ts/);
  });
});
