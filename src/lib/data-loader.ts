/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DemoState {
    operations: any[];
    trades: any[];
}

const memoryState: DemoState = {
    operations: [],
    trades: []
};

export function getMemoryState() {
    return memoryState;
}

export function loadCsvData(csvText: string) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const ops = lines.slice(1).filter(line => line.trim() !== '').map((line, index) => {
        const values = line.split(',');
        const op: any = { id: index + 1 };
        headers.forEach((header, i) => {
            let val: any = values[i];
            if (header === 'quantity' || header === 'price') val = parseFloat(val);
            if (header === 'isFalopa' || header === 'isIntra') val = val === 'true';
            op[header.trim()] = val;
        });
        op.amount = Math.abs(op.quantity * op.price);
        return op;
    });

    memoryState.operations = ops;
    const trades: any[] = [];
    const buys = ops.filter(o => o.type === 'BUY');
    const sells = ops.filter(o => o.type === 'SELL');

    buys.forEach(buy => {
        const matchingSell = sells.find(s => s.symbol === buy.symbol && Math.abs(s.quantity) === buy.quantity && !(s as any).used);
        if (matchingSell) {
            (matchingSell as any).used = true;
            const returnAmount = matchingSell.amount - buy.amount;
            const returnPercent = (returnAmount / buy.amount) * 100;
            const days = Math.ceil(Math.abs(new Date(matchingSell.date).getTime() - new Date(buy.date).getTime()) / (1000 * 60 * 60 * 24)) || 1;
            
            trades.push({
                id: trades.length + 1,
                symbol: buy.symbol,
                quantity: buy.quantity,
                openDate: buy.date,
                closeDate: matchingSell.date,
                openPrice: buy.price,
                closePrice: matchingSell.price,
                openAmount: buy.amount,
                closeAmount: matchingSell.amount,
                days,
                returnAmount,
                returnPercent,
                tna: (returnPercent / days) * 365,
                broker: buy.broker,
                instrumentType: 'STOCK'
            });
        }
    });

    memoryState.trades = trades;
    return memoryState;
}
