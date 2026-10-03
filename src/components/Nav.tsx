"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, History, MonitorPlay, Settings2, Trophy } from "lucide-react";

const LINKS = [
  { href: "/", label: "עמדת ייצור", icon: MonitorPlay },
  { href: "/leaderboard", label: "טבלת מובילים", icon: Trophy },
  { href: "/history", label: "היסטוריה", icon: History },
  { href: "/admin", label: "ניהול", icon: Settings2 },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-edge bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-card transition-transform group-hover:rotate-6">
            <Factory className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="leading-none">
            <span className="block text-lg font-black tracking-tight text-ink">
              שיפט
            </span>
            <span className="block text-[10px] font-bold tracking-[0.22em] text-ink-faint">
              SHIFT • شيفت
            </span>
          </span>
        </Link>

        <nav className="ms-auto flex items-center gap-1 sm:gap-1.5">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold transition-all sm:px-3.5 ${
                  active
                    ? "bg-brand-600 text-white shadow-card"
                    : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
