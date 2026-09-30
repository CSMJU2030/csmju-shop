import { IBM_Plex_Sans_Thai } from 'next/font/google';
import { CartProvider } from '@/lib/cart';
import './globals.css';

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-thai',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'CSMJU Shop',
    template: '%s · CSMJU Shop',
  },
  description: 'ร้านค้าออนไลน์ของสาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้',
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%231a2666'/%3E%3Cpath d='M10 12h12l1 11.5a1.5 1.5 0 0 1-1.5 1.6h-11A1.5 1.5 0 0 1 9 23.5L10 12Z' fill='none' stroke='white' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M13.5 14v-3a2.5 2.5 0 0 1 5 0v3' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E",
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={plexThai.variable}>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
