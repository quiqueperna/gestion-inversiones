import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { parse } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv')
  const csvText = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  console.log(`Importing ${lines.length - 1} lines from CSV...`)

  const operations = lines.slice(1).filter(line => line.trim() !== '').map((line, index) => {
    const values = line.split(',')
    const op: any = {}
    headers.forEach((header, i) => {
      let val: any = values[i]
      if (header === 'quantity' || header === 'price') val = parseFloat(val)
      if (header === 'isFalopa') val = val === 'true'
      if (header === 'date') val = new Date(val)
      op[header] = val
    })
    op.amount = Math.abs(op.quantity * op.price)
    return op
  })

  // Create Operations
  console.log('Inserting operations...')
  for (const op of operations) {
    if (op.category !== 'TRADE') continue;
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
      }
    })
  }

  // FIFO Matching for Trades
  console.log('Matching trades (FIFO)...')
  const allOps = await prisma.operation.findMany({ orderBy: { date: 'asc' } })
  const openInventory: Record<string, any[]> = {}
  let tradeCount = 0

  for (const op of allOps) {
    if (op.type === 'BUY') {
      if (!openInventory[op.symbol]) openInventory[op.symbol] = []
      openInventory[op.symbol].push({ ...op, remainingQty: op.quantity })
    } else {
      let sellQty = Math.abs(op.quantity)
      const matches = openInventory[op.symbol] || []
      while (sellQty > 0 && matches.length > 0) {
        const buyOp = matches[0]
        const matchQty = Math.min(sellQty, buyOp.remainingQty)
        const returnAmount = (op.price - buyOp.price) * matchQty
        const entryAmount = buyOp.price * matchQty
        const closeAmount = op.price * matchQty
        const days = Math.ceil(Math.abs(new Date(op.date).getTime() - new Date(buyOp.date).getTime()) / (1000 * 60 * 60 * 24)) || 1
        const returnPercent = (returnAmount / entryAmount) * 100

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
            instrumentType: 'STOCK',
            openOperationId: buyOp.id,
            closeOperationId: op.id
          }
        })
        
        buyOp.remainingQty -= matchQty
        sellQty -= matchQty
        if (buyOp.remainingQty <= 0) matches.shift()
        tradeCount++
      }
    }
  }

  console.log(`Done! Created ${tradeCount} trades.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
