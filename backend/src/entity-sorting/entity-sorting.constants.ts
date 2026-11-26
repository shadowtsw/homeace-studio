/** Injection token for {@link SortingSourcesRepository}. */
export const SORTING_SOURCES_REPOSITORY = Symbol("SORTING_SOURCES_REPOSITORY");

/** The browser sends moves in small batches so it can show progress; this caps one batch. */
export const MAX_MOVES_PER_BATCH = 100;
/** Far more than anyone writes; protects the overlay against oversized requests. */
export const MAX_RULES = 100;
export const MAX_RULE_CONDITIONS = 10;
export const MAX_REJECTIONS = 5000;
export const MAX_IGNORED = 5000;
export const VALUE_MAX_LENGTH = 200;
export const KEY_MAX_LENGTH = 300;
