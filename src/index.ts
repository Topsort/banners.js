import { consume, createContext, provide } from "@lit/context";
import { Task } from "@lit/task";
import { LitElement, type TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { runAuction } from "./auction";
import { TopsortConfigurationError } from "./errors";
import { BannerComponent } from "./mixin";
import type { Auction, Banner, BannerContext } from "./types";

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

// The following methods are used to customize the appearance of the banner component.
function getLink(banner: Banner): string {
  if (window.TS_BANNERS.getLink) {
    return window.TS_BANNERS.getLink(banner);
  }
  if (banner.type === "url") {
    return banner.id;
  }
  return `${banner.type}/${banner.id}`;
}

function getLoadingElement(): TemplateResult {
  if (window.TS_BANNERS.getLoadingElement) {
    const element = window.TS_BANNERS.getLoadingElement();
    return html`${element}`;
  }
  // By default, hide the component while loading
  return html``;
}

function getErrorElement(error: unknown): TemplateResult {
  if (window.TS_BANNERS.getErrorElement) {
    const element = window.TS_BANNERS.getErrorElement(error);
    return html`${element}`;
  }
  // By default, hide the component if there is an error
  return html``;
}

function getNoWinnersElement(): TemplateResult {
  if (window.TS_BANNERS.getNoWinnersElement) {
    const element = window.TS_BANNERS.getNoWinnersElement();
    return html`${element}`;
  }
  // By default, hide the component if there are no winners
  return html``;
}

function getBannerElement(banner: Banner, width: number, height: number): TemplateResult {
  if (window.TS_BANNERS.getBannerElement) {
    const element = window.TS_BANNERS.getBannerElement(banner);
    return html`${element}`;
  }
  console.debug(banner);
  const src = banner.asset[0].url;
  const style = css`
      img {
        width: ${width}px;
        height: ${height}px;
      }
    `;
  const href = getLink(banner);
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

/**
 * A banner web component that runs an auction and renders the winning banner.
 */
@customElement("topsort-banner")
export class TopsortBanner extends BannerComponent(LitElement) {
  private task = new Task(this, {
    task: (_, options) => runAuction(this.buildAuction(), { ...options, logError }),
    args: () => [],
  });

  protected render() {
    if (!window.TS.token || !this.slotId) {
      return getErrorElement(new TopsortConfigurationError(window.TS.token, this.slotId));
    }
    return this.task.render({
      pending: () => getLoadingElement(),
      complete: (banners) => {
        this.emitEvent(banners.length ? "ready" : "nowinners");
        if (!banners.length) {
          return getNoWinnersElement();
        }
        return getBannerElement(banners[0], this.height, this.width);
      },
      error: (error) => getErrorElement(error),
    });
  }

  // avoid shadow dom since we cannot attach to events via analytics.js
  protected createRenderRoot() {
    return this;
  }
}

const bannerContext = createContext<BannerContext>(Symbol("banner-context"));
const bannerContextHasChanged = (newVal: BannerContext, oldVal?: BannerContext) => {
  if (!oldVal && newVal) {
    return true;
  }
  if (!newVal || !oldVal) {
    return false;
  }
  return (
    newVal.width !== oldVal.width ||
    newVal.height !== oldVal.height ||
    newVal.banners !== oldVal.banners ||
    newVal.error !== oldVal.error
  );
};

@customElement("topsort-banner-context")
export class TopsortBannerContext extends BannerComponent(LitElement) {
  @provide({ context: bannerContext })
  @property({
    state: true,
    attribute: false,
    hasChanged: bannerContextHasChanged,
  })
  protected context: BannerContext = {
    width: this.width,
    height: this.height,
  };

  buildAuction(): Auction {
    const auction = super.buildAuction();
    const slots = this.querySelectorAll("topsort-banner-slot").length;
    if (slots > 1) {
      auction.slots = slots;
    }
    return auction;
  }

  protected render() {
    return html`<slot></slot>`;
  }

  connectedCallback() {
    super.connectedCallback();
    const signal = new AbortController().signal;
    this.context = {
      width: this.width,
      height: this.height,
    };
    runAuction(this.buildAuction(), {
      logError,
      signal,
    })
      .then((banners) => {
        this.context = {
          width: this.width,
          height: this.height,
          banners,
        };
      })
      .catch((error) => {
        logError(error);
        this.context = {
          width: this.width,
          height: this.height,
          error,
        };
      });
  }
}

@customElement("topsort-banner-slot")
export class TopsortBannerSlot extends LitElement {
  @consume({ context: bannerContext, subscribe: true })
  @property({ attribute: false })
  public context?: BannerContext;

  @property({ attribute: "rank", type: Number })
  readonly rank = 0;

  protected render() {
    if (this.context?.error) {
      return getErrorElement(this.context.error);
    }
    if (!this.context?.banners) {
      return html``;
    }
    const banner = this.context.banners[this.rank - 1];
    if (!banner) {
      return html``;
    }
    return getBannerElement(banner, this.context.width, this.context.height);
  }

  // avoid shadow dom since we cannot attach to events via analytics.js
  protected createRenderRoot() {
    return this;
  }
}
