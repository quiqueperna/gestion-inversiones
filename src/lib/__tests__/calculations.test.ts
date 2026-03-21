import { describe, it, expect } from 'vitest';
import { calculateTradeMetrics } from '../calculations';

describe('calculateTradeMetrics', () => {
  it('calcula returnAmount positivo correctamente', () => {
    const result = calculateTradeMetrics({
      quantity: 10, openPrice: 100, closePrice: 110,
      openDate: new Date('2024-01-01'), closeDate: new Date('2024-01-11')
    });
    expect(result.entryAmount).toBe(1000);
    expect(result.exitAmount).toBe(1100);
    expect(result.returnAmount).toBe(100);
    expect(result.returnPercent).toBeCloseTo(10, 1);
    expect(result.days).toBe(10);
  });

  it('calcula returnAmount negativo (pérdida)', () => {
    const result = calculateTradeMetrics({
      quantity: 10, openPrice: 100, closePrice: 90,
      openDate: new Date('2024-01-01'), closeDate: new Date('2024-01-11')
    });
    expect(result.returnAmount).toBe(-100);
    expect(result.returnPercent).toBeCloseTo(-10, 1);
  });

  it('calcula TNA correctamente', () => {
    const result = calculateTradeMetrics({
      quantity: 10, openPrice: 100, closePrice: 110,
      openDate: new Date('2024-01-01'), closeDate: new Date('2024-01-11')
    });
    // 10% en 10 días → TNA = (10/10)*365 = 365%
    expect(result.tna).toBeCloseTo(365, 0);
  });

  it('maneja days=0 usando precio actual sin crashear', () => {
    const result = calculateTradeMetrics({
      quantity: 10, openPrice: 100, closePrice: 110,
      openDate: new Date(), closeDate: new Date()
    });
    expect(result.days).toBeGreaterThanOrEqual(1);
  });

  it('usa currentPrice como closePrice si no hay closePrice', () => {
    const result = calculateTradeMetrics({
      quantity: 10, openPrice: 100, currentPrice: 120,
      openDate: new Date('2024-01-01'), closeDate: new Date('2024-01-11')
    });
    expect(result.exitAmount).toBe(1200);
  });
});
