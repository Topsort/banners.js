/**
 * Transforms manifest URLs to iframe URLs.
 *
 * @param url - The URL to transform
 * @returns The transformed URL or null if the URL is invalid
 */
export default function getVideoAssetUrl(url: string | undefined) {
  try {
    const urlObj = new URL(url ?? "");
    const videoUrl = `${urlObj.origin}${urlObj.pathname.split("/manifest")[0]}/iframe${
      urlObj.search
    }`;
    return videoUrl;
  } catch (error) {
    return null;
  }
}
