import type { Metadata } from "next";
import { CheckoutView } from "@/components/features/shop/checkout-view";

export const metadata: Metadata = { title: "สั่งซื้อสินค้า" };

export default function CheckoutPage() {
  return <CheckoutView />;
}
