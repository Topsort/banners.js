[![CI](https://github.com/Topsort/banners.js/actions/workflows/test.yml/badge.svg)](https://github.com/Topsort/banners.js/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/Topsort/banners.js/branch/main/graph/badge.svg)](https://codecov.io/gh/Topsort/banners.js)
[![npm version](https://img.shields.io/npm/v/@topsort/banners)](https://www.npmjs.com/package/@topsort/banners)
[![npm downloads](https://img.shields.io/npm/dw/@topsort/banners)](https://www.npmjs.com/package/@topsort/banners)
![license](https://img.shields.io/github/license/Topsort/banners.js)
![GitHub Repo stars](https://img.shields.io/github/stars/topsort/banners.js?style=social)

# Topsort Banner Ad Web component

`banners.js` is **Topsort's official Web Component SDK** for rendering sponsored banner ads on merchant storefronts. It handles auction requests, banner rendering, and telemetry automatically. A [Topsort account](https://app.topsort.com) and API token are required.

# Usage

Directly from unpkg.com

```html
<script>
  // Must come first — analytics.js reads window.TS on load
  window.TS = {
    token: "<your topsort api key>",
  };
  // Custom behavior can be configured for each site.
  window.TS_BANNERS = {
    // handle the destination link
    getLink(banner) {
      return `https://example.com/${banner.id}`;
    },
    // handle loading/fetching state
    getLoadingElement() {
      const el = document.createElement("div");
      el.innerText = "Loading...";
      return el;
    },
    // handle errors
    getErrorElement() {
      const el = document.createElement("div");
      el.innerText = "Error loading banner";
      return el;
    },
  };
</script>
<script
  async
  type="module"
  src="https://unpkg.com/@topsort/banners/dist/banners.mjs"
></script>
<script async type="module" src="https://unpkg.com/@topsort/analytics.js"></script>
<body>
  <topsort-banner width="600" height="400" id="<your slot id>"></topsort-banner>
</body>
```

## Legacy Systems (IIFE Bundle)

For environments that don't support ES modules (e.g., Magento), use the IIFE bundle:

```html
<script src="https://unpkg.com/@topsort/banners/dist/banners.iife.js"></script>
```

| Bundle | Size (gzip) | Size (brotli) |
|--------|-------------|---------------|
| `banners.mjs` (ES module) | 12.40 kB | 11.01 kB |
| `banners.iife.js` (IIFE) | 11.18 kB | 10.08 kB |

## Rendering multiple banners with one slot ID

You can render multiple banners using the same slot ID and dimensions by setting up
a banner context. This is useful when you want to run an auction with multiple results.
To do that you have to pass the attribute `context="true"` to the `topsort-banner` and
use `topsort-banner-slot` as children elements.

```html
<topsort-banner context="true" width="600" height="400" id="<your slot id>">
  <topsort-banner-slot rank="1"></topsort-banner-slot>
  <topsort-banner-slot rank="2"></topsort-banner-slot>
  <topsort-banner-slot rank="3"></topsort-banner-slot>
</topsort-banner>
```

## Predefined content mode

Instead of replacing a placeholder with Topsort-generated DOM, you can annotate your own markup with `data-ts-field` attributes and have banners.js mutate only the targeted fields in place. All other markup — classes, ARIA attributes, styles, event listeners — is left untouched. If the auction returns no winners or fails, the predefined content is shown as-is with no changes.

> **Sizing is your responsibility.** banners.js only fills in content fields and telemetry attributes — it never writes `width`, `height`, or any other style to your template elements. Set dimensions with your own CSS or HTML attributes (see examples below).

Opt in by adding the `predefined` attribute to `<topsort-banner>` (standalone) or to each `<topsort-banner-slot>` (context mode).

### Binding convention

Use `data-ts-field` to bind content keys from the auction response to element attributes or text.

#### Explicit binding (recommended)

Use `key:target` syntax to specify exactly which content key maps to which attribute:

```html
<img data-ts-field="mainImage:src" src="/fallback.jpg" />
<a data-ts-field="target:href" href="/fallback">Click</a>
<span data-ts-field="headline:textContent">Default headline</span>
```

Use `textContent` as the target to set the element's text content.

#### Multiple bindings

Comma-separate multiple `key:target` pairs to set several attributes on one element:

```html
<img data-ts-field="mainImage:src, altText:alt" src="/fallback.jpg" alt="Fallback" />
```

If the auction response only includes some keys, only matching bindings are applied — unmatched attributes keep their original values.

#### Implicit binding (legacy)

A bare key (without `:target`) infers the target from the element type:

| Element | Property set |
|---|---|
| `<a>` | `href` |
| `<img>`, `<video>`, `<source>` | `src` |
| All others | `textContent` |

`data-ts-attr="<attributeName>"` can override the default target for bare keys.

> Implicit binding still works but is deprecated. Prefer explicit `key:target` syntax for clarity and to avoid tag-based inference surprises.

#### Click tracking

Add `data-ts-clickable` to the element that should be the click-tracking surface for analytics.js. If omitted, the first child element is used.

### Single winner

```html
<topsort-banner predefined width="600" height="400" id="slot-1">
  <div class="brand-banner" data-ts-clickable>
    <a data-ts-field="target:href" href="/brands/featured" aria-label="Featured Brand">
      <img data-ts-field="mainImage:src, altText:alt" src="/fallbacks/featured.jpg"
           alt="Explore our featured brands" width="600" height="400" loading="lazy" />
    </a>
    <h2 data-ts-field="default-Headline:textContent">Featured Brand</h2>
  </div>
</topsort-banner>
```

### Multiple winners (context mode)

```html
<topsort-banner context width="600" height="400" id="slot-1">
  <topsort-banner-slot predefined rank="1">
    <div class="product-card" data-ts-clickable>
      <a data-ts-field="target:href" href="/default-1">
        <img data-ts-field="mainImage:src" src="/default-1.jpg" width="600" height="400" />
      </a>
      <h3 data-ts-field="default-Headline:textContent">Default Product 1</h3>
    </div>
  </topsort-banner-slot>
  <topsort-banner-slot predefined rank="2">
    <div class="product-card" data-ts-clickable>
      <a data-ts-field="target:href" href="/default-2">
        <img data-ts-field="mainImage:src" src="/default-2.jpg" width="600" height="400" />
      </a>
      <h3 data-ts-field="default-Headline:textContent">Default Product 2</h3>
    </div>
  </topsort-banner-slot>
</topsort-banner>
```

# Banner Attributes

| Name                   | Type             | Description                                                                 |
| ---------------------- | ---------------- | --------------------------------------------------------------------------- |
| width                  | Number           | Banner width                                                                |
| height                 | Number           | Banner height                                                               |
| id                     | String           | The slot ID for this banner                                                 |
| category-id*           | Optional String  | The category ID of the current page                                         |
| category-ids*          | Optional String  | Comma (,) separated list of category IDs, the item must match all           |
| category-disjunctions* | Optional String  | Comma (,) separated list of category IDs, the item must match any           |
| search-query           | Optional String  | The search query of the current page                                        |
| location               | Optional String  | The location for geotargeting                                               |
| new-tab                | Optional Boolean | Opens the banner's link in a new tab (defaults to false)                    |
| context                | Optional Boolean | Uses the element as a context provider to render multiple banners           |
| predefined             | Optional Boolean | Mutates annotated child elements in place instead of replacing them         |

\* Only one of `[category-id, category-ids, category-disjunctions]` must be set.
If multiple are set, only the first will be considered, in that order.

# Styling

The banner component exposes `--ts-banner-width` and `--ts-banner-height` CSS custom
properties on the `<topsort-banner>` element. These reflect the `width` and `height`
attributes set on the element and are useful for sizing child elements to match the
configured dimensions.

The inner container uses the class `ts-banner`, making it easy to target with standard
CSS selectors.

```css
/* Style the inner container */
.ts-banner {
  padding: 10px;
  border-radius: 8px;
  overflow: hidden;
}

/* Size child elements to match the configured banner dimensions */
.ts-banner img {
  width: var(--ts-banner-width);
  height: var(--ts-banner-height);
  object-fit: cover;
}
```

For responsive layouts, use standard CSS on the host element and its children rather
than trying to override the custom properties:

```css
/* Make the banner fill its container */
topsort-banner {
  display: block;
  width: 100%;
}

.ts-banner img {
  width: 100%;
  height: auto;
}
```

# Banner Slot Attributes
| Name       | Type             | Description                                                                                                           |
|------------|------------------|-----------------------------------------------------------------------------------------------------------------------|
| rank       | Number           | The ranking of the slot. Ranks should be sorted the same as the winning bids. The lower the rank, the higher the bid  |
| predefined | Optional Boolean | Mutates annotated child elements in place instead of replacing them                                                   |

# Banner Behaviors

| Function Name         | Arg type                                                                                        | Return Type   | Description                                                      |
| -------------------   | ---------------------------                                                                     | ------------- | --------------------------------------------------------         |
| `getLink`             | [Banner](#banner-interface)                                                                     | `string`      | Generates a URL from a banner response                           |
| `getLoadingElement`   |                                                                                                 | `HTMLElement` | A custom element to be shown when the banner is loading.         |
| `getErrorElement`     | [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) | `HTMLElement` | A custom element to be shown when the banner errors.             |
| `getNoWinnersElement` |                                                                                                 | `HTMLElement` | A custom element to be shown when the auction returns no banner. |
| `getBannerElement`    | [Banner](#banner-interface)                                                                     | `HTMLElement` | A custom clement to be shown when a banner is loaded.            |

# Banner Interface

| Name            | Type                                        | Description                                                                  |
| --------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `type`          | `"product" \| "vendor" \| "brand" \| "url"` | The type of the winning entity, represented by the banner.                   |
| `slotId`        | `string`                                    | The ID of the winning entity. If the entity is of type URL, this is the URL. |
| `resolvedBidId` | `string`                                    | The corresponding auction ID of the winning entity.                          |
| `asset`         | `[{ url: string; content?: Record<string, string> }]` | An array of assets. `content` is a key-value map used in predefined content mode. |

## Custom User ID (Optional)

If you want to use your own user identification system instead of the automatic opaque user ID, you can override the `getUserId` function in the `window.TS` configuration.

Your custom `getUserId` function should return the user's ID as a string. You are responsible for generating and persisting the ID (e.g., in a cookie or local storage).

```javascript
window.TS = {
  token: "<your topsort api key>",
  getUserId() {
    // Return your custom user ID
    // This will be used for both auction requests and event reporting
    return globalUserId ?? generateAndStoreUserId();
  },
};
```

This configuration needs to be set before analytics.js is loaded or imported.

# Listening to events
The banner component emits an event when the state changes. You can listen to this event to write custom logic.
The various states are `loading`, `ready`, `error`, and `nowinners`.


```javascript
document.querySelector('#my-slot-id').addEventListener('statechange', (event) => {
  console.log(event.detail); // { status: 'ready', banner: { ... } }
});
```

# Playground

Try the library instantly — no setup required — at the live demo:

**[topsort.github.io/banners.js](https://topsort.github.io/banners.js/)**

Enter your API token and a slot ID to render a real banner and copy the resulting HTML snippet.

## Running locally

```bash
git clone https://github.com/Topsort/banners.js.git
cd banners.js
pnpm install
pnpm run dev
```

You can find your API token and slot IDs at [app.topsort.com](https://app.topsort.com/).
