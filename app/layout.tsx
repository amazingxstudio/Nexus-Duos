import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { BottomNav } from "@/components/ui/BottomNav";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Nexus Duos",
  description: "Real-time 1v1 duels, connected through Telegram.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#06060B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="font-body min-h-screen bg-void bg-duel-radial antialiased">
        <AmbientBackground />
        <div className="relative z-10">
          <AppProviders>
            {children}
            <BottomNav />
          </AppProviders>
        </div>
      </body>
    </html>
  );
}
