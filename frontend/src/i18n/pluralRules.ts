/**
 * Russian plural forms for vue-i18n. The messages in ru.ts have
 * - 4 forms "zero | 1, 21 | 2–4, 22–24 | 0, 5–20, 11–14" where en has 3 ("nothing | one | many"),
 * - 3 forms "1, 21 | 2–4, 22–24 | 0, 5–20, 11–14" where en has 2 ("one | many").
 *
 * @param choice - The count.
 * @param choicesLength - Number of forms in the message.
 * @param defaultRule - vue-i18n's own rule, used for any other number of forms.
 * @returns Index of the form to show.
 */
export function russianPluralRule(
  choice: number,
  choicesLength: number,
  defaultRule?: (choice: number, choicesLength: number) => number,
): number {
  const count = Math.abs(choice);

  if (choicesLength !== 3 && choicesLength !== 4) {
    return defaultRule ? defaultRule(choice, choicesLength) : Math.min(count, choicesLength - 1);
  }
  if (choicesLength === 4 && count === 0) return 0;

  const offset = choicesLength === 4 ? 1 : 0;
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) return offset;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return offset + 1;
  }
  return offset + 2;
}
