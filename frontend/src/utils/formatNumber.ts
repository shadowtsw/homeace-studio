/** A plain decimal number as HA sends it: "21.5", "-3", "1527"; not "1e3", "0x10" or "21,5". */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
/** More digits than a JavaScript number keeps exactly; such a value stays as HA sent it. */
const MAX_DIGITS = 15;
const PERCENT = "%";

/** One formatter per language and number of decimals; building one is slow. */
const formats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, decimals: number): Intl.NumberFormat {
  const key = `${locale}|${decimals}`;
  let format = formats.get(key);

  if (!format) {
    format = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formats.set(key, format);
  }

  return format;
}

/**
 * A number as Home Assistant shows it in the UI language: "21,5" and "1.527" in German, "21.5" and
 * "1,527" in English. Keeps the decimals HA sent ("21.50" stays "21,50"); anything that is no plain
 * number ("unavailable", "1e3") comes back unchanged.
 *
 * @example formatNumber({ value: "21.5", locale: "de" }) // "21,5"
 */
export function formatNumber({
  value,
  locale,
}: {
  value: number | string;
  locale: string;
}): string {
  const text = String(value).trim();
  if (!PLAIN_NUMBER.test(text) || text.replace(/[-.]/g, "").length > MAX_DIGITS) {
    return String(value);
  }

  const decimals = text.split(".")[1]?.length ?? 0;

  return numberFormat(locale, decimals).format(Number(text));
}

/**
 * A value with its unit as Home Assistant shows it: "21,5 °C", "1.527 W", and "%" the way the UI
 * language writes it ("25 %" in German, "25%" in English).
 *
 * @param options.percent - The language's percent text, e.g. `(value) => t("common.percent", { value })`.
 * @example formatWithUnit({ value: 21.5, unit: "°C", locale: "de", percent }) // "21,5 °C"
 */
export function formatWithUnit({
  value,
  unit,
  locale,
  percent,
}: {
  value: number | string;
  unit: string;
  locale: string;
  percent: (value: string) => string;
}): string {
  const number = formatNumber({ value, locale });

  return unit === PERCENT ? percent(number) : `${number} ${unit}`;
}
