/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeMemoryState, resetMemoryState } from '@/lib/data-loader';

const CSV_TWO_OPEN = `date,symbol,quantity,price,broker,type,category,instrument,isFalopa,cuenta
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,false,USA
2024-01-10,AAPL,10,105,AMR,BUY,TRADE,STOCKS,false,USA`;

describe('closeTradeManually', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(CSV_TWO_OPEN);
  });

  it('cierra el trade y genera un registro', async () => {
    const { closeTradeManually, getOpenOperationsForClosing, getTrades } = await import('../trades');
    const openOps = await getOpenOperationsForClosing('AAPL', 'SELL');
    expect(openOps.length).toBe(2);

    await closeTradeManually({
      symbol: 'AAPL',
      closeDate: '2024-02-01',
      closePrice: 120,
      quantity: 10,
      broker: 'AMR',
      openOperationId: openOps[0].id,
    });

    const trades = await getTrades();
    const closedTrades = trades.filter((t: any) => t.isClosed);
    expect(closedTrades.length).toBe(1);
    expect(closedTrades[0].returnAmount).toBeCloseTo(200, 0); // (120-100)*10
  });

  it('calcula returnPercent correctamente', async () => {
    const { closeTradeManually, getOpenOperationsForClosing, getTrades } = await import('../trades');
    const openOps = await getOpenOperationsForClosing('AAPL', 'SELL');

    await closeTradeManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 120, quantity: 10,
      broker: 'AMR', openOperationId: openOps[0].id,
    });

    const trades = await getTrades();
    const closedTrades = trades.filter((t: any) => t.isClosed);
    expect(closedTrades[0].returnPercent).toBeCloseTo(20, 0); // 200/1000 = 20%
  });

  it('lanza error si openOperationId no existe', async () => {
    const { closeTradeManually } = await import('../trades');
    await expect(closeTradeManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 120, quantity: 10,
      broker: 'AMR', openOperationId: 99999,
    })).rejects.toThrow();
  });

  it('marca operación de apertura como cerrada', async () => {
    const { closeTradeManually, getOpenOperationsForClosing, getOperations } = await import('../trades');
    const openOps = await getOpenOperationsForClosing('AAPL', 'SELL');
    const targetId = openOps[0].id;

    await closeTradeManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 110, quantity: 10,
      broker: 'AMR', openOperationId: targetId,
    });

    const ops = await getOperations();
    const closedOp = ops.find((o: any) => o.id === targetId);
    expect(closedOp?.isClosed).toBe(true);
  });
});

describe('deleteOperation', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(CSV_TWO_OPEN);
  });

  it('elimina la operación del estado', async () => {
    const { deleteOperation, getOperations } = await import('../trades');
    const ops = await getOperations();
    const idToDelete = ops[0].id;

    const result = await deleteOperation(idToDelete);
    expect(result).toBe(true);

    const opsAfter = await getOperations();
    expect(opsAfter.find((o: any) => o.id === idToDelete)).toBeUndefined();
  });

  it('retorna false si el id no existe', async () => {
    const { deleteOperation } = await import('../trades');
    const result = await deleteOperation(99999);
    expect(result).toBe(false);
  });
});
