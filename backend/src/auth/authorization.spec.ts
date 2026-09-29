import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiError } from '../common/api-error';
import type { CoreHubIdentity } from './core-hub-identity';
import { PERMISSIONS_KEY } from './decorators/require-permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { assertOwnerOrAny } from './ownership';
import { Permission, permissionsFor } from './permissions';
import { CORE_ROLE_TO_SUBSYSTEM_ROLE, mapCoreRole } from './role-mapping';

function identity(role: 'STUDENT' | 'STAFF' | 'ADMIN', sub = 'user-002'): CoreHubIdentity {
  return {
    coreUserId: sub,
    email: `${sub}@core.local`,
    coreRole: role === 'STUDENT' ? 'student' : role === 'STAFF' ? 'staff' : 'admin',
    subsystemRole: role,
    permissions: permissionsFor(role),
    exp: Math.floor(Date.now() / 1000) + 900,
  };
}

function context(user: CoreHubIdentity | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user, path: '/api/v1/products' }) }),
  } as unknown as ExecutionContext;
}

describe('role mapping (authorization.md ข้อ 3)', () => {
  it('ตรงกับ defaultRoleMapping ที่ลงทะเบียนไว้', () => {
    expect(CORE_ROLE_TO_SUBSYSTEM_ROLE).toEqual({
      student: 'STUDENT',
      alumni: 'ALUMNI',
      staff: 'STAFF',
      admin: 'ADMIN',
    });
  });

  it('core role ที่ไม่อยู่ในตาราง → null (guard ตอบ 403)', () => {
    expect(mapCoreRole('guest')).toBeNull();
    expect(mapCoreRole('lecturer')).toBeNull();
    expect(mapCoreRole('superuser')).toBeNull();
    expect(mapCoreRole('STAFF')).toBe('STAFF');
  });
});

describe('PermissionsGuard', () => {
  const guardFor = (required: Permission[]) => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => (key === PERMISSIONS_KEY ? required : undefined));
    return new PermissionsGuard(reflector);
  };

  it('นักศึกษาเพิ่มสินค้าไม่ได้ → 403 FORBIDDEN', () => {
    const guard = guardFor([Permission.PRODUCT_CREATE]);
    try {
      guard.canActivate(context(identity('STUDENT')));
      fail('ต้องโยน 403');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(403);
      expect((error as ApiError).code).toBe('FORBIDDEN');
    }
  });

  it('เจ้าหน้าที่เพิ่มสินค้าได้', () => {
    expect(guardFor([Permission.PRODUCT_CREATE]).canActivate(context(identity('STAFF')))).toBe(
      true,
    );
  });

  it('มี permission ข้อใดข้อหนึ่งในรายการก็ผ่าน', () => {
    const guard = guardFor([Permission.ORDER_READ_ANY, Permission.ORDER_READ_OWN]);
    expect(guard.canActivate(context(identity('STUDENT')))).toBe(true);
  });

  it('ลบสินค้าได้เฉพาะผู้ดูแล', () => {
    const guard = guardFor([Permission.PRODUCT_DELETE]);
    expect(() => guard.canActivate(context(identity('STAFF')))).toThrow(ApiError);
    expect(guard.canActivate(context(identity('ADMIN')))).toBe(true);
  });
});

describe('ownership (:own ตรวจกับข้อมูลจริง)', () => {
  it('นักศึกษาดูคำสั่งซื้อของคนอื่น → 403', () => {
    expect(() =>
      assertOwnerOrAny(identity('STUDENT', 'user-002'), 'user-999', Permission.ORDER_READ_ANY),
    ).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('เจ้าของดูของตัวเองได้ · เจ้าหน้าที่ดูของทุกคนได้', () => {
    expect(() =>
      assertOwnerOrAny(identity('STUDENT', 'user-002'), 'user-002', Permission.ORDER_READ_ANY),
    ).not.toThrow();
    expect(() =>
      assertOwnerOrAny(identity('STAFF', 'user-003'), 'user-002', Permission.ORDER_READ_ANY),
    ).not.toThrow();
  });
});
