![version](https://img.shields.io/npm/v/@topsort/banners)
![downloads](https://img.shields.io/npm/dw/@topsort/banners)
![license](https://img.shields.io/github/license/Topsort/banners.js)
![GitHub Repo stars](https://img.shields.io/github/stars/topsort/banners.js?style=social)

# Topsort Banner Ad Web component

# Usage

Directly from unpkg.com

```html
<script async type="module" src="unpkg.com/@topsort/banners@0.0.1-alpha4/dist/banners.js"></script>
<script>
// Custom behavior can be configured for each site.
window.TS_BANNERS = {
  getLink(banner) {
    return `https://example.com/${banner.id}`;
  },
  getLoadingElement() {
    const el = document.createElement("div");
    el.innerText = "Loading...";
    return el;
  },
  getErrorElement() {
    const el = document.createElement("div");
    el.innerText = "Error loading banner";
    return el;
  },
}
</script>
<body>
  <topsort-banner
    topsort-api-key="<your api key>"
    width="600"
    height="400"
    slot-id="<your slot id>"
    ></topsort-banner>
</body>
```


# Banner Attributes

| Name            | Type   | Description                 |
|-----------------|--------|-----------------------------|
| topsort-api-key | String | Your Topsort API key        |
| width           | Number | Banner width                |
| height          | Number | Banner height               |
| slot-id         | String | The slot ID for this banner |


# Banner Behaviors

| Function Name       | Arg type                    | Return Type   | Description                                              |
|---------------------|-----------------------------|---------------|----------------------------------------------------------|
| `getLink`           | [Banner](#banner-interface) | `string`      | Generates a URL from a banner response                   |
| `getLoadingElement` |                             | `HTMLElement` | A custom element to be shown when the banner is loading. |
| `getErrorElement`   |                             | `HTMLElement` | A custom element to be shown when the banner errors.     |


# Banner Interface

| Name            | Type                                        | Description                                                                  |
|-----------------|---------------------------------------------|------------------------------------------------------------------------------|
| `type`          | `"product" \| "vendor" \| "brand" \| "url"` | The type of the winning entity, represented by the banner.                   |
| `id`            | `string`                                    | The ID of the winning entity. If the entity is of type URL, this is the URL. |
| `resolvedBidId` | `string`                                    | The corresponding auction ID of the winning entity.                          |
| `asset`         | `[{ url: string }]`                         | An array of url linking to the assets of the banner.                         |


# Running the example

You can play around with the provided index.html file. To run it, you'll need to
install the dependencies and start a local server.

```bash
git clone https://github.com/Topsort/banners.js.git
cd banners.js
npm install
npm run dev
```

Remember to also replace the `topsort-api-key` and `slot-id` attributes with your
own values that you can find at [Topsort](https://app.topsort.com/).
