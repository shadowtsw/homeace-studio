import { haUserFrom, INGRESS_USER_HEADER } from "./ha-user";

describe("haUserFrom", () => {
  it("reads the user from the ingress headers", () => {
    const user = haUserFrom({
      [INGRESS_USER_HEADER.id]: "abc123",
      [INGRESS_USER_HEADER.name]: "alex",
      [INGRESS_USER_HEADER.displayName]: "Alex",
    });

    expect(user).toEqual({ id: "abc123", name: "Alex" });
  });

  it("falls back to the login name, then to the ID", () => {
    expect(
      haUserFrom({ [INGRESS_USER_HEADER.id]: "abc", [INGRESS_USER_HEADER.name]: "alex" }),
    ).toEqual({ id: "abc", name: "alex" });
    expect(haUserFrom({ [INGRESS_USER_HEADER.id]: "abc" })).toEqual({ id: "abc", name: "abc" });
  });

  it("finds no user outside of HA (no or an empty ID)", () => {
    expect(haUserFrom({})).toBeNull();
    expect(haUserFrom({ [INGRESS_USER_HEADER.id]: "  " })).toBeNull();
  });

  it("takes the first value of a repeated header", () => {
    expect(haUserFrom({ [INGRESS_USER_HEADER.id]: ["first", "second"] })?.id).toBe("first");
  });
});
