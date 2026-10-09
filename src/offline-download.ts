// Cache.put commits only after the complete response body has been read.
export async function cacheOfflineAsset(
  cache: Pick<Cache, 'match' | 'put'>,
  url: URL,
  onBytes: (bytes: number) => void,
  idleTimeout = 60_000,
): Promise<void> {
  if (await cache.match(url.href)) return;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), idleTimeout);
  };
  resetTimer();
  try {
    const response = await fetch(url, { cache: 'reload', signal: controller.signal });
    if (!response.ok || response.status === 206 || !response.body) {
      throw new Error(`Download failed (HTTP ${response.status}): ${url.pathname}`);
    }
    const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, stream) {
        resetTimer();
        onBytes(chunk.byteLength);
        stream.enqueue(chunk);
      },
    }));
    await cache.put(url.href, new Response(body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    }));
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Download stalled. Check your connection, then retry. Completed files are saved.', { cause: error });
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Not enough browser storage. Free some device space, then retry setup.', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer!);
    controller.abort();
  }
}
