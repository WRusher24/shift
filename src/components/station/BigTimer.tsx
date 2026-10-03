"use client";

import { useNow } from "@/components/hooks";
import { formatDuration } from "@/lib/format";

interface BigTimerProps {
  activeMs: number;
  pauseMs: number;
  paused: boolean;
  pauseReason: string | null;
  pauseSince: number | null;
  syncOffset: number;
  jumbo?: boolean;
}

/** Giant, factory-floor-readable live timer. */
export function BigTimer({
  activeMs,
  pauseMs,
  paused,
  pauseReason,
  pauseSince,
  syncOffset,
  jumbo = false,
}: BigTimerProps) {
  const now = useNow(500) + syncOffset;
  const currentPauseMs =
    paused && pauseSince ? Math.max(0, now - pauseSince) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-2 px-5 py-4 text-center transition-colors ${
        paused
          ? "border-safety-300 bg-safety-50"
          : "animate-timer-glow border-volt-300 bg-gradient-to-b from-volt-50 to-white"
      }`}
    >
      <p
        className={`text-xs font-black tracking-wide ${
          paused ? "text-safety-700" : "text-volt-700"
        }`}
      >
        {paused ? "הטיימר בהשהיה — זמן עבודה פעיל" : "זמן עבודה פעיל"}
      </p>
      <p
        className={`digits font-bold leading-none ${
          jumbo ? "text-7xl xl:text-8xl" : "text-6xl xl:text-7xl"
        } ${paused ? "text-safety-700/70" : "text-ink"} ${
          paused ? "animate-pause-blink" : ""
        }`}
      >
        {formatDuration(activeMs)}
      </p>

      <div className="mt-3 flex items-center justify-center gap-3 text-[13px] font-extrabold">
        <span className="num rounded-full bg-white/80 px-3 py-1 text-ink-soft">
          זמן כולל: {formatDuration(activeMs + pauseMs)}
        </span>
        <span
          className={`num rounded-full px-3 py-1 ${
            paused ? "bg-safety-500 text-white" : "bg-white/80 text-safety-600"
          }`}
        >
          השהיות: {formatDuration(pauseMs)}
        </span>
      </div>

      {paused && (
        <div className="mt-2 animate-pop-in">
          <p className="text-sm font-black text-safety-700">{pauseReason}</p>
          <p className="digits text-3xl font-bold text-safety-600">
            {formatDuration(currentPauseMs)}
          </p>
        </div>
      )}
    </div>
  );
}
