/**
 * Turns an image prompt into a URL that produces the image.
 *
 * pollinations.ai needs no account and no key: the image is generated
 * lazily the first time the URL is fetched (by a browser showing a
 * preview, or by Facebook's own servers when a post publishes) and the
 * same URL keeps producing the same image after that, since the seed is
 * fixed. There is nothing to call ahead of time and nothing to store —
 * this function only builds a URL.
 *
 * Free-tier trade-offs worth knowing: anonymous requests are rate-limited
 * to roughly one every 15 seconds and may carry a small watermark. Good
 * enough to ship without a payment card; swap for a paid image API later
 * if that stops being good enough.
 */
export function buildImageUrl(prompt: string, seed: number): string {
  const params = new URLSearchParams({
    width: '1024',
    height: '1024',
    model: 'flux',
    seed: String(seed),
    nologo: 'true',
    safe: 'true',
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

/** A fresh seed for a new image, or for regenerating one the owner didn't like. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/** The image could not be produced right now — worth trying again later. */
export class ImageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUnavailableError';
  }
}

/**
 * Makes sure the image behind `url` exists before anything else needs it.
 *
 * The first request for a new URL is what makes pollinations generate the
 * image, and that takes seconds. Facebook fetches the URL itself when a
 * photo post is published, with a timeout of its own; if it gets there
 * first and gives up, it answers HTTP 400 — which the publisher rightly
 * treats as permanent, so the post would fail outright. An owner in
 * approval mode has usually previewed the photo already, so it is cached;
 * on auto-pilot nobody has, and this is the path that would break.
 *
 * Fetching it here first means Facebook's request is a cache hit. A
 * failure here throws ImageUnavailableError, which the publisher treats
 * as transient: the request that timed out has usually set generation
 * going, so the next attempt finds it ready.
 */
export async function warmImage(url: string, timeoutMs = 25_000): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ImageUnavailableError('The post image was still being generated. Will try again.');
  }

  const type = response.headers.get('content-type') ?? '';
  // Read the body so the connection completes; the bytes themselves are
  // not needed — only that the service has now produced and cached them.
  await response.arrayBuffer().catch(() => undefined);

  if (!response.ok || !type.startsWith('image/')) {
    throw new ImageUnavailableError(
      `The image service answered HTTP ${response.status} instead of an image. Will try again.`
    );
  }
}
