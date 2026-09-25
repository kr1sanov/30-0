import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "30-0 | Драфт РПЛ",
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
      <head />
      <Script id="yandex-metrika" strategy="beforeInteractive">
        {`(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j=0; j<document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110726199', 'ym');

ym(110726199, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
      </Script>
      <body
        className="font-sans antialiased bg-[#0A0A0A] text-[#FFFFFF]"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/110726199"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
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
