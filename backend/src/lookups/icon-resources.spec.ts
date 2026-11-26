import { iconResourceUrls } from "./icon-resources";

const resource = (url: string, type = "module") => ({ id: url, type, url });

describe("iconResourceUrls", () => {
  it("keeps scripts whose file name says icon, with their query", () => {
    expect(
      iconResourceUrls([
        resource("/local/community/custom-brand-icons/custom-brand-icons.js?v=3-2026.11.3"),
        resource("/hacsfiles/hass-hue-icons/hass-hue-icons.js", "js"),
        resource("/local/community/lovelace-mushroom/mushroom.js?v=4"),
      ]),
    ).toEqual([
      "/local/community/custom-brand-icons/custom-brand-icons.js?v=3-2026.11.3",
      "/hacsfiles/hass-hue-icons/hass-hue-icons.js",
    ]);
  });

  it("ignores stylesheets and folders named icons that hold a card", () => {
    expect(
      iconResourceUrls([
        resource("/local/icons-theme.css", "css"),
        resource("/local/my-icons/weather-card.js"),
      ]),
    ).toEqual([]);
  });

  it("lists a resource once", () => {
    const url = "/local/custom-icons.js";
    expect(iconResourceUrls([resource(url), resource(url)])).toEqual([url]);
  });
});
