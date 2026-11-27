/** Limits as in the backend (backend/src/versions/versions.constants.ts), for texts and checks. */
export const VERSION_LIMITS = {
  /** Versions without a name that stay; the oldest beyond drops out. */
  unnamed: 20,
  /** Versions with a name ("Merken"); they do not count against `unnamed`. */
  named: 10,
} as const;
