import { describe, expect, it } from "vitest";

import { isPreviewVersion, previewFeedbackUrl } from "../releaseChannel";

describe("isPreviewVersion", () => {
  it("recognises the versions of the Preview app", () => {
    expect(isPreviewVersion("0.15.0-preview.1")).toBe(true);
    expect(isPreviewVersion("0.14.2-preview.12")).toBe(true);
    expect(isPreviewVersion("0.14.2-preview.1-test2")).toBe(true);
  });

  it("treats normal, test and local builds as no Preview", () => {
    expect(isPreviewVersion("0.15.0")).toBe(false);
    expect(isPreviewVersion("0.14.2-test1")).toBe(false);
    expect(isPreviewVersion("local")).toBe(false);
    expect(isPreviewVersion("0.15.0-previewer")).toBe(false);
  });
});

describe("previewFeedbackUrl", () => {
  it("opens the Preview form on GitHub with the version filled in", () => {
    const url = new URL(previewFeedbackUrl("0.15.0-preview.1"));

    expect(url.origin + url.pathname).toBe(
      "https://github.com/shadowtsw/homeace-studio/issues/new",
    );
    expect(url.searchParams.get("template")).toBe("preview-feedback.yml");
    expect(url.searchParams.get("version")).toBe("0.15.0-preview.1");
  });
});
