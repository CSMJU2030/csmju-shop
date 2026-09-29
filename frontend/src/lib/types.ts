/**
 * type ของ API — ดึงจาก openapi.json ของ backend (สร้างด้วย `pnpm run generate:api-types`)
 * ห้ามเขียน type ของ response เอง (tech-stack.md ข้อ 3)
 */
import type { components } from "./api-types";

type Schemas = components["schemas"];

export type Product = Schemas["ProductModel"];
export type ProductVariant = Schemas["ProductVariantModel"];
export type VariantWithProduct = Schemas["VariantWithProductModel"];
export type ProductCategory = Schemas["ProductCategoryModel"];
export type ProductImage = Schemas["ProductImageModel"];
export type Order = Schemas["OrderModel"];
export type OrderItem = Schemas["OrderItemModel"];
export type OrderStats = Schemas["OrderStatsModel"];
export type PickupLog = Schemas["PickupLogModel"];
export type PickupVerification = Schemas["PickupVerificationModel"];
export type Me = Schemas["MeModel"];
export type PageMeta = Schemas["PageMetaModel"];
export type Deleted = Schemas["DeletedModel"];

export type OrderStatus = Schemas["OrderStatus"];
export type PaymentStatus = Schemas["PaymentStatus"];
export type DeliveryMethod = Schemas["DeliveryMethod"];

export type CreateProductBody = Schemas["CreateProductDto"];
export type UpdateProductBody = Schemas["UpdateProductDto"];
export type CreateVariantBody = Schemas["CreateVariantDto"];
export type UpdateVariantBody = Schemas["UpdateVariantDto"];
export type CreateOrderBody = Schemas["CreateOrderDto"];
export type UpdateShippingBody = Schemas["UpdateShippingDto"];
export type CreatePickupLogBody = Schemas["CreatePickupLogDto"];
