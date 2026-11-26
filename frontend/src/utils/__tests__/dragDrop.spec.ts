import { describe, expect, it } from "vitest";

import { carriesEntity, getDraggedEntity, setDraggedEntity } from "../dragDrop";

function fakeTransfer() {
  const data = new Map<string, string>();

  return {
    get types() {
      return [...data.keys()];
    },
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => void data.set(type, value),
  };
}

describe("drag and drop of entries", () => {
  it("round-trips the entity ID through the transfer", () => {
    const transfer = fakeTransfer();

    setDraggedEntity({ transfer, entityId: "automation.licht" });

    expect(carriesEntity(transfer)).toBe(true);
    expect(getDraggedEntity(transfer)).toBe("automation.licht");
  });

  it("ignores drags that carry something else", () => {
    const transfer = fakeTransfer();
    transfer.setData("text/plain", "hello");

    expect(carriesEntity(transfer)).toBe(false);
    expect(getDraggedEntity(transfer)).toBeNull();
    expect(getDraggedEntity(null)).toBeNull();
  });
});
