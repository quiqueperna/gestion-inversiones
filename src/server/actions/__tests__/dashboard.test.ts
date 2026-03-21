/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeMemoryState, resetMemoryState } from '@/lib/data-loader';

// CSV con 4 pares cerrados + 2 posiciones abiertas — resultados predecibles
const MINI_CSV = `date,symbol,quantity,price,broker,type,category,instrument,isFalopa
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,false
2024-01-15,AAPL,-10,110,AMR,SELL,TRADE,STOCKS,false
2024-02-01,TSLA,5,200,IOL,BUY,TRADE,STOCKS,false
2024-02-20,TSLA,-5,180,IOL,SELL,TRADE,STOCKS,false
2024-03-01,NVDA,2,400,AMR,BUY,TRADE,STOCKS,false
2024-03-30,NVDA,-2,500,AMR,SELL,TRADE,STOCKS,false
2024-04-01,MSFT,10,300,IOL,BUY,TRADE,STOCKS,false
2024-04-25,MSFT,-10,330,IOL,SELL,TRADE,STOCKS,false
2024-05-01,AAPL,20,150,AMR,BUY,TRADE,STOCKS,false
2024-05-01,TSLA,8,220,IOL,BUY,TRADE,STOCKS,false`;

describe('getStats', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(MINI_CSV);
  });

  it('retorna stats vacías si no hay trades en el período', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2020-01-01'), new Date('2020-12-31'));
    expect(result.totalTrades).toBe(0);
    expect(result.netProfit).toBe(0);
    expect(result.payoffRatio).toBe(0);
  });

  it('cuenta correctamente win rate', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2024-01-01'), new Date('2024-12-31'));
    // AAPL +100, TSLA -100, NVDA +200, MSFT +300 → 3 wins de 4
    expect(result.totalTrades).toBe(4);
    expect(result.winRate).toBeCloseTo(75, 0);
  });

  it('calcula netProfit correctamente', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2024-01-01'), new Date('2024-12-31'));
    // (110-100)*10=100, (180-200)*5=-100, (500-400)*2=200, (330-300)*10=300 → 500
    expect(result.netProfit).toBeCloseTo(500, 0);
  });

  it('payoffRatio está definido y es número', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2024-01-01'), new Date('2024-12-31'));
    expect(result.payoffRatio).toBeDefined();
    expect(typeof result.payoffRatio).toBe('number');
  });
});

describe('getDashboardSummary', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(MINI_CSV);
  });

  it('detecta operaciones abiertas', async () => {
    const { getDashboardSummary } = await import('../dashboard');
    const result = await getDashboardSummary();
    expect(result.openOperations).toBeGreaterThan(0);
  });

  it('totalTrades coincide con pares FIFO cerrados', async () => {
    const { getDashboardSummary } = await import('../dashboard');
    const result = await getDashboardSummary();
    expect(result.totalTrades).toBe(4);
  });

  it('positiveTrades + negativeTrades === totalTrades', async () => {
    const { getDashboardSummary } = await import('../dashboard');
    const result = await getDashboardSummary();
    expect(result.positiveTrades + result.negativeTrades).toBe(result.totalTrades);
  });
});

describe('getTopStats', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(MINI_CSV);
  });

  it('top5Trades tiene máximo 5 elementos', async () => {
    const { getTopStats } = await import('../dashboard');
    const result = await getTopStats();
    expect(result?.top5Trades.length).toBeLessThanOrEqual(5);
  });

  it('top5Trades ordenado por returnAmount desc', async () => {
    const { getTopStats } = await import('../dashboard');
    const result = await getTopStats();
    const amounts = result?.top5Trades.map((t: any) => t.returnAmount) ?? [];
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i]);
    }
  });

  it('bestMonth tiene month y total definidos', async () => {
    const { getTopStats } = await import('../dashboard');
    const result = await getTopStats();
    expect(result?.bestMonth?.month).toBeDefined();
    expect(typeof result?.bestMonth?.total).toBe('number');
  });
});
