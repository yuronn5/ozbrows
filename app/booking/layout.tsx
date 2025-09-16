import type { Metadata } from "next";
import "./booking.css";
import "../globals.css";

export const metadata: Metadata = {
  title: "Календар запису",
  description: "Онлайн-запис до майстра OzBrows.",
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
