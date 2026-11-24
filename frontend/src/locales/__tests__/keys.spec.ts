import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import de from "../de";
import en from "../en";
import ru from "../ru";

const LANGUAGES = { de, en, ru };

const SOURCE_DIR = join(__dirname, "..", "..");
/** t("a.b.c") or t('a.b.c') with a plain key; template keys like t(`kind.${x}`) are left out. */
const KEY_CALL = /\bt\(\s*["']([a-zA-Z][\w]*(?:\.[\w]+)+)["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sourceFiles(path);
    return /\.(vue|ts)$/.test(name) ? [path] : [];
  });
}

function hasKey(messages: unknown, key: string): boolean {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object" || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}

describe("translation keys", () => {
  it("exist in every language for every fixed key the code uses", () => {
    const keys = new Set(
      sourceFiles(SOURCE_DIR).flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(KEY_CALL)].map((match) => match[1] ?? ""),
      ),
    );
    const missing = Object.entries(LANGUAGES)
      .flatMap(([code, messages]) =>
        [...keys].filter((key) => !hasKey(messages, key)).map((key) => `${code}: ${key}`),
      )
      .sort();

    expect(keys.size).toBeGreaterThan(300);
    expect(missing).toEqual([]);
  });

  it("give Russian one plural form more than English (see i18n/pluralRules.ts)", () => {
    /** Called as t("deps.more", n) with n ≥ 1 and needs no noun in Russian: one form. */
    const singleForm = new Set(["deps.more"]);
    const wrong = leaves(en)
      .filter(([, text]) => text.includes("|"))
      .filter(([key, text]) => {
        const expected = singleForm.has(key) ? 1 : text.split("|").length + 1;
        return textAt(ru, key).split("|").length !== expected;
      })
      .map(([key]) => key);

    expect(wrong).toEqual([]);
  });
});

function leaves(messages: unknown, prefix = ""): [string, string][] {
  return Object.entries(messages as Record<string, unknown>).flatMap(([name, value]) =>
    typeof value === "string"
      ? [[`${prefix}${name}`, value] as [string, string]]
      : leaves(value, `${prefix}${name}.`),
  );
}

function textAt(messages: unknown, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages);
  return typeof value === "string" ? value : "";
}
