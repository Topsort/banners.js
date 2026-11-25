[![CI](https://github.com/Topsort/banners.js/actions/workflows/test.yml/badge.svg)](https://github.com/Topsort/banners.js/actions/workflows/test.yml)
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
  // Set window.TS before either script loads. Load analytics.js synchronously
  // (no async) before banners.js: banners.js reads window.TS.token and
  // window.TS.getUserId when it runs the auction. If analytics.js has not run
  // yet, banners.js uses (or creates) the analytics.js user ID cookie instead.
  // Requires @topsort/analytics.js 2.9.0 or later.
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
<script src="https://unpkg.com/@topsort/analytics.js@2/dist/ts.iife.js"></script>
<script
  type="module"
  src="https://unpkg.com/@topsort/banners@0.12/dist/banners.mjs"
></script>
<body>
  <topsort-banner width="600" height="400" id="<your slot id>"></topsort-banner>
</body>
```

## Legacy Systems (IIFE Bundle)

For environments that don't support ES modules (e.g., Magento), use the IIFE bundle. Keep the
same order: set `window.TS`, then load analytics.js, then banners.js, all without `async`:

```html
<script src="https://unpkg.com/@topsort/analytics.js@2/dist/ts.iife.js"></script>
<script src="https://unpkg.com/@topsort/banners@0.12/dist/banners.iife.js"></script>
```

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

The target attribute **must already exist** on the element — banners.js only overwrites existing attributes, never creates them. If a binding targets an attribute that doesn't exist, it is skipped and a warning is logged. This catches typos and ensures your template always has fallback values for graceful degradation when the auction fails or returns no winners.

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
| language               | Optional String  | Locale (e.g. `en-GB`, `pt_BR`) used to pick translated content fields in predefined mode. See [the translations guide](docs/translations-guide.md) |
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
| `getLink`             | [Banner](#banner-interface), [LinkContext](#linkcontext-interface)                              | `string`      | Generates a URL from a banner response. **Standard mode only.**   |
| `resolveLink`     | `href: string`, [Banner](#banner-interface), [LinkContext](#linkcontext-interface)              | `string`      | Transforms a URL coming from the auction response. **Predefined mode only.** |
| `resolveAssetUrl` | `src: string`, [Banner](#banner-interface), [LinkContext](#linkcontext-interface)               | `string`      | Transforms a creative URL (image, video, poster) before it is written. Standard and predefined mode. |
| `getLoadingElement`   |                                                                                                 | `HTMLElement` | A custom element to be shown when the banner is loading.         |
| `getErrorElement`     | [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) | `HTMLElement` | A custom element to be shown when the banner errors.             |
| `getNoWinnersElement` |                                                                                                 | `HTMLElement` | A custom element to be shown when the auction returns no banner. |
| `getBannerElement`    | [Banner](#banner-interface)                                                                     | `HTMLElement` | A custom element to be shown when a banner is loaded. It must carry `data-ts-resolved-bid="<banner.resolvedBidId>"` (omit it when `isFallback` is true), otherwise impressions and clicks are not tracked. Add `data-ts-clickable` to a descendant to narrow the click surface; without it, the whole element is clickable. |

# Banner Interface

| Name            | Type                                        | Description                                                                  |
| --------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `type`          | `"product" \| "vendor" \| "brand" \| "url"` | The type of the winning entity, represented by the banner.                   |
| `id`            | `string`                                    | The ID of the winning entity. If the entity is of type URL, this is the URL. |
| `isFallback`    | `boolean` (optional)                        | `true` for a fallback banner. Fallback banners are not tracked.              |
| `resolvedBidId` | `string`                                    | The corresponding auction ID of the winning entity.                          |
| `asset`         | `[{ url: string; content?: Record<string, string> }]` | An array of assets. `content` is a key-value map used in predefined content mode. |

# LinkContext Interface

Passed to both link hooks. It describes **where** the banner is rendering, so
the destination URL can depend on the page context and not only on the winner.

| Name       | Type                  | Description                                                                                                                                         |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `location` | `string \| undefined` | The component's `location` attribute — the same value sent to the auction as `geoTargeting.location`.                                                |
| `slotId`   | `string \| undefined` | The component's `id` attribute (the auction slot id).                                                                                                |
| `language` | `string \| undefined` | The component's `language` attribute, when set.                                                                                                      |

### Making links location-aware

On a site where the same catalogue is served under several store or region
paths, the URL an advertiser enters in a campaign cannot carry the store — one
campaign covers every store. Use `location` to put it back before the link is
written:

```javascript
// Each banner tag already carries the location it renders in:
//   <topsort-banner id="whats-trending" location="store-north" predefined>
const STORE_BY_LOCATION = { "store-north": "102", "store-south": "64" };

function withStore(url, location) {
  const store = STORE_BY_LOCATION[location ?? ""];
  return !store || !url.startsWith("/") ? url : `/${store}${url}`;
}

window.TS_BANNERS = {
  // Predefined mode: transform the URL the campaign supplied.
  resolveLink(href, banner, context) {
    return withStore(href, context.location);
  },
  // Standard mode: generate the URL yourself.
  getLink(banner, context) {
    const url = banner.type === "url" ? banner.id : `${banner.type}/${banner.id}`;
    return withStore(url, context.location);
  },
};
```

The two hooks are deliberately separate. `getLink` *generates* a link from a
winner; `resolveLink` *transforms* one the campaign already supplied. If
predefined mode reused `getLink`, every merchant who had written one for
standard mode would suddenly see it override their campaign URLs.

Both run **before** the URL reaches the DOM, so the shopper never sees or clicks
the unresolved link. If `resolveLink` throws, the original URL is written and
a warning is logged — a broken hook degrades to the previous behaviour rather
than breaking the banner.

### Serving creatives from your own domain

Creative URLs in the auction response point to Topsort's asset host
(`https://topsortassets.com/...`). To load them through your own CDN or proxy,
for example on a domain licensed for a specific country, rewrite the host with
`resolveAssetUrl`:

```javascript
window.TS_BANNERS = {
  resolveAssetUrl(src, banner, context) {
    return src.replace("https://topsortassets.com/", "https://assets.example.cn/");
  },
};
```

It runs for the default banner image or video in standard mode, and in
predefined mode for every binding that resolves to `src`, `srcset` or `poster`.
It receives the same `LinkContext` as the link hooks. Keep the path and query
string unchanged: the query string selects the image crop. Your CDN should pull
from `https://topsortassets.com` with that `Host` header, include the query
string in its cache key, and either include `Accept` in its cache key or not
forward it, since the image format (AVIF, WebP or original) is chosen from
`Accept`. If `resolveAssetUrl` throws, the original URL is written and a
warning is logged.

## Third-party impression tracking

A campaign can carry an impression tracker from another ad server, such as a
Google Campaign Manager pixel, by setting `impressionPixelUrl` in the
creative's template content. No change is needed on the page.

banners.js requests the URL once, when `@topsort/analytics.js` reports the
Topsort impression for that banner (at least 50% in view, painted, for one
second). It does not fire when the auction resolves, so a banner that is never
seen is never counted. `[timestamp]` and `%%CACHEBUSTER%%` in the URL are
replaced with a random value so the browser does not serve it from cache.

The request is made with `new Image()` and is never inserted into the page: it
shows up in the Network panel but not in the DOM, and cannot affect layout.
Fallback banners never fire it, and neither does an `analytics.js` without
visibility-gated impressions.

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

If this runs before analytics.js loads (e.g. in an inline `<script>` tag), object assignment (`window.TS = { ... }`) is fine, and it is the recommended order: set `window.TS`, then load analytics.js, then banners.js. A custom `getUserId` must be defined before banners.js runs its first auction.

When `window.TS.getUserId` is not defined yet (for example, analytics.js loads with `async` or through a tag manager and has not run), banners.js reads the analytics.js user ID cookie (`tsuid`, or `window.TS.cookieName` if set) and creates it if it does not exist. analytics.js adopts that cookie when it loads, so the auction and the user's events share the same `opaqueUserId`. If you need to set or change the token **after** analytics.js has already loaded, use property assignment (`window.TS.token = '...'`) so the internal setter can flush queued events.

# Listening to events
The banner component emits a `statechange` event when the auction resolves. You can listen to this event to write custom logic.
The possible statuses are `ready`, `error`, and `nowinners`.

`ready` means the auction returned at least one winner (in context mode, a winner for that slot's `rank`). It does not mean the banner was shown or that an impression was counted: analytics.js reports the impression once the banner is at least 50% in view, painted, for one second.

### Single and predefined mode

```javascript
document.querySelector('#my-slot-id').addEventListener('statechange', (event) => {
  console.log(event.detail); // { slotId: 'my-slot-id', status: 'ready' }
});
```

### Context mode

In context mode, the parent `<topsort-banner context>` emits no `statechange`; each `<topsort-banner-slot>` emits its own `statechange` event with the slot's `rank` in the detail:

```javascript
document.addEventListener('statechange', (event) => {
  console.log(event.detail); // { rank: 1, status: 'ready' }
}, true);
```

### Customizing links in predefined mode

In predefined mode, `data-ts-field="target:href"` sets the link from the auction
response. To transform that URL, override
[`window.TS_BANNERS.resolveLink`](#making-links-location-aware) — it is
called for every binding that writes an `href`, with the incoming URL as its
first argument.

Post-processing links with the `statechange` event still works, but prefer
`resolveLink`: `statechange` fires *after* the href is already in the DOM, so
the shopper can click the unresolved link in the window before your handler
runs.

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
