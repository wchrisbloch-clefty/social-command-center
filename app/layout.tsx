import type { Metadata, Viewport } from "next";
import { Inter, Archivo, Playfair_Display, Public_Sans } from "next/font/google";
import "./globals.css";

// Editorial type system, ported from MyNewsHub:
//   Playfair Display — masthead only
//   Archivo          — headlines, ranked numbers (heavy + tight)
//   Inter            — body
//   Public Sans      — meta: source, timestamp, ticker
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-playfair",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AetherHub",
  description: "Elite Social Intelligence & Growth Command Center",
};

export const viewport: Viewport = {
  themeColor: "#12558c",
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
      className={`${inter.variable} ${archivo.variable} ${playfair.variable} ${publicSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
