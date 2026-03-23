/**
 * Seed v16 — Carga datos desde CSV a Supabase (Prisma)
 * Incluye FIFO matching para generar TradeUnits
 * Ejecutar: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-v16.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

// Mapeo broker → cuenta
const BROKER_CUENTA_MAP: Record<string, string> = {
  IBKR: 'USA',
  AMR: 'USA',
  IOL: 'Argentina',
  Schwab: 'USA',
  Binance: 'CRYPTO',
  Cocos: 'Argentina',
  Balanz: 'Argentina',
  PP: 'Argentina',
};

interface RawOp {
  id: number;
  date: Date;
  symbol: string;
  qty: number;
  price: number;
  amount: number;
  broker: string;
  account: string;
  side: 'BUY' | 'SELL';
  remainingQty: number;
  isClosed: boolean;
  currency: string;
  commissions: number;
  exchange_rate: number;
}

async function main() {
  console.log('🌱 Iniciando seed v16...');

  // 1. Limpiar tablas (orden importante por FK)
  console.log('🗑️  Limpiando tablas...');
  await prisma.tradeUnit.deleteMany();
  await prisma.cashFlow.deleteMany();
  await prisma.execution.deleteMany();

  // 2. Parsear CSV
  const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const rawOps: RawOp[] = [];

  lines.slice(1).filter((line) => line.trim() !== '').forEach((line, index) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ''; });

    if (row.category !== 'TRADE') return;

    const qty = Math.abs(parseFloat(row.quantity));
    const price = parseFloat(row.price);
    const side = (row.type || (parseFloat(row.quantity) > 0 ? 'BUY' : 'SELL')) as 'BUY' | 'SELL';
    const broker = row.broker;
    const account = BROKER_CUENTA_MAP[broker] ?? 'USA';

    rawOps.push({
      id: index + 1,
      date: new Date(row.date + 'T12:00:00'),
      symbol: row.symbol.toUpperCase(),
      qty,
      price,
      amount: qty * price,
      broker,
      account,
      side,
      remainingQty: qty,
      isClosed: false,
      currency: 'USD',
      commissions: 0,
      exchange_rate: 1,
    });
  });

  // Ordenar cronológicamente
  rawOps.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 3. FIFO Matching
  const openInventory: Record<string, RawOp[]> = {};
  interface TradeUnitData {
    symbol: string;
    qty: number;
    entryDate: Date;
    exitDate?: Date;
    entryPrice: number;
    exitPrice?: number;
    entryAmount: number;
    exitAmount?: number;
    days: number;
    pnlNominal: number;
    pnlPercent: number;
    tna: number;
    broker: string;
    account: string;
    instrumentType: string;
    status: string;
    side: string;
    entryExecId?: number;
    exitExecId?: number;
  }
  const tradeUnitsBatch: TradeUnitData[] = [];

  rawOps.forEach((op) => {
    const matchKey = `${op.symbol}::${op.account}::${op.broker}`;

    if (op.side === 'BUY') {
      if (!openInventory[matchKey]) openInventory[matchKey] = [];
      openInventory[matchKey].push(op);
    } else {
      let sellQty = op.qty;
      const matches = openInventory[matchKey] || [];

      while (sellQty > 0.0001 && matches.length > 0) {
        const buyOp = matches[0];
        const matchQty = Math.min(sellQty, buyOp.remainingQty);

        const entryAmount = buyOp.price * matchQty;
        const exitAmount = op.price * matchQty;
        const pnlNominal = exitAmount - entryAmount;
        const days = Math.max(1, Math.ceil(Math.abs(op.date.getTime() - buyOp.date.getTime()) / (1000 * 60 * 60 * 24)));
        const pnlPercent = entryAmount > 0 ? (pnlNominal / entryAmount) * 100 : 0;
        const tna = (pnlPercent / days) * 365;

        tradeUnitsBatch.push({
          symbol: op.symbol,
          qty: matchQty,
          entryDate: buyOp.date,
          exitDate: op.date,
          entryPrice: buyOp.price,
          exitPrice: op.price,
          entryAmount,
          exitAmount,
          days,
          pnlNominal,
          pnlPercent,
          tna,
          broker: op.broker,
          account: buyOp.account,
          instrumentType: getInstrumentType(op.symbol),
          status: 'CLOSED',
          side: 'BUY',
          entryExecId: buyOp.id,
          exitExecId: op.id,
        });

        buyOp.remainingQty -= matchQty;
        sellQty -= matchQty;
        if (buyOp.remainingQty <= 0.0001) {
          buyOp.isClosed = true;
          matches.shift();
        }
      }

      op.remainingQty = sellQty;
      op.isClosed = sellQty <= 0.0001;
    }
  });

  // 4. Open TradeUnits para posiciones sin cerrar
  Object.values(openInventory).forEach((buyOps) => {
    buyOps.forEach((buyOp) => {
      if (buyOp.remainingQty <= 0.0001) return;
      const days = Math.max(1, Math.ceil((new Date().getTime() - buyOp.date.getTime()) / (1000 * 60 * 60 * 24)));
      tradeUnitsBatch.push({
        symbol: buyOp.symbol,
        qty: buyOp.remainingQty,
        entryDate: buyOp.date,
        entryPrice: buyOp.price,
        entryAmount: buyOp.price * buyOp.remainingQty,
        days,
        pnlNominal: 0,
        pnlPercent: 0,
        tna: 0,
        broker: buyOp.broker,
        account: buyOp.account,
        instrumentType: getInstrumentType(buyOp.symbol),
        status: 'OPEN',
        side: 'BUY',
        entryExecId: buyOp.id,
      });
    });
  });

  // 5. Agregar mock executions (posiciones abiertas adicionales)
  const today = new Date();
  const mockExecs: RawOp[] = [
    {
      id: 9001,
      date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      symbol: 'TSLA',
      qty: 10,
      price: 200,
      amount: 2000,
      broker: 'Schwab',
      account: 'USA',
      side: 'BUY',
      remainingQty: 10,
      isClosed: false,
      currency: 'USD',
      commissions: 0,
      exchange_rate: 1,
    },
    {
      id: 9002,
      date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      symbol: 'AAPL',
      qty: 100,
      price: 150,
      amount: 15000,
      broker: 'Schwab',
      account: 'USA',
      side: 'BUY',
      remainingQty: 100,
      isClosed: false,
      currency: 'USD',
      commissions: 0,
      exchange_rate: 1,
    },
    {
      id: 9003,
      date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
      symbol: 'NVDA',
      qty: 8,
      price: 850,
      amount: 6800,
      broker: 'IOL',
      account: 'Argentina',
      side: 'BUY',
      remainingQty: 8,
      isClosed: false,
      currency: 'USD',
      commissions: 0,
      exchange_rate: 1,
    },
  ];

  const allOps = [...rawOps, ...mockExecs];

  // Mock TradeUnits para las mock executions (posiciones abiertas)
  mockExecs.forEach((mockExec) => {
    const days = Math.max(1, Math.ceil((today.getTime() - mockExec.date.getTime()) / (1000 * 60 * 60 * 24)));
    tradeUnitsBatch.push({
      symbol: mockExec.symbol,
      qty: mockExec.qty,
      entryDate: mockExec.date,
      entryPrice: mockExec.price,
      entryAmount: mockExec.amount,
      days,
      pnlNominal: 0,
      pnlPercent: 0,
      tna: 0,
      broker: mockExec.broker,
      account: mockExec.account,
      instrumentType: getInstrumentType(mockExec.symbol),
      status: 'OPEN',
      side: 'BUY',
      entryExecId: mockExec.id,
    });
  });

  // 6. Insertar Executions
  console.log(`📥 Insertando ${allOps.length} executions...`);
  // Insertar en batches de 100
  for (let i = 0; i < allOps.length; i += 100) {
    const batch = allOps.slice(i, i + 100);
    await prisma.execution.createMany({
      data: batch.map((op) => ({
        id: op.id,
        date: op.date,
        symbol: op.symbol,
        qty: op.qty,
        price: op.price,
        amount: op.amount,
        broker: op.broker,
        account: op.account,
        side: op.side,
        isClosed: op.isClosed,
        remainingQty: op.remainingQty,
        currency: op.currency,
        commissions: op.commissions,
        exchange_rate: op.exchange_rate,
      })),
      skipDuplicates: true,
    });
  }

  // 7. Insertar TradeUnits
  console.log(`📥 Insertando ${tradeUnitsBatch.length} trade units...`);
  for (let i = 0; i < tradeUnitsBatch.length; i += 100) {
    const batch = tradeUnitsBatch.slice(i, i + 100);
    await prisma.tradeUnit.createMany({
      data: batch.map((tu) => ({
        symbol: tu.symbol,
        qty: tu.qty,
        entryDate: tu.entryDate,
        exitDate: tu.exitDate ?? null,
        entryPrice: tu.entryPrice,
        exitPrice: tu.exitPrice ?? null,
        entryAmount: tu.entryAmount,
        exitAmount: tu.exitAmount ?? null,
        days: tu.days,
        pnlNominal: tu.pnlNominal,
        pnlPercent: tu.pnlPercent,
        tna: tu.tna,
        broker: tu.broker,
        account: tu.account,
        instrumentType: tu.instrumentType,
        status: tu.status,
        side: tu.side,
        entryExecId: tu.entryExecId ?? null,
        exitExecId: tu.exitExecId ?? null,
      })),
      skipDuplicates: false,
    });
  }

  // 8. Insertar CashFlows mock
  const brokersList = ['AMR', 'IOL', 'IBKR'];
  const cashFlowsData = brokersList.flatMap((broker) => [
    { date: new Date('2023-01-01T12:00:00'), amount: 10000, type: 'DEPOSIT', broker, description: 'Depósito Inicial' },
    { date: new Date('2023-06-15T12:00:00'), amount: 5000, type: 'DEPOSIT', broker, description: 'Aporte Q2' },
    { date: new Date('2023-12-20T12:00:00'), amount: 2000, type: 'WITHDRAWAL', broker, description: 'Retiro fin de año' },
  ]);

  console.log(`📥 Insertando ${cashFlowsData.length} cashflows...`);
  await prisma.cashFlow.createMany({ data: cashFlowsData });

  // Resumen
  const [execCount, tuCount, cfCount] = await Promise.all([
    prisma.execution.count(),
    prisma.tradeUnit.count(),
    prisma.cashFlow.count(),
  ]);

  console.log('\n✅ Seed completado:');
  console.log(`   Executions: ${execCount}`);
  console.log(`   TradeUnits: ${tuCount}`);
  console.log(`   CashFlows:  ${cfCount}`);
}

function getInstrumentType(symbol: string): string {
  const cedears = ['GGAL', 'YPF', 'BBAR', 'MELI', 'GLOB', 'LOMA', 'BMA', 'SUPV', 'CEPU', 'PAMP', 'TECO2', 'COME', 'CRES', 'IRSA'];
  const crypto = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'DOT', 'USDT', 'USDC'];
  if (crypto.some((c) => symbol.toUpperCase().includes(c))) return 'CRYPTO';
  if (cedears.includes(symbol.toUpperCase())) return 'CEDEAR';
  return 'STOCK';
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
