/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeMemoryState, resetMemoryState } from '@/lib/data-loader';

const CSV_TWO_OPEN = `date,symbol,quantity,price,broker,type,category,instrument,cuenta
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,USA
2024-01-10,AAPL,10,105,AMR,BUY,TRADE,STOCKS,USA`;

describe('closeTradeUnitManually', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(CSV_TWO_OPEN);
  });

  it('cierra el trade unit y genera un registro', async () => {
    const { closeTradeUnitManually, getOpenExecutionsForClosing, getTradeUnits } = await import('../trades');
    const openExecs = await getOpenExecutionsForClosing('AAPL', 'SELL', 'USA', 'AMR');
    expect(openExecs.length).toBe(2);

    await closeTradeUnitManually({
      symbol: 'AAPL',
      closeDate: '2024-02-01',
      closePrice: 120,
      quantity: 10,
      broker: 'AMR',
      account: 'USA',
      entryExecId: openExecs[0].id,
    });

    const tradeUnits = await getTradeUnits();
    const closedTUs = tradeUnits.filter((t: any) => t.status === 'CLOSED');
    expect(closedTUs.length).toBe(1);
    expect(closedTUs[0].pnlNominal).toBeCloseTo(200, 0); // (120-100)*10
  });

  it('calcula pnlPercent correctamente', async () => {
    const { closeTradeUnitManually, getOpenExecutionsForClosing, getTradeUnits } = await import('../trades');
    const openExecs = await getOpenExecutionsForClosing('AAPL', 'SELL', 'USA', 'AMR');

    await closeTradeUnitManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 120, quantity: 10,
      broker: 'AMR', account: 'USA', entryExecId: openExecs[0].id,
    });

    const tradeUnits = await getTradeUnits();
    const closedTUs = tradeUnits.filter((t: any) => t.status === 'CLOSED');
    expect(closedTUs[0].pnlPercent).toBeCloseTo(20, 0); // 200/1000 = 20%
  });

  it('lanza error si entryExecId no existe', async () => {
    const { closeTradeUnitManually } = await import('../trades');
    await expect(closeTradeUnitManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 120, quantity: 10,
      broker: 'AMR', account: 'USA', entryExecId: 99999,
    })).rejects.toThrow();
  });

  it('marca ejecución de apertura como cerrada', async () => {
    const { closeTradeUnitManually, getOpenExecutionsForClosing, getExecutions } = await import('../trades');
    const openExecs = await getOpenExecutionsForClosing('AAPL', 'SELL', 'USA', 'AMR');
    const targetId = openExecs[0].id;

    await closeTradeUnitManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 110, quantity: 10,
      broker: 'AMR', account: 'USA', entryExecId: targetId,
    });

    const execs = await getExecutions();
    const closedExec = execs.find((o: any) => o.id === targetId);
    expect(closedExec?.isClosed).toBe(true);
  });
});

describe('deleteExecution', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(CSV_TWO_OPEN);
  });

  it('elimina la ejecución del estado', async () => {
    const { deleteExecution, getExecutions } = await import('../trades');
    const execs = await getExecutions();
    const idToDelete = execs[0].id;

    const result = await deleteExecution(idToDelete);
    expect(result).toBe(true);

    const execsAfter = await getExecutions();
    expect(execsAfter.find((o: any) => o.id === idToDelete)).toBeUndefined();
  });

  it('retorna false si el id no existe', async () => {
    const { deleteExecution } = await import('../trades');
    const result = await deleteExecution(99999);
    expect(result).toBe(false);
  });
});

describe('closeTradeUnitWithQuantity', () => {
  const CSV_OPEN_AAPL = `date,symbol,quantity,price,broker,type,category,instrument,cuenta
2024-01-01,AAPL,20,100,AMR,BUY,TRADE,STOCKS,USA`;

  it('cierre exacto: qty === trade qty', async () => {
    resetMemoryState();
    initializeMemoryState(CSV_OPEN_AAPL);
    const { closeTradeUnitWithQuantity, getTradeUnits, getExecutions } = await import('../trades');
    const execs = await getExecutions();
    const openExec = execs.find((e: any) => e.side === 'BUY' && !e.isClosed);
    expect(openExec).toBeDefined();

    await closeTradeUnitWithQuantity({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 110, totalQty: 20,
      broker: 'AMR', account: 'USA',
      primaryEntryExecId: openExec!.id,
    });

    const tus = await getTradeUnits();
    const closed = tus.filter((t: any) => t.status === 'CLOSED');
    expect(closed.length).toBe(1);
    expect(closed[0].pnlNominal).toBeCloseTo(200, 0); // (110-100)*20
  });

  it('cierre parcial: qty < trade qty — crea nueva exec con remainder', async () => {
    resetMemoryState();
    initializeMemoryState(CSV_OPEN_AAPL);
    const { closeTradeUnitWithQuantity, getTradeUnits, getExecutions } = await import('../trades');
    const execs = await getExecutions();
    const openExec = execs.find((e: any) => e.side === 'BUY' && !e.isClosed);

    await closeTradeUnitWithQuantity({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 110, totalQty: 10,
      broker: 'AMR', account: 'USA',
      primaryEntryExecId: openExec!.id,
    });

    const execsAfter = await getExecutions();
    // Should have: original closed + remainder open + closing SELL
    const openBuys = execsAfter.filter((e: any) => e.side === 'BUY' && !e.isClosed);
    expect(openBuys.length).toBe(1);
    expect(openBuys[0].remainingQty).toBeCloseTo(10, 1);

    const tus = await getTradeUnits();
    const closed = tus.filter((t: any) => t.status === 'CLOSED');
    expect(closed.length).toBe(1);
    expect(closed[0].qty).toBeCloseTo(10, 1);
  });

  it('cierre cascade: qty > una exec, abarca múltiples', async () => {
    const CSV_TWO_BUYS = `date,symbol,quantity,price,broker,type,category,instrument,cuenta
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,USA
2024-01-05,AAPL,10,105,AMR,BUY,TRADE,STOCKS,USA`;
    resetMemoryState();
    initializeMemoryState(CSV_TWO_BUYS);
    const { closeTradeUnitWithQuantity, getTradeUnits, getExecutions } = await import('../trades');
    const execs = await getExecutions();
    const firstBuy = execs.find((e: any) => e.side === 'BUY' && !e.isClosed);

    await closeTradeUnitWithQuantity({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 115, totalQty: 20,
      broker: 'AMR', account: 'USA',
      primaryEntryExecId: firstBuy!.id,
    });

    const tus = await getTradeUnits();
    const closed = tus.filter((t: any) => t.status === 'CLOSED');
    expect(closed.length).toBe(2);
  });

  it('exceso: qty > total open — genera exec SELL abierta con remainder', async () => {
    resetMemoryState();
    initializeMemoryState(CSV_OPEN_AAPL);
    const { closeTradeUnitWithQuantity, getExecutions } = await import('../trades');
    const execs = await getExecutions();
    const openExec = execs.find((e: any) => e.side === 'BUY' && !e.isClosed);

    await closeTradeUnitWithQuantity({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 110, totalQty: 30, // 30 > 20 available
      broker: 'AMR', account: 'USA',
      primaryEntryExecId: openExec!.id,
    });

    const execsAfter = await getExecutions();
    const openSells = execsAfter.filter((e: any) => e.side === 'SELL' && !e.isClosed && e.remainingQty > 0);
    expect(openSells.length).toBe(1);
    expect(openSells[0].remainingQty).toBeCloseTo(10, 1);
  });
});

describe('getOpenExecutionsForClosing — account isolation', () => {
  const CSV_TWO_ACCOUNTS = `date,symbol,quantity,price,broker,type,category,instrument,cuenta
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,USA
2024-01-01,AAPL,10,100,IOL,BUY,TRADE,STOCKS,Argentina`;

  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(CSV_TWO_ACCOUNTS);
  });

  it('filtra por account — solo devuelve execs de la cuenta correcta', async () => {
    const { getOpenExecutionsForClosing } = await import('../trades');
    const usaExecs = await getOpenExecutionsForClosing('AAPL', 'SELL', 'USA', 'AMR');
    expect(usaExecs.length).toBe(1);
    expect(usaExecs[0].account).toBe('USA');

    const argExecs = await getOpenExecutionsForClosing('AAPL', 'SELL', 'Argentina', 'IOL');
    expect(argExecs.length).toBe(1);
    expect(argExecs[0].account).toBe('Argentina');
  });

  it('no devuelve execs de otra cuenta aunque mismo símbolo', async () => {
    const { getOpenExecutionsForClosing } = await import('../trades');
    const usaExecs = await getOpenExecutionsForClosing('AAPL', 'SELL', 'USA', 'IOL');
    expect(usaExecs.length).toBe(0);
  });
});
