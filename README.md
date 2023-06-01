#[version](https://img.shields.io/npm/v/@topsort/banners)
![downloads](https://img.shields.io/npm/dw/@topsort/banners)
![license](https://img.shields.io/github/license/Topsort/banners.js)
![GitHub Repo stars](https://img.shields.io/github/stars/topsort/banners.js?style=social)

# Topsort Banner Ad Web component

# Installation

```bash
npm install @topsort/banners.js
```

# Usage

```html
<script type="module" src="node_modules/@topsort/banners/banners.js"></script>
<body>
  <topsort-banner
    topsort-api-key="<your api key>"
    width="600"
    height="400"
    slot-id="<your slot id>"
    ></topsort-banner>
</body>
```

# Attributes

| Name            | Type   | Description                 |
|-----------------|--------|-----------------------------|
| topsort-api-key | String | Your Topsort API key        |
| width           | Number | Banner width                |
| height          | Number | Banner height               |
| slot-id         | String | The slot ID for this banner |

