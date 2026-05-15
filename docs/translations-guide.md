# Banner Translations Guide

This page explains how to localize the text inside a Topsort banner using the `language` attribute. It is intended for engineers integrating `banners.js` into a storefront.

For the design rationale and encoding rules see [`translations.md`](./translations.md).

---

## What this does in one sentence

A single HTML attribute (`language="en-GB"`) tells `<topsort-banner>` which translated values inside the auction response to use when filling the predefined template — no extra JavaScript, no global config, no extra network requests.

## Quick start

```html
<topsort-banner
  id="content-block-clp"
  language="pt-BR"
  predefined
>
  <a href="#" data-ts-clickable>
    <img data-ts-field="mainImage:src" src="/fallback.png" alt="" />
    <p data-ts-field="description:textContent">Default description</p>
    <span data-ts-field="ctaText:textContent">Default CTA</span>
  </a>
</topsort-banner>
```

That's the whole integration. If the auction response for this slot returns translation keys for `pt-BR`, the `<p>` and `<span>` are replaced with the Portuguese values at render time. If it doesn't, the defaults stay.

---

## How it works behind the scenes

<img width="1018" height="489" alt="image" src="https://github.com/user-attachments/assets/54916803-2a81-429b-8481-2892c27a69a2" />


The key thing to note is **step 1**: the prefix is computed from the BCP-47 language code, not from any global table. `en-GB` always becomes `enGB`, `pt-BR` always becomes `ptBR`. There is nothing to register or configure ahead of time.

### Resolution algorithm in plain English

1. Read the `language` attribute. If empty, use the base fields and stop.
2. Build the prefix: lowercase the first segment, uppercase every later segment, drop the hyphens. (`en-GB` → `enGB`.)
3. Walk every key in the `content` map. For each key whose name starts with the prefix:
   - Strip the prefix.
   - Lowercase the first character of what's left.
   - Copy the value over the field of that name.
4. Apply the resulting object to the template.

Translation keys override base fields. Anything not translated falls back silently.

---

## Auction response shape

Translations are flat fields in the same `content` map as the base values, named `<prefix><PascalCaseBaseField>`. Here's a real example:

```json
{
  "results": [
    {
      "resultType": "banners",
      "winners": [
        {
          "asset": [
            {
              "url": "https://topsortassets.com/asset_01krp7mr4hebgr2y198598pxa4.json",
              "content": {
                "ctaText": "Default CTA Text",
                "description": "Default Description",
                "mainImage": "https://topsortassets.com/asset_01krp7m9bgfc4rnbwd09kv0c7j.png",
                "mobileImage": "https://topsortassets.com/asset_01krp7mh4nfxvtj1seexgavv14.png",
                "target": "https://www.clubavolta.com/pt",

                "enGBctaText": "EN GB Headline",
                "enGBdescription": "EN GB Description",
                "esESctaText": "ES Headline",
                "esESdescription": "ES Description",
                "frFRctaText": "FR Headline",
                "frFRdescription": "FR Description",
                "ptBRctaText": "PT BR Headline",
                "ptBRdescription": "PT BR Description"
              }
            }
          ],
          "campaignId": "019e2c7a-7bc2-7bf1-9eea-231bc19cf055",
          "type": "vendor",
          "id": "Tom Ford",
          "resolvedBidId": "6zkWfwoQ...",
          "vendorId": "Tom Ford",
          "rank": 1
        }
      ],
      "error": false
    }
  ]
}
```

For this response, here is what the SDK would feed to `applyTemplate` depending on the `language` attribute:

| `language` | `ctaText` resolves to | `description` resolves to | `mainImage` resolves to |
|---|---|---|---|
| *(unset)* | `Default CTA Text` | `Default Description` | `…asset_01krp7m9bgfc4rnbwd09kv0c7j.png` |
| `en-GB` | `EN GB Headline` | `EN GB Description` | `…asset_01krp7m9bgfc4rnbwd09kv0c7j.png` |
| `es-ES` | `ES Headline` | `ES Description` | `…asset_01krp7m9bgfc4rnbwd09kv0c7j.png` |
| `fr-FR` | `FR Headline` | `FR Description` | `…asset_01krp7m9bgfc4rnbwd09kv0c7j.png` |
| `pt-BR` | `PT BR Headline` | `PT BR Description` | `…asset_01krp7m9bgfc4rnbwd09kv0c7j.png` |
| `de-DE` | `Default CTA Text` *(fallback)* | `Default Description` *(fallback)* | `…asset_01krp7m9bgfc4rnbwd09kv0c7j.png` |

`mainImage` is never translated because there are no `<prefix>mainImage` keys in the response — translations are text-only.

### Field naming rules

For a base field `<baseField>` in `camelCase` and a language code `<lang>-<REGION>`:

- Prefix: `<lang>.toLowerCase() + <REGION>.toUpperCase()` → e.g. `pt-BR` → `ptBR`.
- Translation key: `<prefix><PascalCase(baseField)>` → e.g. `ptBR` + `CtaText` → `ptBRctaText`.
- Note: the *base field* keeps its leading lowercase letter; only the *match* uses PascalCase, which the SDK reverses by lowercasing the first character after stripping the prefix.

So `description` → `enGBdescription`, `ctaText` → `enGBctaText`, `headline` → `enGBheadline`.

---

## Examples

### Standalone banner with language attribute

```html
<topsort-banner id="hero" language="fr-FR" predefined>
  <a href="#" data-ts-clickable>
    <img data-ts-field="mainImage:src" src="/fallback.png" alt="" />
    <h3 data-ts-field="description:textContent">Fallback description</h3>
    <button data-ts-field="ctaText:textContent">Default CTA</button>
  </a>
</topsort-banner>
```

After the auction:
- `<h3>` text → `FR Description`
- `<button>` text → `FR Headline`
- `<img src>` → the base `mainImage` URL

### Switching language at runtime

The component reacts to attribute changes without re-running the auction:

```js
const banner = document.querySelector("topsort-banner");

// User picks a language from a dropdown:
languageSelect.addEventListener("change", (e) => {
  banner.setAttribute("language", e.target.value); // e.g. "pt-BR"
});
```

No second `POST /v2/auctions` is made. The SDK simply re-resolves the cached content and re-applies the template.

### Context mode (multiple slots, one auction)

```html
<topsort-banner id="hero" context language="es-ES">
  <topsort-banner-slot rank="1" predefined>
    <p data-ts-field="description:textContent">…</p>
    <button data-ts-field="ctaText:textContent">…</button>
  </topsort-banner-slot>

  <topsort-banner-slot rank="2" predefined>
    <p data-ts-field="description:textContent">…</p>
    <button data-ts-field="ctaText:textContent">…</button>
  </topsort-banner-slot>
</topsort-banner>
```

`language` is set **once on the parent**. Each slot inherits it through Lit context. Changing the parent's `language` triggers re-resolution in every child slot.

### Removing the attribute

Removing the attribute (or setting it to an empty string) reverts to base fields:

```js
banner.removeAttribute("language"); // → defaults
```

---

## What you can and can't translate

| Can | Can't (today) |
|---|---|
| Any text field bound with `data-ts-field="<key>:textContent"` | Image fields (`mainImage`, `mobileImage`) — the backend does not emit `<prefix>mainImage` keys |
| Any attribute target bound via `data-ts-field="<key>:title"`, `data-ts-field="<key>:alt"`, etc. | Telemetry attributes (`data-ts-clickable`, `data-ts-resolved-bid`) — the SDK manages these |
| Multiple bindings on one element (`data-ts-field="ctaText:textContent, ctaAriaLabel:aria-label"`) | The `target` / `href` of the click wrapper (not currently translated by the backend) |

If a field doesn't have a corresponding `<prefix><BaseField>` key in the response, the base value is used — silently, no warning. That's by design: a banner with a partial translation should still render.

---

## What the `language` attribute expects

| Property | Value |
|---|---|
| Type | `string` — a 2-part BCP-47 code, e.g. `en-US`, `fr-FR`, `pt-BR`, `en-GB`, `es-ES` |
| Casing | Either case works on input — `EN-us` and `en-US` both produce prefix `enUS` |
| Optional | Yes. Omitting it (or setting it to `""`) uses base fields. |
| Inherits from `<html lang>`? | **No.** Explicit only — no implicit locale detection. |
| Default | None — must be set explicitly to enable translation. |
| Supported shape | 2-part codes only. 3-part codes like `zh-Hant-TW` are not committed to in v1. |

---

## Common mistakes

### Mistake: using `lang` instead of `language`

```html
<!-- WRONG: lang is a global HTML attribute and is inherited by descendants -->
<topsort-banner lang="en-US" predefined>...</topsort-banner>

<!-- RIGHT -->
<topsort-banner language="en-US" predefined>...</topsort-banner>
```

`lang` is a standard HTML attribute that browsers and accessibility tools use globally. The SDK uses `language` to avoid collisions.

### Mistake: expecting fields with no `data-ts-field` to translate

Translations override fields inside the `content` map and are surfaced through template bindings. A static `<span>Hello</span>` with no `data-ts-field` is not touched.

### Mistake: expecting images to translate

`mainImage` and `mobileImage` are not translated by the backend in v1. If you need locale-specific imagery today, run separate auctions per locale rather than a single response.

### Mistake: setting the attribute too late

The `language` value is read when the auction response is applied. Setting `language` before the first render is recommended. Setting it after the first render also works (the SDK re-resolves), but the brief flash of default text will be visible.

---

## Verifying it works

Open `demo/translations-test/index.html` after running `pnpm build`. The page:

- Calls the real `/v2/auctions` endpoint with a configurable language.
- Logs the raw response (so you can see whether `<prefix><field>` keys are present).
- Re-renders the template live as you switch the language dropdown.
- Shows the current resolved values on the right ("Resolved content" panel).

If the auction response does not include the `<prefix><field>` keys for the language you picked, you'll see the default values stay put — that's the fallback behavior working as designed.

---

## Reference

- Design doc and encoding rules: [`translations.md`](./translations.md).
- Source: `src/translations.ts` (resolver), `src/template.ts` (consumer), `src/index.ts` (attribute + context wiring).
- Test page: `demo/translations-test/`.
