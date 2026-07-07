import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

// Plus Jakarta Sans across the whole app; its heavy weights (up to 800) drive
// the headings (font-black maps to the nearest loaded face).
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Property Copilot — Map Browser",
  description: "Map-based rental browser scaffold for Metro Vancouver"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.className}>
      <body>
        <NavBar />
        {/* Pages own their width: browse goes full-bleed, home stays narrow. */}
        <main>{children}</main>
      </body>
    </html>
  );
}
