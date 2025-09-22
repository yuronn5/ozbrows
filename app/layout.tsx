// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OzBrows — Brow Artist",
  description:
    "OzBrows — professional brow shaping, lamination, and tinting. The perfect brows from the very first touch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
