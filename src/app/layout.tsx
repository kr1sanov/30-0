import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "30-0 RPL | Футбольный драфт",
  description: "Собери состав из игроков Российской Премьер-Лиги, крутя колесо фортуны. Заполни 11 позиций и сыграй сезон — сможешь ли ты добиться 30-0?",
  keywords: ["РПЛ", "футбол", "драфт", "30-0", "Российская Премьер-Лига", "футбольная игра"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-[#e2e8f0]`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
