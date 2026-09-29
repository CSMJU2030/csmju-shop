/**
 * ไอคอนเพิ่มเติมของร้านค้า — ชุดกลาง (@/csmju icons.tsx) ยังไม่มี
 * วาดสไตล์เดียวกับชุดกลาง: viewBox 24 · stroke currentColor · strokeWidth 1.8 · ปลายมน (design-system.md ข้อ 14)
 * component ชั่วคราว — ขอเพิ่มเข้าส่วนกลางตามข้อ 17.4
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ShoppingBagIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5.5 8h13l1 11.5a1.5 1.5 0 0 1-1.5 1.6H6a1.5 1.5 0 0 1-1.5-1.6L5.5 8Z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </Base>
  );
}

export function StorefrontIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5.5 12.5V20h13v-7.5" />
      <path d="M10 20v-4.5h4V20" />
    </Base>
  );
}

export function InventoryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </Base>
  );
}

export function LocalShippingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6.5h11V16H3z" />
      <path d="M14 10h3.5l3 3.5V16H14" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </Base>
  );
}

export function QrCodeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
    </Base>
  );
}

export function PhotoCameraIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </Base>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 16V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </Base>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5L16 9.5" />
    </Base>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </Base>
  );
}

export function ContentCopyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </Base>
  );
}

export function OpenInNewIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Base>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </Base>
  );
}

export function LockClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Base>
  );
}
