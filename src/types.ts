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
  asset: [{ url: string }];
}

export interface BannerContext {
  width: number;
  height: number;
  newTab: boolean;
  banners?: Banner[];
  error?: unknown;
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
