"use client";

import {
  CalendarClock,
  Clock3,
  Download,
  FileSpreadsheet,
  PackageCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { AdminCtx } from "./AdminClient";

const REPORTS = [
  {
    kind: "batches",
    title: "יומן אצוות מלא",
    description:
      "כל אצווה שנרשמה: תאריכים, שעות התחלה וסיום, זמן עבודה פעיל, זמן כולל, פירוט השהיות, צוות, משטחים ונקודות. מתאים למעקב תפעולי ובקרת ייצור.",
    icon: CalendarClock,
    accent: "bg-brand-50 text-brand-600",
  },
  {
    kind: "points",
    title: "סיכום נקודות עובדים — מירוץ פעיל",
    description:
      "דירוג מלא לכל עובד: סך נקודות, שעות עבודה פעילות, נקודות לשעה (PPH), סטטוס עמידה בסף השעות ומספר משטחים. הבסיס לחלוקת הפרסים והשכר המשתנה.",
    icon: Trophy,
    accent: "bg-volt-50 text-volt-600",
  },
  {
    kind: "downtime",
    title: "דוח השבתות (Down-Time)",
    description:
      "פירוט כל ההשהיות לפי סיבה: מחסור חומרי גלם, תחזוקה, החלפות והפסקות — כולל משך מצטבר ואחוז מזמן האצווה. כלי חד לשיפור תהליכים.",
    icon: Clock3,
    accent: "bg-safety-50 text-safety-600",
  },
];

export function ReportsTab({ ctx }: { ctx: AdminCtx }) {
  const { state } = ctx;
  return (
    <div className="space-y-5">
      {/* Quick totals */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TotalCard
          icon={<UsersRound className="h-5 w-5" />}
          label="עובדים פעילים"
          value={formatNumber(state.workers.filter((w) => w.active).length, 0)}
        />
        <TotalCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="אצוות סה״כ"
          value={formatNumber(state.totals.batchesAllTime, 0)}
        />
        <TotalCard
          icon={<PackageCheck className="h-5 w-5" />}
          label="משטחים סה״כ"
          value={formatNumber(state.totals.palletsAllTime, 0)}
        />
        <TotalCard
          icon={<Trophy className="h-5 w-5" />}
          label="נקודות במירוץ הנוכחי"
          value={formatNumber(state.totals.racePoints)}
          hot
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {REPORTS.map(({ kind, title, description, icon: Icon, accent }) => (
          <article
            key={kind}
            className="flex flex-col rounded-3xl border border-edge bg-surface p-5 shadow-card"
          >
            <span className={`mb-3 grid h-12 w-12 place-items-center rounded-2xl ${accent}`}>
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-black text-ink">{title}</h3>
            <p className="mt-1 flex-1 text-sm font-semibold leading-relaxed text-ink-soft">
              {description}
            </p>
            <a
              href={`/api/export/${kind}`}
              className="touch-lg mt-4 flex items-center justify-center gap-2 rounded-xl bg-ink py-3 font-black text-white transition-colors hover:bg-ink/85"
            >
              <Download className="h-5 w-5" />
              הורדת CSV
            </a>
          </article>
        ))}
      </section>

      <p className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800">
        <FileSpreadsheet className="h-5 w-5 shrink-0" />
        הקבצים נפתחים ישירות ב־Excel בעברית תקינה (UTF-8), כשהמספרים מוצגים תמיד בספרות רגילות
        (0-9). ניתן למיין, לסנן ולבנות מהם דוחות שכר ובקרה.
      </p>
    </div>
  );
}

function TotalCard({
  icon,
  label,
  value,
  hot = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-3xl border px-4 py-4 shadow-card ${
        hot ? "border-volt-200 bg-volt-50" : "border-edge bg-surface"
      }`}
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-2xl ${
          hot ? "bg-volt-600 text-white" : "bg-brand-50 text-brand-600"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="digits block text-2xl font-bold leading-none text-ink">{value}</span>
        <span className="text-xs font-extrabold text-ink-faint">{label}</span>
      </span>
    </div>
  );
}
