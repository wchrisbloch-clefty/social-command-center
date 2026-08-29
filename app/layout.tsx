import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// One typeface, two weights. The serif (Playfair), the display face (Archivo)
// and the meta face (Public Sans) are retired with the editorial theme — the
// Signal Desk system is a single clean sans across the whole app.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AetherHub",
  description: "Elite Social Intelligence & Growth Command Center",
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Light is the primary target; the toggle swaps data-theme on this element.
    <html
      lang="en"
      data-theme="light"
      className={inter.variable}
    >
      <body>{children}</body>
    </html>
  );
}
