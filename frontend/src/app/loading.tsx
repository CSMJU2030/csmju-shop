import { CatalogueSkeleton } from "@/components/features/shop/skeletons";

// Skeleton ที่มีรูปร่างเหมือนหน้าร้านค้า (design-system.md §9.1) — ห้ามใช้ spinner กลางจอ
export default function Loading() {
  return <CatalogueSkeleton />;
}
