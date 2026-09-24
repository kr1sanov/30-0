import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-bold text-[#00C896] hover:text-[#42e0b2]">30–0</Link>
          <Link href="/" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9CA3AF] hover:border-[#00C896]/40 hover:text-white">← К игре</Link>
        </nav>
        <header className="mb-8 border-b border-white/10 pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00C896]">Правовая информация</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-[#94a3b8]">Редакция от {updated}</p>
        </header>
        <div className="space-y-7 text-[15px] leading-7 text-[#cbd5e1] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs text-[#64748b]">
          <p>30–0 — независимый футбольный драфт и симулятор сезона.</p>
          <div className="mt-3 flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-white">Конфиденциальность</Link>
            <Link href="/terms" className="hover:text-white">Условия использования</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2><div>{children}</div></section>;
}
