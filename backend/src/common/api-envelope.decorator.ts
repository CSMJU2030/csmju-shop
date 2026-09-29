import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

/** meta ของคอลเลกชัน */
export class PageMetaModel {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

/** ผลลัพธ์ของ DELETE */
export class DeletedModel {
  id!: string;
  @ApiProperty({ enum: [true] })
  deleted!: true;
}

interface EnvelopeOptions {
  /** คอลเลกชันแบบแบ่งหน้า (data[] + meta) */
  paginated?: boolean;
  /** 201 Created แทน 200 */
  created?: boolean;
  description?: string;
}

/**
 * บอก OpenAPI ว่า response ห่อด้วย envelope { success, data[, meta] }
 * frontend ใช้ schema นี้สร้าง type (openapi-typescript) แทนการเขียน type เอง
 */
export function ApiEnvelope(model: Type<unknown>, options: EnvelopeOptions = {}) {
  const data = options.paginated
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  const schema = {
    type: 'object',
    required: ['success', 'data', ...(options.paginated ? ['meta'] : [])],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data,
      ...(options.paginated ? { meta: { $ref: getSchemaPath(PageMetaModel) } } : {}),
    },
  };

  const Response = options.created ? ApiCreatedResponse : ApiOkResponse;
  return applyDecorators(
    ApiExtraModels(model, PageMetaModel),
    Response({ description: options.description, schema }),
  );
}
