import { ISSUES_URL } from "@/constants/settings";

/** Versions of the Preview app look like "0.15.0-preview.2" (homeace-studio-preview/config.yaml). */
const PREVIEW_VERSION = /-preview(\.|$)/;

/**
 * Whether this build is the Preview app: the next release before it is announced. The version alone
 * tells, so both apps are built from the same sources.
 */
export function isPreviewVersion(version: string): boolean {
  return PREVIEW_VERSION.test(version.trim());
}

/**
 * A new GitHub issue from the Preview feedback form, with the running version filled in. Nothing is
 * sent from the app; the user writes and submits the issue on GitHub.
 */
export function previewFeedbackUrl(version: string): string {
  const query = new URLSearchParams({ template: "preview-feedback.yml", version });

  return `${ISSUES_URL}/new?${query.toString()}`;
}
