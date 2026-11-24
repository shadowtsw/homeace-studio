const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;

const UNITS = { h: "h", min: "min", s: "s" };
/** Languages whose short units differ from the international h / min / s. */
const UNITS_BY_LOCALE: Partial<Record<string, typeof UNITS>> = {
  ru: { h: "ч", min: "мин", s: "с" },
};

/**
 * How long a run took, short: "0,4 s", "48 s", "5 min 03 s", "1 h 05 min" ("5 мин 03 с" in ru).
 *
 * @param locale - For the decimal comma and the units.
 */
export function runDuration(seconds: number, locale: string): string {
  const unit = UNITS_BY_LOCALE[locale] ?? UNITS;

  if (seconds < 10) {
    const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(seconds);
    return `${value} ${unit.s}`;
  }

  const whole = Math.round(seconds);
  const pad = (value: number): string => String(value).padStart(2, "0");

  if (whole < 60) return `${whole} ${unit.s}`;
  if (whole < 3600) return `${Math.floor(whole / 60)} ${unit.min} ${pad(whole % 60)} ${unit.s}`;

  return `${Math.floor(whole / 3600)} ${unit.h} ${pad(Math.floor((whole % 3600) / 60))} ${unit.min}`;
}

/** "19:42" in the local time zone. */
export function clockTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export type DayTexts = { today: string; yesterday: string };

/**
 * The day of a run for the list headings: "Heute", "Gestern", the weekday within a week, else the date.
 */
export function dayLabel(iso: string, now: Date, locale: string, texts: DayTexts): string {
  const day = new Date(iso);
  const startOf = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((startOf(now) - startOf(day)) / DAY_MS);

  if (daysAgo <= 0) return texts.today;
  if (daysAgo === 1) return texts.yesterday;
  if (daysAgo < WEEK_DAYS) return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(day);

  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(day);
}
