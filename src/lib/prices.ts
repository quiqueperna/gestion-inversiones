// Mock utility to fetch current price. 
// In a real app, this would use a financial API.

export async function getCurrentPrice(symbol: string): Promise<number> {
  // Mock random price for demonstration
  const basePrices: Record<string, number> = {
    "NVDA": 1000,
    "AAPL": 180,
    "TSLA": 175,
    "MSFT": 420,
    "GOOGL": 150,
  };

  const base = basePrices[symbol.toUpperCase()] || 100;
  return base * (1 + (Math.random() - 0.5) * 0.02); // +/- 1% variance
}
