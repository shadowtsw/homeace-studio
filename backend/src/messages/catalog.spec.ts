import { DEFAULT_LANGUAGE, LANGUAGES, getCatalog, isKnownMessageId } from "./catalog";
import { MESSAGE_ID } from "./message-ids";

describe("message catalog", () => {
  it("has a non-empty text for every message ID in every language", () => {
    const idsWithoutText = LANGUAGES.flatMap((language) => {
      const catalog = getCatalog(language);
      return Object.values(MESSAGE_ID)
        .filter((messageId) => !catalog[messageId]?.trim())
        .map((messageId) => `${language}: ${messageId}`);
    });

    expect(LANGUAGES).toEqual(["de", "en", "ru"]);
    expect(idsWithoutText).toEqual([]);
  });

  it("falls back to the default language", () => {
    expect(getCatalog("xx")).toBe(getCatalog(DEFAULT_LANGUAGE));
    expect(getCatalog(undefined)).toBe(getCatalog(DEFAULT_LANGUAGE));
  });

  it("recognizes only catalog IDs", () => {
    expect(isKnownMessageId("NOT_FOUND")).toBe(true);
    expect(isKnownMessageId("Cannot GET /nope")).toBe(false);
    expect(isKnownMessageId(42)).toBe(false);
  });
});
