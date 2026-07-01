import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "30-0 RPL | Футбольный драфт",
  description: "Собери состав из игроков Российской Премьер-Лиги, крутя колесо фортуны. Заполни 11 позиций и сыграй сезон — сможешь ли ты добиться 30-0?",
  keywords: ["РПЛ", "футбол", "драфт", "30-0", "Российская Премьер-Лига", "футбольная игра"],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a1a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        {/* Telegram WebApp SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a1a0a] text-[#e2e8f0]`}
      >
        {children}
        <Toaster />
        <SonnerToaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 2500,
            style: {
              background: '#0d2d0d',
              border: '1px solid #2a2a4e',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  );
}
