import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

const getDeviceType = (): "mobile" | "desktop" => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    //return "tablet";
    return "mobile";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return "mobile";
  }
  return "desktop";
};

const getAspectRatio = (width: number, height: number): string => {
  // Calculate GCD
  let x = width;
  let y = height;
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }

  return `${width / x}:${height / x}`;
};

interface Loading {
  status: "loading";
}

interface Errored {
  status: "errored";
  error: Error;
}

interface NoWinners {
  status: "nowinners";
}

interface Ready {
  status: "ready";
  asset: [{ url: string }];
  resolvedBidId: string;
  href: string;
}

type BannerState = Loading | Errored | NoWinners | Ready;

@customElement("topsort-banner")
export class TopsortBanner extends LitElement {
  @property({ attribute: "topsort-api-key", type: String })
  apiKey: string;

  @property({ attribute: "topsort-api-url", type: String })
  apiUrl: string;

  @property({ type: Number })
  width: number;

  @property({ type: Number })
  height: number;

  @state()
  private _state: BannerState = {
    status: "loading",
  };

  async runAuction() {
    const device = getDeviceType();
    try {
      const res = await fetch(`${this.apiUrl}/api/v2/auctions`, {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "topsort/banners",
        },
        body: JSON.stringify({
          auctions: [
            {
              type: "banners",
              slots: 1,
              device,
              aspectRatio: getAspectRatio(this.width, this.height),
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results[0]) {
          if (data.results[0].error) {
            this._state = {
              status: "errored",
              error: Error("Unknown Error"),
            };
          } else if (data.results[0].winners[0]) {
            this._state = {
              status: "ready",
              asset: data.results[0].winners[0].asset,
              resolvedBidId: data.winners[0].resolvedBidId,
              href: `/products/${data.winners[0].id}`,
            };
          }
        } else {
          this._state = {
            status: "nowinners",
          };
        }
      } else {
        const error = await res.json();
        this._state = {
          status: "errored",
          error: new Error(error.message),
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        this._state = {
          status: "errored",
          error: err,
        };
      }
    }
  }

  async handleClick() {
    // TODO: Handle click events on this banner using a queue in localstorage
    if (this._state.status === "ready") {
      // Only handle clicks on a ready banner
    }
  }

  // Runs when DOM is loaded. Much like React's `getInitialProps`
  connectedCallback() {
    super.connectedCallback();
    this.runAuction();
  }

  render() {
    switch (this._state.status) {
      case "ready":
        //const srcset = this._state.asset.join(", ");
        const src = this._state.asset[0].url;
        const style = css`
          img {
            max-width: 100%;
            height: auto;
          }
        `;
        return html`
        <div style="${style}">
          <a href="${this._state.href}">
            <img src="${src}"></img>
          </a>
        </div>
      `;
      case "loading":
        return html`<marquee>Loading</marquee>`;
      case "errored":
        return html`<pre>${this._state.error.message}</pre>`;
    }
  }
}
