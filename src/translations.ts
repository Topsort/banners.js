/**
 * Derive a content-field prefix from a 2-part BCP-47 code.
 * `en-US` → `enUS`, `pt-BR` → `ptBR`. Returns `""` for empty input.
 */
export function languageToPrefix(language: string): string {
  if (!language) return "";
  const [first, ...rest] = language.split("-");
  if (!first) return "";
  return first.toLowerCase() + rest.map((p) => p.toUpperCase()).join("");
}

/**
 * Returns a new content object where any key matching `<prefix><PascalField>`
 * overrides the corresponding base field. Original `content` is not mutated.
 * Returns `content` unchanged when `language` is empty/undefined.
 *
 * Assumes the backend only emits prefixed keys for translations — a
 * non-translation field colliding with a known prefix would be misinterpreted.
 */
export function resolveTranslations<T extends Record<string, string>>(
  content: T,
  language?: string,
): T {
  if (!language) return content;
  const prefix = languageToPrefix(language);
  if (!prefix) return content;

  const resolved: Record<string, string> = { ...content };
  for (const key of Object.keys(content)) {
    if (key.length <= prefix.length || !key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const baseField = rest.charAt(0).toLowerCase() + rest.slice(1);
    resolved[baseField] = content[key];
  }
  return resolved as T;
}
