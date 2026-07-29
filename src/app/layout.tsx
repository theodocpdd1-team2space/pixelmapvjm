import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap"
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap"
});

const jetBrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "PixelMapVJM",
  description: "Local-first LED pixel mapper for technical screen layout and calibration workflows.",
  applicationName: "PixelMapVJM",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${orbitron.variable} ${chakra.variable} ${jetBrains.variable}`}>
        {children}
      </body>
    </html>
  );
}
