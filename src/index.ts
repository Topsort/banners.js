import { LitElement, TemplateResult, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { TopsortRequestError, TopsortConfigurationError } from "./errors";

/* Set up global environment for TS_BANNERS */

declare global {
  interface Window {
    TS_BANNERS: {
      getLink(banner: Banner): string;
      getLoadingElement(): HTMLElement;
      getErrorElement(error: Error): HTMLElement;
    };
  }
}

window.TS_BANNERS = window.TS_BANNERS || {};

const getDeviceType = (): "mobile" | "desktop" => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    //return "tablet";
    return "mobile";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
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

/** The banner object returned from the auction request */
export interface Banner {
  type: "product" | "vendor" | "brand" | "url";
  id: string;
  resolvedBidId: string;
  asset: [{ url: string }];
}

type BannerState = Loading | Errored | NoWinners | Ready;

/**
 * A banner web component that runs an auction and renders the winning banner.
 */
@customElement("topsort-banner")
export class TopsortBanner extends LitElement {
  @property({ attribute: "topsort-api-key", type: String })
  readonly apiKey?: string;

  @property({ type: Number })
  readonly width = 0;

  @property({ type: Number })
  readonly height = 0;

  @property({ attribute: "slot-id", type: String })
  readonly slotId?: string;

  @state()
  private state: BannerState = {
    status: "loading",
  };

  private getLink(banner: Banner): string {
    if (window.TS_BANNERS.getLink) {
      return window.TS_BANNERS.getLink(banner);
    }
    if (banner.type === "url") {
      return banner.id;
    } else {
      return `${banner.type}/${banner.id}`;
    }
  }

  private getLoadingElement(): TemplateResult {
    if (window.TS_BANNERS.getLoadingElement) {
      const element = window.TS_BANNERS.getLoadingElement();
      return html`${element}`;
    }
    return html`<div>Loading</div>`;
  }

  private getErrorElement(error: Error): TemplateResult {
    if (window.TS_BANNERS.getErrorElement) {
      const element = window.TS_BANNERS.getErrorElement(error);
      return html`${element}`;
    }
    return html`<pre>${error.message}</pre>`;
  }

  private async runAuction() {
    const device = getDeviceType();
    try {
      const res = await fetch("https://api.topsort.com/v2/auctions", {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `topsort/banners-${import.meta.env.PACKAGE_VERSION} (${device}})`,
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
            this.state = {
              status: "errored",
              error: Error("Unknown Error"),
            };
          } else if (data.results[0].winners[0]) {
            this.state = {
              status: "ready",
              asset: data.results[0].winners[0].asset,
              resolvedBidId: data.winners[0].resolvedBidId,
              href: this.getLink(data.winners[0]),
            };
          }
        } else {
          this.state = {
            status: "nowinners",
          };
        }
      } else {
        const error = await res.json();
        this.state = {
          status: "errored",
          error: new TopsortRequestError(error.message, res.status),
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        this.state = {
          status: "errored",
          error: err,
        };
      } else {
        this.state = {
          status: "errored",
          error: Error("Unknown Error"),
        };
      }
    }
  }

  // Runs when DOM is loaded. Much like React's `getInitialProps`
  connectedCallback() {
    super.connectedCallback();
    this.runAuction();
  }

  protected render() {
    if (!this.apiKey || !this.slotId) {
      return this.getErrorElement(new TopsortConfigurationError(this.apiKey, this.slotId));
    }
    switch (this.state.status) {
      case "ready": {
        const src = this.state.asset[0].url;
        const style = css`
          img {
            width: ${this.width}px;
            height: ${this.height}px;
          }
        `;
        return html`
        <div style="${style}" data-ts-clickable data-ts-resolved-bid-id=${this.state.resolvedBidId}>
          <a href="${this.state.href}">
            <img src="${src}" alt="Topsort banner"></img>
          </a>
        </div>
        `;
      }
      case "loading":
        return this.getLoadingElement();
      case "errored":
        return this.getErrorElement(this.state.error);
    }
  }
}
