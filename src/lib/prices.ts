// Caché en memoria: evita más de 1 request por símbolo cada 5 minutos
const priceCache = new Map<string, { price: number; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getCurrentPrice(symbol: string): Promise<number | null> {
  const now = Date.now();
  const cached = priceCache.get(symbol);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 300 } as any,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice as number | undefined;
    if (!price || isNaN(price)) throw new Error('precio no disponible');

    priceCache.set(symbol, { price, fetchedAt: now });
    return price;
  } catch {
    return null;
  }
}

// Para CEDEARs argentinos: intenta con sufijo .BA si el primario falla
export async function getCurrentPriceWithFallback(symbol: string): Promise<number | null> {
  const primary = await getCurrentPrice(symbol);
  if (primary !== null) return primary;
  return getCurrentPrice(`${symbol}.BA`);
}
