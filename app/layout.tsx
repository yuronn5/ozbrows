// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OzBrows — Brow Artist',
  description:
    'OzBrows — професійна корекція, ламінування та фарбування брів. Ідеальна форма з першого дотику.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
