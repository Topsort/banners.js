import { LitElement, type TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { TopsortConfigurationError, TopsortRequestError } from "./errors";

/* Set up global environment for TS_BANNERS */

declare global {
  interface Window {
    TS_BANNERS: {
      getLink(banner: Banner): string;
      getLoadingElement(): HTMLElement;
      getErrorElement(error: Error): HTMLElement;
      getNoWinnersElement(): HTMLElement;
      getBannerElement(banner: Banner): HTMLElement;
    };
    TS: {
      readonly token: string;
      readonly url?: string;
    };
  }
}

window.TS_BANNERS = window.TS_BANNERS || {};

function logError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error(error);
  }
}

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
  banner: Banner;
}

interface Auction {
  type: "banners";
  slots: 1;
  device: "mobile" | "desktop";
  slotId: string;
  category?: {
    id?: string;
    ids?: string[];
    disjunctions?: string[][];
  };
  geoTargeting?: {
    location: string;
  };
  searchQuery?: string;
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
  @property({ type: Number })
  readonly width = 0;

  @property({ type: Number })
  readonly height = 0;

  @property({ attribute: "id", type: String })
  readonly slotId: string = "";

  @property({ attribute: "category-id", type: String })
  readonly categoryId?: string;

  @property({ attribute: "category-ids", type: String })
  readonly categoryIds?: string;

  @property({ attribute: "category-disjunctions", type: String })
  readonly categoryDisjunctions?: string;

  @property({ attribute: "search-query", type: String })
  readonly searchQuery?: string;

  @property({ attribute: "location", type: String })
  readonly location?: string;

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
    }
    return `${banner.type}/${banner.id}`;
  }

  private getLoadingElement(): TemplateResult {
    if (window.TS_BANNERS.getLoadingElement) {
      const element = window.TS_BANNERS.getLoadingElement();
      return html`${element}`;
    }
    return html`<div class="ts-banner-${this.state.status}">Loading</div>`;
  }

  private getErrorElement(error: Error): TemplateResult {
    if (window.TS_BANNERS.getErrorElement) {
      const element = window.TS_BANNERS.getErrorElement(error);
      return html`${element}`;
    }
    return html`<div class="ts-banner-${this.state.status}>
      <pre>${error.message}</pre>
    </div>`;
  }

  private getNoWinnersElement(): TemplateResult {
    if (window.TS_BANNERS.getNoWinnersElement) {
      const element = window.TS_BANNERS.getNoWinnersElement();
      return html`${element}`;
    }
    return html`<div class="ts-banner-${this.state.status}"></div>`;
  }

  private getBannerElement(banner: Banner): TemplateResult {
    if (window.TS_BANNERS.getBannerElement) {
      const element = window.TS_BANNERS.getBannerElement(banner);
      return html`${element}`;
    }
    const src = banner.asset[0].url;
    const style = css`
      img {
        width: ${this.width}px;
        height: ${this.height}px;
      }
    `;
    const href = this.getLink(banner);
    return html`
        <div style="${style}"
             data-ts-clickable
             data-ts-resolved-bid=${banner.resolvedBidId}
             class="ts-banner-${this.state.status}">
          <a href="${href}">
            <img src="${src}" alt="Topsort banner"></img>
          </a>
        </div>
        `;
  }

  private setState(state: BannerState) {
    this.state = state;
    const event = new CustomEvent("statechange", {
      detail: { state, slotId: this.slotId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private async runAuction() {
    const device = getDeviceType();
    try {
      const auction: Auction = {
        type: "banners",
        slots: 1,
        device,
        slotId: this.slotId,
      };
      if (this.categoryId) {
        auction.category = {
          id: this.categoryId,
        };
      } else if (this.categoryIds) {
        auction.category = {
          ids: this.categoryIds.split(",").map((item) => item.trim()),
        };
      } else if (this.categoryDisjunctions) {
        auction.category = {
          disjunctions: [this.categoryDisjunctions.split(",").map((item) => item.trim())],
        };
      } else if (this.searchQuery) {
        auction.searchQuery = this.searchQuery;
      }
      if (this.location) {
        auction.geoTargeting = {
          location: this.location,
        };
      }
      const token = window.TS.token;
      const url = window.TS.url || "https://api.topsort.com";
      const res = await fetch(new URL(`${url}/v2/auctions`), {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-UA": `topsort/banners-${import.meta.env.PACKAGE_VERSION} (${device}})`,
        },
        body: JSON.stringify({
          auctions: [auction],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const result = data.results[0];
        if (result) {
          if (result.error) {
            logError(result.error);
            this.setState({
              status: "errored",
              error: Error("Unknown Error"),
            });
          } else if (result.winners[0]) {
            const winner = result.winners[0];
            this.setState({
              status: "ready",
              banner: winner,
            });
          } else {
            this.setState({
              status: "nowinners",
            });
          }
        }
      } else {
        const error = await res.json();
        logError(error);
        this.setState({
          status: "errored",
          error: new TopsortRequestError(error.message, res.status),
        });
      }
    } catch (err) {
      logError(err);
      if (err instanceof Error) {
        this.setState({
          status: "errored",
          error: err,
        });
      } else {
        this.setState({
          status: "errored",
          error: Error("Unknown Error"),
        });
      }
    }
  }

  // Runs when DOM is loaded. Much like React's `getInitialProps`
  connectedCallback() {
    super.connectedCallback();
    this.runAuction();
  }

  protected render() {
    if (!window.TS.token || !this.slotId) {
      return this.getErrorElement(new TopsortConfigurationError(window.TS.token, this.slotId));
    }
    switch (this.state.status) {
      case "ready":
        return this.getBannerElement(this.state.banner);
      case "nowinners":
        return this.getNoWinnersElement();
      case "loading":
        return this.getLoadingElement();
      case "errored":
        return this.getErrorElement(this.state.error);
    }
  }

  // avoid shadow dom since we cannot attach to events via analytics.js
  protected createRenderRoot() {
    return this;
  }
}
