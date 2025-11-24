![version](https://img.shields.io/npm/v/@topsort/banners)
![downloads](https://img.shields.io/npm/dw/@topsort/banners)
![license](https://img.shields.io/github/license/Topsort/banners.js)
![GitHub Repo stars](https://img.shields.io/github/stars/topsort/banners.js?style=social)

# Topsort Banner Ad Web component

# Usage

Directly from unpkg.com

```html
<script
  async
  type="module"
  src="https://unpkg.com/@topsort/banners@0.5.2/dist/banners.mjs"
></script>
<script async type="module" src="https://unpkg.com/@topsort/analytics.js"></script>
<script>
  // Set API key for auctions and events
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
<body>
  <topsort-banner width="600" height="400" id="<your slot id>"></topsort-banner>
</body>
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
| class                  | Optional String  | Custom CSS class to apply to the banner container                            |

\* Only one of `[category-id, category-ids, category-disjunctions]` must be set.
If multiple are set, only the first will be considered, in that order.

# Styling

The banner component is designed to integrate seamlessly with your existing CSS system.
Each banner is rendered inside a container div with the class `ts-banner`,
making it easy to target with CSS selectors.

## CSS Targeting

You can style banners using standard CSS selectors:

```css
/* Target all banner containers */
.ts-banner {
  padding: 10px;
  margin: 10px;
  border: 1px solid #ccc;
}

/* Target banners with specific dimensions */
.ts-banner[data-ts-width="800"] {
  max-width: 800px;
}
```

## Custom CSS Classes

You can pass custom CSS classes to the banner component using the `class` attribute:

```html
<topsort-banner width="600" height="400" id="my-slot" class="my-custom-banner"></topsort-banner>
```

The custom class will be applied alongside the `ts-banner` class, allowing you to
integrate the banner into your existing CSS system.

## Retrieving Width and Height

The width and height values are easily accessible via:

- **Data attributes**: `data-ts-width` and `data-ts-height` on the container element
- **CSS custom properties**: `--ts-banner-width` and `--ts-banner-height` on the container element

```css
/* Use data attributes in CSS */
.ts-banner[data-ts-width] {
  /* Styles for banners with width set */
}

/* Use CSS custom properties */
.ts-banner {
  width: var(--ts-banner-width, 100%);
  height: var(--ts-banner-height, auto);
}
```

# Banner Slot Attributes
| Name | Type   | Description                                                                                                           |
|------|--------|-----------------------------------------------------------------------------------------------------------------------|
| rank | Number | The ranking of the slot. Ranks should be sorted the same as the winning bids. The lower the rank, the higher the bid  |

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
| `asset`         | `[{ url: string }]`                         | An array of url linking to the assets of the banner.                         |

# Listening to events
The banner component emits an event when the state changes. You can listen to this event to write custom logic.
The various states are `loading`, `ready`, `error`, and `nowinners`.


```javascript
document.querySelector('#my-slot-id').addEventListener('statechange', (event) => {
  console.log(event.detail); // { status: 'ready', banner: { ... } }
});
```

# Running the example

You can play around with the provided index.html file. To run it, you'll need to
install the dependencies and start a local server.

```bash
git clone https://github.com/Topsort/banners.js.git
cd banners.js
pnpm install
pnpm run dev
```

Remember to add `window.TS.token` and modify the `slot-id` attribute with your
own values that you can find at [Topsort](https://app.topsort.com/).
