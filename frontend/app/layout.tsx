import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Mono, Syne } from "next/font/google";

import { Providers } from "@/components/providers/Providers";
import { ElevenLabsDebriefPlayer } from "@/components/shared/ElevenLabsDebriefPlayer";
import { WaterWasteMeter } from "@/components/shared/WaterWasteMeter";

import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RainUSE Nexus — Water Opportunity Intelligence Engine",
  description:
    "Autonomous prospecting for commercial water reuse — find, score, and close opportunities across the US.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${ibmPlexSans.variable} ${spaceMono.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <WaterWasteMeter />
          <ElevenLabsDebriefPlayer />
        </Providers>
      </body>
    </html>
  );
}
