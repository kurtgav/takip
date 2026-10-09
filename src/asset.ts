// Build-time base path. '/' for local dev/preview and root-hosted deploys,
// '/takip/' for a GitHub Pages project site.
//
// Returns an ABSOLUTE URL (origin + base + path) on purpose: the result is handed
// to libraries that call `new URL(...)` themselves (WebLLM's model/model_lib in the
// summary worker) and a path-only value such as '/summary/qwen/resolve/main/' throws
// "Failed to construct 'URL': Invalid URL" in a worker context. Absolute URLs are
// also correct for the other consumers (service-worker registration, Tesseract,
// Transformers.js, MediaPipe, zxing-wasm) under either base.
export const assetPath = (path: string): string =>
  new URL(`${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`, self.location.origin).href;
