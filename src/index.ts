import { Task } from "@lit/task";
import { LitElement, type TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { TopsortConfigurationError, TopsortRequestError } from "./errors";
import type { Auction, Banner } from "./types";

/* Set up global environment for TS_BANNERS */

declare global {
  interface Window {
    TS_BANNERS: {
      getLink(banner: Banner): string;
      getLoadingElement(): HTMLElement;
      getErrorElement(error: unknown): HTMLElement;
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

  @property({ attribute: "new-tab", type: Boolean })
  readonly newTab?: boolean;

  private task = new Task(this, {
    task: (...args) => this.runAuction(...args),
    args: () => [],
  });

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
    // By default, hide the component while loading
    return html``;
  }

  private getErrorElement(error: unknown): TemplateResult {
    if (window.TS_BANNERS.getErrorElement) {
      const element = window.TS_BANNERS.getErrorElement(error);
      return html`${element}`;
    }
    // By default, hide the component if there is an error
    return html``;
  }

  private getNoWinnersElement(): TemplateResult {
    if (window.TS_BANNERS.getNoWinnersElement) {
      const element = window.TS_BANNERS.getNoWinnersElement();
      return html`${element}`;
    }
    // By default, hide the component if there are no winners
    return html``;
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
    const imgtag = html`<img src="${src}" alt="Topsort banner"></img>`;
    const atag = this.newTab
      ? html`<a href="${href}" target="_blank">${imgtag}</a>`
      : html`<a href="${href}">${imgtag}</a>`;
    return html`
        <div style="${style}"
             data-ts-clickable
             data-ts-resolved-bid=${banner.resolvedBidId}
             class="ts-banner">
          ${atag}
        </div>
        `;
  }

  private emitEvent(status: string) {
    const event = new CustomEvent("statechange", {
      detail: { slotId: this.slotId, status },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private buildAuction(): Auction {
    const device = getDeviceType();
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
    return auction;
  }

  private async runAuction(_: never[], { signal }: { signal: AbortSignal }): Promise<Banner[]> {
    const auction = this.buildAuction();
    console.debug("Running auction", auction);
    const device = getDeviceType();
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
      signal,
    });
    if (!res.ok) {
      const error = await res.json();
      logError(error);
      throw new Error(error.message);
    }
    const data = await res.json();
    const result = data.results[0];
    if (!result) throw new TopsortRequestError("No auction results", res.status);
    if (result.error) {
      logError(result.error);
      throw new Error(result.error);
    }
    return result.winners;
  }

  protected render() {
    if (!window.TS.token || !this.slotId) {
      return this.getErrorElement(new TopsortConfigurationError(window.TS.token, this.slotId));
    }
    return this.task.render({
      pending: () => this.getLoadingElement(),
      complete: (banners) => {
        this.emitEvent(banners.length ? "ready" : "nowinners");
        if (!banners.length) {
          return this.getNoWinnersElement();
        }
        return this.getBannerElement(banners[0]);
      },
      error: (error) => this.getErrorElement(error),
    });
  }

  // avoid shadow dom since we cannot attach to events via analytics.js
  protected createRenderRoot() {
    return this;
  }
}
