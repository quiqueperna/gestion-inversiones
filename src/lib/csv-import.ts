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
 * validBrokers/validAccounts: si se pasan, valida que broker/account existan.
 */
export function parseImportCSV(
  text: string,
  validBrokers?: string[],
  validAccounts?: string[],
): ParsedRow[] {
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

    const errors: string[] = [];
    let date: Date = new Date();
    let side: 'BUY' | 'SELL' = 'BUY';
    let qty = 0;
    let price = 0;

    try { date = parseExecDate(rawDate); } catch (e) { errors.push(e instanceof Error ? e.message : 'Fecha inválida'); }
    if (rawSide !== 'BUY' && rawSide !== 'SELL') errors.push(`Side inválido: "${rawSide}"`);
    else side = rawSide as 'BUY' | 'SELL';
    const parsedQty = parseFloat(rawQty);
    if (isNaN(parsedQty) || parsedQty === 0) errors.push(`Qty inválido: "${rawQty}"`);
    else qty = Math.abs(parsedQty);
    const parsedPrice = parseFloat(rawPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) errors.push(`Precio inválido: "${rawPrice}"`);
    else price = parsedPrice;
    if (!symbol) errors.push('Symbol vacío');
    if (validBrokers && broker && !validBrokers.includes(broker)) errors.push(`Broker "${broker}" no existe`);
    if (validAccounts && account && !validAccounts.includes(account)) errors.push(`Cuenta "${account}" no existe`);

    if (errors.length > 0) {
      rows.push({ rawDate, date, side, qty, symbol, price, broker, account, error: errors.join(' · ') });
    } else {
      rows.push({ rawDate, date, side, qty, symbol, price, broker, account });
    }
  }

  return rows;
}
