import { consume, createContext, provide } from "@lit/context";
import { Task } from "@lit/task";
import { html, LitElement, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { runAuction } from "./auction";
import { TopsortConfigurationError } from "./errors";
import { BannerComponent } from "./mixin";
import type { Banner, BannerContext, HlsConstructor } from "./types";

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

function getBannerElement(banner: Banner, newTab: boolean): TemplateResult {
  if (window.TS_BANNERS.getBannerElement) {
    const element = window.TS_BANNERS.getBannerElement(banner);
    return html`${element}`;
  }

  if (!banner.asset?.[0]?.url) {
    logError(new Error("Invalid banner asset: missing URL"));
    return html``;
  }
  const src = banner.asset[0].url;

  const isVideo = (() => {
    try {
      const url = new URL(src);
      const parts = url.pathname.split("/");
      const manifestIndex = parts.indexOf("manifest");
      if (manifestIndex >= 0) {
        const nextSegment = parts[manifestIndex + 1];
        return nextSegment?.startsWith("video") ?? false;
      }
      return false;
    } catch {
      return false;
    }
  })();
  const media = isVideo
    ? html`
        <hls-video
          src="${src}"
          style="width: var(--ts-banner-width, 100%); height: var(--ts-banner-height, 100%); object-fit: cover;"
        ></hls-video>
      `
    : html`
        <img
          src="${src}"
          alt="Topsort banner"
          style="width: var(--ts-banner-width, 100%); height: var(--ts-banner-height, 100%);"
        />
      `;

  const href = getLink(banner);
  const wrappedMedia = newTab
    ? html`<a href="${href}" target="_blank">${media}</a>`
    : html`<a href="${href}">${media}</a>`;
  return html`
    <div
      data-ts-clickable
      data-ts-resolved-bid=${banner.resolvedBidId}
      style={display: block; padding: var(--ts-banner-padding, 0); margin: var(--ts-banner-margin, 0);}
    >
      ${wrappedMedia}
    </div>
  `;
}

const bannerContext = createContext<BannerContext>(Symbol("banner-context"));
const bannerContextHasChanged = (newVal: BannerContext, oldVal?: BannerContext) => {
  if (!oldVal && newVal) {
    return true;
  }
  if (newVal == null || oldVal == null) {
    return false;
  }
  return (
    newVal.width !== oldVal.width ||
    newVal.height !== oldVal.height ||
    newVal.newTab !== oldVal.newTab ||
    !!newVal.error !== !!oldVal.error ||
    newVal.banners?.length !== oldVal.banners?.length
  );
};

/**
 * A banner web component that runs an auction and renders the winning banner.
 */
@customElement("topsort-banner")
export class TopsortBanner extends BannerComponent(LitElement) {
  private task = new Task(this, {
    task: ([slots], options) =>
      runAuction(this.buildAuction(slots), { ...options, logError })
        .then((winners) => {
          options.signal.throwIfAborted();
          if (this.isContext) {
            this.context = { ...this.context, banners: winners };
          }
          return winners;
        })
        .catch((error) => {
          options.signal.throwIfAborted();
          if (this.isContext) {
            this.context = { ...this.context, error };
          }
          throw error;
        }),
    args: () => [this.slots?.length || 1],
  });

  @provide({ context: bannerContext })
  @property({ attribute: false, hasChanged: bannerContextHasChanged })
  private context: BannerContext = {
    width: this.width,
    height: this.height,
    newTab: this.newTab,
  };

  @property({ type: Boolean, attribute: "context" })
  readonly isContext: boolean = false;

  @property({ attribute: false, state: true })
  private slots?: NodeListOf<Element>;

  protected render() {
    if (!window.TS.token || !this.slotId) {
      return getErrorElement(new TopsortConfigurationError(window.TS.token, this.slotId));
    }
    if (this.isContext) {
      return html``;
    }
    return this.task.render({
      pending: () => getLoadingElement(),
      complete: (banners) => {
        this.emitEvent(banners.length ? "ready" : "nowinners");
        if (!banners.length) {
          return getNoWinnersElement();
        }
        return getBannerElement(banners[0], this.newTab);
      },
      error: (error) => getErrorElement(error),
    });
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);

    if (this.isContext && !changedProperties.has("slots")) {
      Promise.resolve().then(() => {
        this.slots = this.renderRoot.querySelectorAll("topsort-banner-slot");
      });
    }

    if (
      changedProperties.has("width") ||
      changedProperties.has("height") ||
      changedProperties.has("newTab")
    ) {
      Promise.resolve().then(() => {
        this.context = {
          width: this.width,
          height: this.height,
          newTab: this.newTab,
        };
      });
    }
  }

  // avoid shadow dom since we cannot attach to events via analytics.js
  protected createRenderRoot() {
    return this;
  }
}

@customElement("topsort-banner-slot")
export class TopsortBannerSlot extends LitElement {
  @consume({ context: bannerContext, subscribe: true })
  @property({ attribute: false })
  readonly context?: BannerContext;

  @property({ attribute: "rank", type: Number })
  readonly rank = 0;

  protected render() {
    if (!this.context) {
      return html``;
    }
    if (!this.context.banners) {
      return getLoadingElement();
    }
    if (this.context.error) {
      return getErrorElement(this.context.error);
    }
    if (!this.context.banners.length || this.context.banners.length < this.rank) {
      return getNoWinnersElement();
    }
    return getBannerElement(this.context.banners[this.rank - 1], this.context.newTab);
  }

  // avoid shadow dom since we cannot attach to events via analytics.js
  protected createRenderRoot() {
    return this;
  }
}

@customElement("hls-video")
export class HlsVideo extends LitElement {
  @property({ type: String }) src = ""; // HLS manifest URL
  @property({ type: String }) width = "800px";
  @property({ type: String }) height = "400px";

  private get videoId() {
    try {
      return new URL(this.src).pathname.split("/")[1]; // safer and clearer
    } catch {
      return "hls-video";
    }
  }

  render() {
    return html`
      <video
        id="${this.videoId}"
        muted
        autoplay
        loop
        playsinline
      ></video>
    `;
  }

  async firstUpdated() {
    const video = this.shadowRoot?.getElementById(this.videoId) as HTMLVideoElement;
    if (!video) return;

    video.style.width = this.width;
    video.style.height = this.height;
    video.style.objectFit = "cover";

    let Hls: HlsConstructor;
    try {
      Hls = await hlsDependency.load();
    } catch (err) {
      console.error("Failed to load HLS.js:", err);
      return;
    }

    if (!Hls) {
      console.error("HLS.js not available after load");
      return;
    }

    const hls = new Hls();
    hls.loadSource(this.src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch((err) => console.warn("Autoplay failed:", err));
    });
  }
}

class HlsDependency {
  private loadPromise: Promise<HlsConstructor> | null = null;

  load(): Promise<HlsConstructor> {
    // Return existing promise if already loading/loaded
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Check if already loaded
    if (window.Hls) {
      this.loadPromise = Promise.resolve(window.Hls);
      return this.loadPromise;
    }

    // Inject the script and wait for it to load
    this.loadPromise = new Promise<HlsConstructor>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";
      script.onload = () => {
        if (window.Hls) {
          resolve(window.Hls);
        } else {
          reject(new Error("HLS.js loaded but not available"));
        }
      };
      script.onerror = () => {
        reject(new Error("Failed to load HLS.js"));
      };
      document.head.appendChild(script);
    }).catch((err) => {
      // Reset cached promise so future calls can retry
      this.loadPromise = null;
      throw err;
    });

    return this.loadPromise;
  }
}

// Create a singleton instance
const hlsDependency = new HlsDependency();
