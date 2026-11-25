/** How many runs HA keeps for an automation or script when its config says nothing. */
export const DEFAULT_STORED_TRACES = 5;

/** The choices under Einstellungen → Bearbeiten; 50 is the backend's limit. */
export const STORED_TRACES_CHOICES = [DEFAULT_STORED_TRACES, 10, 20, 50] as const;
