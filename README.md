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
  src="https://unpkg.com/@topsort/banners@0.3.0/dist/banners.mjs"
></script>
<script async type="module" src="https://unpkg.com/@topsort/analytics.js"></script>
<body>
  <topsort-banner width="600" height="400" id="<your html element id>" slot-id="<your slot id>"></topsort-banner>
</body>
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

  document.querySelector('<your html element id>').addEventListener('statechange', (event) => {
    console.log(event.detail.caller);
  });
</script>
```

# Banner Attributes

| Name         | Type            | Description                          |
| ------------ | --------------- | ------------------------------------ |
| width        | Number          | Banner width                         |
| height       | Number          | Banner height                        |
| id           | String          | The html element ID for this banner          |
| slot-id           | String          | The slot ID for this banner          |
| category-id  | Optional String | The category ID of the current page  |
| search-query | Optional String | The search query of the current page |
| location     | Optional String | The location for geotargeting        |

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
