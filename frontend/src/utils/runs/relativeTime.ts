const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

export type RelativeTimeOptions = {
  iso: string;
  now: Date;
  locale: string;
};

/**
 * "vor 3 Tagen" / "3 days ago" for a time in the past, in the largest unit that fits.
 *
 * @example
 * relativeTime({ iso: "2026-11-17T12:00:00Z", now: new Date("2026-11-20T12:00:00Z"), locale: "de" })
 *   // "vor 3 Tagen"
 */
export function relativeTime({ iso, now, locale }: RelativeTimeOptions): string {
  const seconds = Math.round((Date.parse(iso) - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }

  return format.format(0, "minute");
}
