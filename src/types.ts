import type { Task } from "@lit/task";

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
  banners?: Banner[];
  error?: unknown;
}
