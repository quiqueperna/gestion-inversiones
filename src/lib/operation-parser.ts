// Parser de texto para pegado rápido de operaciones
// Formatos soportados:
//   Corto:    AAPL 2024-01-15 10 150.50 BUY AMR
//   Corto2:   AAPL 10 150.50 BUY 2024-01-15
//   Clave=val: simbolo=AAPL cantidad=10 precio=150.50 tipo=BUY fecha=2024-01-15

export interface ParsedOperation {
  symbol: string;
  quantity: number;
  price: number;
  type: "BUY" | "SELL";
  date: string;
  broker: string;
}

export function parseOperationText(text: string): Partial<ParsedOperation> | null {
  if (!text || text.trim().length === 0) return null;

  const t = text.trim();

  // Formato clave=valor
  if (t.includes('=')) {
    const result: Partial<ParsedOperation> = {};
    const pairs = t.split(/\s+/);
    for (const pair of pairs) {
      const [key, val] = pair.split('=');
      if (!key || !val) continue;
      const k = key.toLowerCase().trim();
      const v = val.trim();
      if (k === 'simbolo' || k === 'symbol') result.symbol = v.toUpperCase();
      else if (k === 'cantidad' || k === 'quantity' || k === 'qty') result.quantity = parseFloat(v);
      else if (k === 'precio' || k === 'price') result.price = parseFloat(v);
      else if (k === 'tipo' || k === 'type') result.type = v.toUpperCase() as "BUY" | "SELL";
      else if (k === 'fecha' || k === 'date') result.date = v;
      else if (k === 'broker') result.broker = v.toUpperCase();
    }
    if (result.symbol && result.quantity && result.price) return result;
    return null;
  }

  // Formato libre con espacios/tabs/comas
  const parts = t.split(/[\s,\t]+/).filter(Boolean);
  if (parts.length < 4) return null;

  const result: Partial<ParsedOperation> = { broker: 'AMR' };
  const today = new Date().toISOString().split('T')[0];

  // Detectar símbolo (primero que sea puro alfabético y mayúsculas o convertible)
  let symbolIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    if (/^[A-Za-z]{1,10}$/.test(parts[i]) && parts[i].toUpperCase() !== 'BUY' && parts[i].toUpperCase() !== 'SELL') {
      result.symbol = parts[i].toUpperCase();
      symbolIdx = i;
      break;
    }
  }
  if (!result.symbol) return null;

  // Detectar tipo (BUY/SELL)
  for (const p of parts) {
    if (p.toUpperCase() === 'BUY' || p.toUpperCase() === 'COMPRA') { result.type = 'BUY'; break; }
    if (p.toUpperCase() === 'SELL' || p.toUpperCase() === 'VENTA') { result.type = 'SELL'; break; }
  }

  // Detectar fecha (formato YYYY-MM-DD o DD/MM/YYYY)
  for (const p of parts) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) { result.date = p; break; }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(p)) {
      const [d, m, y] = p.split('/');
      result.date = `${y}-${m}-${d}`;
      break;
    }
  }
  if (!result.date) result.date = today;

  // Detectar broker (AMR, IOL, IBKR, PP)
  for (const p of parts) {
    if (['AMR', 'IOL', 'IBKR', 'PP', 'BINANCE'].includes(p.toUpperCase())) {
      result.broker = p.toUpperCase();
      break;
    }
  }

  // Detectar números (cantidad y precio)
  const nums = parts
    .filter(p => /^\d+(\.\d+)?$/.test(p))
    .map(Number)
    .filter(n => !isNaN(n) && n > 0);

  if (nums.length >= 2) {
    // El número más grande suele ser el precio (si hay diferencia de magnitud)
    // pero podemos asumir: primero=cantidad, segundo=precio
    result.quantity = nums[0];
    result.price = nums[1];
    // Si el segundo es claramente mayor, intercambiar (precio de acción > cantidad típica)
    if (nums[1] > nums[0] * 5) {
      result.quantity = nums[0];
      result.price = nums[1];
    }
  } else if (nums.length === 1) {
    result.price = nums[0];
  }

  if (!result.quantity || !result.price) return null;
  if (result.quantity <= 0 || result.price <= 0) return null;

  // suppress unused variable warning
  void symbolIdx;

  return result;
}
