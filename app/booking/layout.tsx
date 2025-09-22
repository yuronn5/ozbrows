import type { Metadata } from "next";
import "./booking.css";

export const metadata: Metadata = {
  title: "Booking Calendar",
  description: "Online appointment scheduling with OzBrows.",
};
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
