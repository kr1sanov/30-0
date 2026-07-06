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
  title: "Футбольный драфт РПЛ",
  description: "Собери состав из игроков Российской Премьер-Лиги, крутя колесо фортуны. Заполни 11 позиций и сыграй сезон — сможешь ли ты добиться 30-0?",
  keywords: ["РПЛ", "футбол", "драфт", "30-0", "Российская Премьер-Лига", "футбольная игра"],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A0A0A] text-[#FFFFFF]`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
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
              background: '#141414',
              border: '1px solid #2A2A2A',
              color: '#FFFFFF',
            },
          }}
        />
      </body>
    </html>
  );
}
