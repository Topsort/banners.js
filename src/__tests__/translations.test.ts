import { describe, expect, it } from "vitest";
import { languageToPrefix, resolveTranslations } from "../translations";

describe("languageToPrefix", () => {
  it("normalizes 2-part BCP-47 codes", () => {
    expect(languageToPrefix("en-US")).toBe("enUS");
    expect(languageToPrefix("pt-BR")).toBe("ptBR");
    expect(languageToPrefix("fr-FR")).toBe("frFR");
  });

  it("accepts underscore separator for POSIX/Java-style locale codes", () => {
    expect(languageToPrefix("en_US")).toBe("enUS");
    expect(languageToPrefix("pt_BR")).toBe("ptBR");
    expect(languageToPrefix("zh_CN")).toBe("zhCN");
  });

  it("returns empty string for empty input", () => {
    expect(languageToPrefix("")).toBe("");
  });

  it("returns empty string when input starts with a separator", () => {
    expect(languageToPrefix("_en")).toBe("");
    expect(languageToPrefix("-en")).toBe("");
  });

  it("lowercases single-part codes", () => {
    expect(languageToPrefix("EN")).toBe("en");
  });

  it("forces case regardless of input casing", () => {
    expect(languageToPrefix("EN-us")).toBe("enUS");
    expect(languageToPrefix("Pt-bR")).toBe("ptBR");
  });
});

describe("resolveTranslations", () => {
  const base = {
    ctaText: "Default CTA",
    ctaAriaLabel: "default aria",
    headline: "Default Headline",
    enUSctaText: "EN CTA",
    enUSctaAriaLabel: "EN aria",
    frFRctaText: "CTA FR",
  };

  it("overrides base fields with translated values when language matches", () => {
    const resolved = resolveTranslations(base, "en-US");
    expect(resolved.ctaText).toBe("EN CTA");
    expect(resolved.ctaAriaLabel).toBe("EN aria");
  });

  it("leaves base fields untouched when a translation key is missing", () => {
    const resolved = resolveTranslations(base, "en-US");
    expect(resolved.headline).toBe("Default Headline");
  });

  it("ignores translations for non-matching languages", () => {
    const resolved = resolveTranslations(base, "en-US");
    expect(resolved.ctaText).toBe("EN CTA");
    // frFRctaText should not override anything because we asked for en-US
    expect(resolved.ctaText).not.toBe("CTA FR");
  });

  it("returns content unchanged when language is undefined", () => {
    expect(resolveTranslations(base)).toBe(base);
  });

  it("returns content unchanged when language is empty string", () => {
    expect(resolveTranslations(base, "")).toBe(base);
  });

  it("returns content unchanged when language resolves to an empty prefix", () => {
    expect(resolveTranslations(base, "_en")).toBe(base);
  });

  it("returns content unchanged when language has no matching translations", () => {
    const resolved = resolveTranslations(base, "pt-BR");
    expect(resolved.ctaText).toBe("Default CTA");
    expect(resolved.headline).toBe("Default Headline");
  });

  it("does not mutate the original content object", () => {
    const snapshot = { ...base };
    resolveTranslations(base, "en-US");
    expect(base).toEqual(snapshot);
  });

  it("retains the prefixed keys in the resolved object", () => {
    const resolved = resolveTranslations(base, "en-US");
    expect(resolved.enUSctaText).toBe("EN CTA");
  });
});
