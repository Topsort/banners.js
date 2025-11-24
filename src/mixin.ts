import type { LitElement } from "lit";
import { property } from "lit/decorators.js";
import { getDeviceType } from "./auction";
import type { Auction } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: We need to use `any` here
type Constructor<T> = new (...args: any[]) => T;

export declare class BannerComponentInterface {
  slotId: string;
  width: number;
  height: number;
  categoryId?: string;
  categoryIds?: string;
  categoryDisjunctions?: string;
  searchQuery?: string;
  location?: string;
  newTab: boolean;
  bannerClass?: string;

  emitEvent(status: string): void;
  buildAuction(slots: number): Auction;
}

export const BannerComponent = <T extends Constructor<LitElement>>(Base: T) => {
  class BannerComponent extends Base {
    @property({ type: Number })
    readonly width: number = 0;

    @property({ type: Number })
    readonly height: number = 0;

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
    readonly newTab: boolean = false;

    @property({ attribute: "class", type: String })
    readonly bannerClass?: string;

    buildAuction(slots: number): Auction {
      const device = getDeviceType();
      const auction: Auction = {
        type: "banners",
        slots: slots,
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

    emitEvent(status: string) {
      const event = new CustomEvent("statechange", {
        detail: { slotId: this.slotId, status },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }
  return BannerComponent as Constructor<BannerComponentInterface> & T;
};
