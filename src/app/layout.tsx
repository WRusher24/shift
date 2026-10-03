import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Heebo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const jetMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-num",
  display: "swap",
});

export const metadata: Metadata = {
  title: "שיפט | شيفت — מעקב ייצור ומשחוק לקווי מילוי",
  description:
    "פלטפורמת מעקב ייצור בזמן אמת ומשחוק לקווי מילוי ואריזה במפעל דטרגנטים: אצוות, משטחים, נקודות, מירוצים ודוחות.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${jetMono.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
