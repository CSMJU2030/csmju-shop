/** ไอคอนเส้นเดียวกันทั้งระบบ — วาดเองเพื่อไม่ต้องลง dependency เพิ่ม */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const Search = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const Bag = (p) => (
  <svg {...base} {...p}>
    <path d="M5.5 8h13l1 11.5a1.5 1.5 0 0 1-1.5 1.6H6a1.5 1.5 0 0 1-1.5-1.6L5.5 8Z" />
    <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
  </svg>
);

export const Bell = (p) => (
  <svg {...base} {...p}>
    <path d="M18 16V11a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const CheckCircle = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5L16 9.5" />
  </svg>
);

export const ArrowLeft = (p) => (
  <svg {...base} {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
);

export const Upload = (p) => (
  <svg {...base} {...p}>
    <path d="M12 16V5" />
    <path d="m8 9 4-4 4 4" />
    <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const MapPin = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const Clock = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 1.75" />
  </svg>
);

export const Lock = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" />
  </svg>
);

export const QrIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h3v3h-3zM19.5 14v.01M14 19.5v.01M19.5 19.5v.01" />
  </svg>
);

export const Truck = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7h10v9H3z" />
    <path d="M13 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.75" />
    <circle cx="17" cy="18" r="1.75" />
  </svg>
);

export const Grid = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);

export const Box = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
    <path d="M4 8l8 4.5L20 8M12 12.5V20.5" />
  </svg>
);

export const Shield = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Chart = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20h16" />
    <path d="M7 20v-6M12 20V6M17 20v-9" />
  </svg>
);

export const Eye = (p) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const Download = (p) => (
  <svg {...base} {...p}>
    <path d="M12 4v11" />
    <path d="m8 11 4 4 4-4" />
    <path d="M5 19h14" />
  </svg>
);

export const Plus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 6v12M6 12h12" />
  </svg>
);

export const Trash = (p) => (
  <svg {...base} {...p}>
    <path d="M5 7h14" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M7 7l1 13h8l1-13" />
  </svg>
);

export const Tag = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7a2 2 0 0 1 1.4.6l6 6a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0l-6-6A2 2 0 0 1 4 12.5Z" />
    <circle cx="8.5" cy="8.5" r="1.25" />
  </svg>
);
