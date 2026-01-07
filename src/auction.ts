import { TopsortRequestError } from "./errors";
import type { Auction, Banner } from "./types";
import { getOpaqueUserId } from "./user-id";

export const getDeviceType = (): "mobile" | "desktop" => {
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

interface AuctionOptions {
  signal: AbortSignal;
  logError: (error: unknown) => void;
}

export async function runAuction(
  auction: Auction,
  { signal, logError }: AuctionOptions,
): Promise<Banner[]> {
  const device = getDeviceType();
  const token = window.TS.token;
  const url = window.TS.url || "https://api.topsort.com";

  const opaqueUserId = getOpaqueUserId();
  if (opaqueUserId) {
    auction.opaqueUserId = opaqueUserId;
  }

  const res = await fetch(new URL(`${url}/v2/auctions`), {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-UA": `topsort/banners-${import.meta.env.PACKAGE_VERSION} (${device})`,
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
