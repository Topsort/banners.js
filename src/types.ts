export interface NoWinners {
  status: "nowinners";
}

export interface Ready {
  status: "ready";
  banners: Banner[];
}

export interface Auction {
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

export type BannerState = NoWinners | Ready;
