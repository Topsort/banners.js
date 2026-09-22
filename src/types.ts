export interface Auction {
  type: "banners";
  slots: number;
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
  opaqueUserId?: string;
}

/** The banner object returned from the auction request */
export interface Banner {
  type: "product" | "vendor" | "brand" | "url";
  id: string;
  resolvedBidId: string;
  asset: [{ url: string; content?: Record<string, string> }];
  isFallback?: boolean;
}

export interface BannerContext {
  width: number;
  height: number;
  newTab: boolean;
  language?: string;
  location?: string;
  slotId?: string;
  banners?: Banner[];
  error?: unknown;
}

/**
 * Passed to the `getLink` and `resolveLink` hooks alongside the winning
 * banner, so a merchant can make the destination URL depend on *where* the
 * banner is being rendered, not just on which banner won.
 */
export interface LinkContext {
  /**
   * The component's `location` attribute — the same value sent to the auction
   * as `geoTargeting.location`. Undefined when the attribute is not set.
   */
  location?: string;
  /** The component's `id` attribute (the auction slot id). */
  slotId?: string;
  /** The component's `language` attribute, when set. */
  language?: string;
}

export type HlsConstructor = {
  new (): {
    loadSource(src: string): void;
    attachMedia(video: HTMLVideoElement): void;
    on(event: string, callback: () => void): void;
    destroy(): void;
  };
  Events: {
    MANIFEST_PARSED: string;
    [key: string]: string;
  };
  isSupported?(): boolean;
};

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}
