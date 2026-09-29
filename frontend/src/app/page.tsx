import type { Metadata } from "next";
import { Catalogue } from "@/components/features/shop/catalogue";

export const metadata: Metadata = { title: "ร้านค้า" };

export default function ShopPage() {
  return <Catalogue />;
}
