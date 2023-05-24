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

function getLink(banner: any) {
  if (banner.type === "url") {
    return banner.id;
  } else {
    return `${banner.type}/${banner.id}`;
  }
}

@customElement("topsort-banner")
export class TopsortBanner extends LitElement {
  @property({ attribute: "topsort-api-key", type: String })
  readonly apiKey?: string;

  @property({ attribute: "topsort-api-url", type: String })
  readonly apiUrl?: string;

  @property({ type: Number })
  readonly width = 0;

  @property({ type: Number })
  readonly height = 0;

  @property({ type: String })
  readonly slotId?: string;

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
          "User-Agent": "topsort/banners 1.0.0",
        },
        body: JSON.stringify({
          auctions: [
            {
              type: "banners",
              slots: 1,
              device,
              slotId: this.slotId,
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
              href: getLink(data.winners[0]),
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

  // Runs when DOM is loaded. Much like React's `getInitialProps`
  connectedCallback() {
    super.connectedCallback();
    this.runAuction();
  }

  render() {
    switch (this._state.status) {
      case "ready": {
        //const srcset = this._state.asset.join(", ");
        const src = this._state.asset[0].url;
        const style = css`
          img {
            width: ${this.width}px;
            height: ${this.height}px;
          }
        `;
        return html`
        <div style="${style}" data-ts-resolved-bid-id=${this._state.resolvedBidId}>
          <a href="${this._state.href}">
            <img src="${src}"></img>
          </a>
        </div>
        `;
      }
      case "loading":
        return html`<marquee>Loading</marquee>`;
      case "errored":
        return html`<pre>${this._state.error.message}</pre>`;
    }
  }
}
