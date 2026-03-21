import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { subDays, subMonths } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding complete database...')
  
  // Clean existing data
  await prisma.trade.deleteMany({})
  await prisma.operation.deleteMany({})
  await prisma.cashFlow.deleteMany({})

  const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv')
  const csvText = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  const operations: any[] = []
  
  // 1. Load CSV Operations
  lines.slice(1).filter(line => line.trim() !== '').forEach((line, index) => {
    const values = line.split(',')
    const op: any = {}
    headers.forEach((header, i) => {
      let val: any = values[i]
      if (header === 'quantity' || header === 'price') val = parseFloat(val)
      if (header === 'isFalopa') val = val === 'true'
      if (header === 'date') val = new Date(val)
      op[header] = val
    })
    
    if (op.category === 'TRADE') {
      op.amount = Math.abs(op.quantity * op.price)
      op.remainingQty = Math.abs(op.quantity)
      operations.push(op)
    }
  })

  // 2. Add Dummy Operations (Open Trades & Unmatched)
  const today = new Date()
  
  // Open Long Position: TSLA (Bought recently, not sold)
  operations.push({
    date: subDays(today, 5),
    symbol: 'TSLA',
    quantity: 10,
    price: 200,
    amount: 2000,
    broker: 'AMR',
    type: 'BUY',
    remainingQty: 10,
    isFalopa: false,
    isIntra: false
  })

  // Open Short Position: NVDA (Sold recently, not covered)
  operations.push({
    date: subDays(today, 2),
    symbol: 'NVDA',
    quantity: -5,
    price: 800,
    amount: 4000,
    broker: 'IOL',
    type: 'SELL',
    remainingQty: 5, // We track absolute qty
    isFalopa: false,
    isIntra: true
  })

  // Partial Match: Bought 100 AAPL, Sold 50 AAPL
  operations.push({
    date: subMonths(today, 1),
    symbol: 'AAPL',
    quantity: 100,
    price: 150,
    amount: 15000,
    broker: 'AMR',
    type: 'BUY',
    remainingQty: 100,
    isFalopa: false,
    isIntra: false
  })
  
  operations.push({
    date: subDays(today, 10),
    symbol: 'AAPL',
    quantity: -50,
    price: 160, // Profit
    amount: 8000,
    broker: 'AMR',
    type: 'SELL',
    remainingQty: 50,
    isFalopa: false,
    isIntra: false
  })

  // Sort operations by date
  operations.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Insert Operations
  console.log(`Inserting ${operations.length} operations...`)
  
  // We need to insert them one by one to get IDs for matching logic in memory or re-query
  // Let's insert all first, then process FIFO
  for (const op of operations) {
    await prisma.operation.create({
      data: {
        date: op.date,
        symbol: op.symbol,
        quantity: op.quantity,
        price: op.price,
        amount: op.amount,
        broker: op.broker || 'AMR',
        type: op.type,
        isFalopa: op.isFalopa || false,
        isIntra: op.isIntra || false,
        remainingQty: Math.abs(op.quantity), // Initially full quantity is remaining
        isClosed: false
      }
    })
  }

  // 3. FIFO Matching Logic (Re-implementation with remainingQty update)
  console.log('Processing FIFO matches...')
  const allOps = await prisma.operation.findMany({ orderBy: { date: 'asc' } })
  const openInventory: Record<string, any[]> = {} // Map Symbol -> Array of Open BUY Operations

  for (const op of allOps) {
    // Determine instrument type
    let instrumentType = 'STOCK'
    if (op.symbol.includes('BTC') || op.symbol.includes('ETH')) instrumentType = 'CRYPTO'
    else if (op.symbol.endsWith('D') || op.symbol.length > 4) instrumentType = 'CEDEAR' // Simple heuristic

    if (op.type === 'BUY') {
      if (!openInventory[op.symbol]) openInventory[op.symbol] = []
      openInventory[op.symbol].push(op)
    } else {
      // SELL Operation: Try to match against open BUYs
      let sellQty = Math.abs(op.quantity)
      const matches = openInventory[op.symbol] || []
      
      while (sellQty > 0 && matches.length > 0) {
        const buyOp = matches[0]
        
        // Check current available qty in DB (or memory tracking)
        // Since we are running sequentially, memory tracking of 'buyOp' object is enough if we update it
        // But we need to be careful about reference types. 
        // buyOp is a reference to an object in openInventory array.
        
        const matchQty = Math.min(sellQty, buyOp.remainingQty)
        
        const returnAmount = (op.price - buyOp.price) * matchQty
        const entryAmount = buyOp.price * matchQty
        const closeAmount = op.price * matchQty
        
        const days = Math.ceil(Math.abs(new Date(op.date).getTime() - new Date(buyOp.date).getTime()) / (1000 * 60 * 60 * 24)) || 1
        const returnPercent = entryAmount > 0 ? (returnAmount / entryAmount) * 100 : 0

        await prisma.trade.create({
          data: {
            symbol: op.symbol,
            quantity: matchQty,
            openDate: buyOp.date,
            closeDate: op.date,
            openPrice: buyOp.price,
            closePrice: op.price,
            openAmount: entryAmount,
            closeAmount: closeAmount,
            days,
            returnAmount,
            returnPercent,
            tna: (returnPercent / days) * 365,
            broker: op.broker,
            instrumentType,
            openOperationId: buyOp.id,
            closeOperationId: op.id
          }
        })

        // Update remaining quantities
        buyOp.remainingQty -= matchQty
        sellQty -= matchQty
        
        // Update DB for Buy Op
        await prisma.operation.update({
          where: { id: buyOp.id },
          data: { 
            remainingQty: buyOp.remainingQty,
            isClosed: buyOp.remainingQty <= 0.0001 
          }
        })

        if (buyOp.remainingQty <= 0.0001) {
          matches.shift() // Remove fully closed buy op
        }
      }

      // Update DB for Sell Op
      // If sellQty is 0, it was fully matched (closed)
      // If sellQty > 0, it remains open (Short position - though logic above assumes matching against Longs only for now)
      // For simplicity in this seed, we assume we only close Longs. Shorts opening would be handled differently (reverse logic).
      // Let's assume remaining sellQty means we oversold or opened a short. 
      // For now, we update the sell op to reflect it was "consumed" by the buy matching if match occurred.
      // Actually, a SELL op is "Closed" if it was fully matched against a BUY? No, a SELL op *closes* a BUY op.
      // The SELL op itself is the "Closing Operation".
      // But if we support Short Selling, a SELL can be an "Open Operation".
      // Let's keep it simple: SELL always closes BUYs in this FIFO logic.
      
      const originalSellQty = Math.abs(op.quantity)
      const matchedSellQty = originalSellQty - sellQty
      
      await prisma.operation.update({
        where: { id: op.id },
        data: {
          remainingQty: sellQty, // If 0, fully used to close
          isClosed: true // A closing operation is considered "executed". 
                         // Wait, if it's a Short Sell, it's Open. 
                         // But core.md says "Para poder cerrar una operacion debo tener su contraparte".
                         // So a SELL that matches is a closing action.
        }
      })
    }
  }

  // 4. Add CashFlows (Deposits/Withdrawals)
  console.log('Adding CashFlows...')
  const brokers = ['AMR', 'IOL', 'BINANCE']
  
  for (const broker of brokers) {
    // Initial Deposit
    await prisma.cashFlow.create({
      data: {
        date: new Date(2023, 0, 1),
        amount: 10000,
        type: 'DEPOSIT',
        broker,
        description: 'Deposito Inicial'
      }
    })
    
    // Some monthly deposits
    await prisma.cashFlow.create({
      data: {
        date: new Date(2023, 5, 15),
        amount: 500,
        type: 'DEPOSIT',
        broker,
        description: 'Aporte Mensual'
      }
    })

    // A withdrawal
    await prisma.cashFlow.create({
      data: {
        date: new Date(2023, 11, 20),
        amount: 2000,
        type: 'WITHDRAWAL',
        broker,
        description: 'Retiro Ganancias'
      }
    })
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
