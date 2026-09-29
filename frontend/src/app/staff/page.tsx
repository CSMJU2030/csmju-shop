import { redirect } from "next/navigation";

// เมนู "ภาพรวมร้านค้า" อยู่ที่ /staff/overview — ถ้าใช้ /staff เมนูนี้จะถูกไฮไลต์ร่วมกับทุกหน้าใต้ /staff
export default function StaffIndexPage() {
  redirect("/staff/overview");
}
