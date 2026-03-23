import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInstrumentType(symbol: string): 'STOCK' | 'CEDEAR' | 'CRYPTO' {
  if (symbol.includes('BTC') || symbol.includes('ETH')) return 'CRYPTO';
  if (symbol.endsWith('D') || symbol.length > 4) return 'CEDEAR';
  return 'STOCK';
}
