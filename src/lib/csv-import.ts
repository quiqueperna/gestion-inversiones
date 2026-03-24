export interface ParsedRow {
  rawDate: string;
  date: Date;
  side: 'BUY' | 'SELL';
  qty: number;
  symbol: string;
  price: number;
  broker: string;
  account: string;
  error?: string;
}

/**
 * Parsea fecha formato mm/dd/yy hh:mm:ss → Date
 * Ej: "12/27/22 13:15:15" → Date(2022-12-27T13:15:15)
 */
function parseExecDate(raw: string): Date {
  const trimmed = raw.trim();
  // formato: mm/dd/yy hh:mm:ss
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Fecha inválida: "${raw}"`);
  const [, mm, dd, yy, hh, min, ss] = match;
  const year = yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy);
  return new Date(year, parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min), parseInt(ss));
}

/**
 * Parsea CSV/TSV de ejecuciones.
 * Columnas esperadas (header obligatorio):
 *   Exec Time | Side | Qty | Symbol | Net Price | Broker | Account
 * Separador: tab (TSV) o coma (CSV), autodetectado.
 */
export function parseImportCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Autodetectar separador
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase());

  const idxExecTime = header.findIndex(h => h.includes('exec time') || h === 'exec_time' || h === 'date');
  const idxSide     = header.findIndex(h => h === 'side');
  const idxQty      = header.findIndex(h => h === 'qty' || h === 'quantity');
  const idxSymbol   = header.findIndex(h => h === 'symbol');
  const idxPrice    = header.findIndex(h => h.includes('price'));
  const idxBroker   = header.findIndex(h => h === 'broker');
  const idxAccount  = header.findIndex(h => h === 'account');

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const rawDate = idxExecTime >= 0 ? (cols[idxExecTime] ?? '').trim() : '';
    const rawSide = idxSide >= 0 ? (cols[idxSide] ?? '').trim().toUpperCase() : '';
    const rawQty  = idxQty >= 0 ? (cols[idxQty] ?? '').trim().replace(/[+\s]/g, '') : '';
    const symbol  = idxSymbol >= 0 ? (cols[idxSymbol] ?? '').trim().toUpperCase() : '';
    const rawPrice = idxPrice >= 0 ? (cols[idxPrice] ?? '').trim() : '';
    const broker  = idxBroker >= 0 ? (cols[idxBroker] ?? '').trim() : '';
    const account = idxAccount >= 0 ? (cols[idxAccount] ?? '').trim() : '';

    try {
      const date = parseExecDate(rawDate);
      if (rawSide !== 'BUY' && rawSide !== 'SELL') throw new Error(`Side inválido: "${rawSide}"`);
      const qty = parseFloat(rawQty);
      if (isNaN(qty) || qty === 0) throw new Error(`Qty inválido: "${rawQty}"`);
      const price = parseFloat(rawPrice);
      if (isNaN(price) || price <= 0) throw new Error(`Precio inválido: "${rawPrice}"`);
      if (!symbol) throw new Error('Symbol vacío');

      rows.push({ rawDate, date, side: rawSide as 'BUY' | 'SELL', qty: Math.abs(qty), symbol, price, broker, account });
    } catch (e) {
      rows.push({
        rawDate, date: new Date(), side: 'BUY', qty: 0, symbol: '', price: 0, broker, account,
        error: e instanceof Error ? e.message : 'Error desconocido',
      });
    }
  }

  return rows;
}
