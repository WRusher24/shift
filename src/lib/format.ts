/**
 * Centralized formatting helpers.
 * RULE: every number rendered in the UI uses Western digits (0-9).
 * We therefore avoid locale-aware number systems and format manually
 * (or pin 'en-US' which always uses 0-9).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Points / generic numbers: up to 2 decimals, thousands separated, digits 0-9. */
export function formatNumber(n: number, maxDecimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(round2(n));
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

/** mm:ss or hh:mm:ss for durations (hours may exceed 24). Always 0-9 digits. */
export function formatDuration(ms: number, withHours = true): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (!withHours && h === 0) return `${mm}:${ss}`;
  return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
}

/** Compact "2h 14m" style with Western digits (used inside tight chips). */
export function formatDurationShort(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} דק׳`;
  return `${h} ש׳ ${String(m).padStart(2, "0")} דק׳`;
}

function partsOf(d: Date) {
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: String(d.getMonth() + 1).padStart(2, "0"),
    year: String(d.getFullYear()),
    hour: String(d.getHours()).padStart(2, "0"),
    minute: String(d.getMinutes()).padStart(2, "0"),
  };
}

/** dd/mm/yyyy — always Western digits. */
export function formatDate(input: Date | string | number): string {
  const p = partsOf(new Date(input));
  return `${p.day}/${p.month}/${p.year}`;
}

/** HH:MM — always Western digits, 24h clock. */
export function formatTime(input: Date | string | number): string {
  const p = partsOf(new Date(input));
  return `${p.hour}:${p.minute}`;
}

/** dd/mm/yyyy HH:MM — always Western digits. */
export function formatDateTime(input: Date | string | number): string {
  const p = partsOf(new Date(input));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Hours with 1 decimal, e.g. 4.5 — Western digits. */
export function formatHours(ms: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(ms / 3600000);
}

/** CSV-safe cell escaping. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
