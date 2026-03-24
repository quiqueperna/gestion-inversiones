"use client";
import { useRef, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseImportCSV, type ParsedRow } from "@/lib/csv-import";
import type { SimulationResult, ManualDecision } from "@/server/actions/trades";
import type { ManualMatchRequired, ProjectedTrade } from "@/lib/trade-simulator";

type Step = 'upload' | 'preview' | 'manual' | 'final-review' | 'done';

interface ImportCSVViewProps {
  onClose: () => void;
  brokers?: string[];
  accounts?: string[];
  onPreview: (rows: ImportRow[], decisions?: ManualDecision[]) => Promise<SimulationResult>;
  onConfirm: (rows: ImportRow[], decisions: ManualDecision[]) => Promise<{ importedExecs: number; createdTrades: number; errors: string[] }>;
}

export interface ImportRow {
  ref: string;
  date: string;
  side: 'BUY' | 'SELL';
  qty: number;
  symbol: string;
  price: number;
  broker: string;
  account: string;
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, count, children, defaultOpen = true }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">
          {title} <span className="text-zinc-500 font-normal ml-1">({count})</span>
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      {open && <div className="border-t border-white/10">{children}</div>}
    </div>
  );
}

// ─── Executions Table ─────────────────────────────────────────────────────────

function ExecsTable({ rows }: { rows: ParsedRow[] }) {
  return (
    <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-zinc-900/95 border-b border-white/10">
          <tr>
            {["#", "Fecha", "Side", "Qty", "Symbol", "Precio", "Broker", "Account"].map(h => (
              <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-widest text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="px-3 py-1.5 text-zinc-600">{i + 1}</td>
              <td className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">{row.rawDate}</td>
              <td className="px-3 py-1.5">
                <span className={cn("font-black", row.side === "BUY" ? "text-emerald-400" : "text-red-400")}>{row.side}</span>
              </td>
              <td className="px-3 py-1.5 text-zinc-200">{row.qty}</td>
              <td className="px-3 py-1.5 font-bold text-white">{row.symbol}</td>
              <td className="px-3 py-1.5 text-zinc-300">${row.price.toFixed(4)}</td>
              <td className="px-3 py-1.5 text-zinc-400">{row.broker}</td>
              <td className="px-3 py-1.5 text-zinc-400">{row.account}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Trades Preview Table ─────────────────────────────────────────────────────

function TradesTable({ trades }: { trades: ProjectedTrade[] }) {
  if (trades.length === 0) return <p className="text-[11px] text-zinc-500 px-4 py-4">No se generarán trades.</p>;
  return (
    <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-zinc-900/95 border-b border-white/10">
          <tr>
            {["Symbol", "Estado", "Qty", "Entrada", "Salida", "PnL $", "PnL %", "Días", "Broker", "Cuenta", "Estrategia"].map(h => (
              <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="px-3 py-1.5 font-bold text-white">{trade.symbol}</td>
              <td className="px-3 py-1.5">
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-black uppercase",
                  trade.status === 'OPEN' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300')}>
                  {trade.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                </span>
              </td>
              <td className="px-3 py-1.5 text-zinc-200">{trade.qty}</td>
              <td className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">${trade.entryPrice.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-zinc-300">{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}</td>
              <td className={cn("px-3 py-1.5 font-semibold", trade.pnlNominal >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {trade.status === 'CLOSED' ? `${trade.pnlNominal >= 0 ? '+' : ''}$${trade.pnlNominal.toFixed(2)}` : '—'}
              </td>
              <td className={cn("px-3 py-1.5", trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {trade.status === 'CLOSED' ? `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%` : '—'}
              </td>
              <td className="px-3 py-1.5 text-zinc-400">{trade.status === 'CLOSED' ? trade.days : '—'}</td>
              <td className="px-3 py-1.5 text-zinc-400">{trade.broker}</td>
              <td className="px-3 py-1.5 text-zinc-400">{trade.account}</td>
              <td className="px-3 py-1.5 text-zinc-500 text-[10px] uppercase">{trade.strategy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Invalid Rows Table ───────────────────────────────────────────────────────

function InvalidTable({ rows }: { rows: ParsedRow[] }) {
  return (
    <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-zinc-900/95 border-b border-white/10">
          <tr>
            {["#", "Fecha", "Symbol", "Broker", "Account", "Razón"].map(h => (
              <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-widest text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 bg-red-500/5">
              <td className="px-3 py-1.5 text-zinc-600">{i + 1}</td>
              <td className="px-3 py-1.5 text-zinc-400 whitespace-nowrap">{row.rawDate}</td>
              <td className="px-3 py-1.5 text-zinc-400">{row.symbol || '—'}</td>
              <td className="px-3 py-1.5 text-zinc-400">{row.broker || '—'}</td>
              <td className="px-3 py-1.5 text-zinc-400">{row.account || '—'}</td>
              <td className="px-3 py-1.5 text-red-400 text-[10px]">
                <span className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{row.error}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Manual Match Step ────────────────────────────────────────────────────────

function ManualMatchStep({
  pending,
  currentIdx,
  onDecide,
  onSkip,
}: {
  pending: ManualMatchRequired[];
  currentIdx: number;
  onDecide: (d: ManualDecision) => void;
  onSkip: () => void;
}) {
  const current = pending[currentIdx];
  const [selectedBuyRef, setSelectedBuyRef] = useState<string>('');
  const [qtyInput, setQtyInput] = useState<string>(String(current.qty));

  if (!current) return null;

  const maxQty = selectedBuyRef
    ? current.candidates.find(c => c.ref === selectedBuyRef)?.remainingQty ?? current.qty
    : current.qty;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">
          Coincidencia manual <span className="text-white font-bold">{currentIdx + 1}</span> de <span className="text-white font-bold">{pending.length}</span>
        </span>
      </div>

      {/* SELL info */}
      <div className="bg-zinc-800/60 rounded-lg p-4 border border-white/10">
        <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">Ejecución SELL a cerrar</p>
        <div className="grid grid-cols-4 gap-3 text-[12px]">
          <div><span className="text-zinc-500">Symbol:</span> <span className="text-white font-bold">{current.symbol}</span></div>
          <div><span className="text-zinc-500">Qty:</span> <span className="text-red-400 font-bold">{current.qty}</span></div>
          <div><span className="text-zinc-500">Precio:</span> <span className="text-zinc-200">${current.price.toFixed(4)}</span></div>
          <div><span className="text-zinc-500">Fecha:</span> <span className="text-zinc-300">{new Date(current.date).toLocaleDateString()}</span></div>
        </div>
      </div>

      {/* Candidates */}
      <div>
        <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">Elegí el BUY a cerrar</p>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-zinc-900/80 border-b border-white/10">
              <tr>
                {["", "Fecha", "Qty disp.", "Precio", "PnL est.", "Origen"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-widest text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.candidates.map((c, i) => {
                const pnlEst = ((current.price - c.price) / c.price) * 100;
                return (
                  <tr
                    key={i}
                    onClick={() => setSelectedBuyRef(c.ref)}
                    className={cn(
                      "border-b border-white/5 cursor-pointer transition-colors",
                      selectedBuyRef === c.ref ? "bg-blue-500/15 border-blue-500/30" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                        selectedBuyRef === c.ref ? "border-blue-500 bg-blue-500" : "border-zinc-600"
                      )}>
                        {selectedBuyRef === c.ref && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{new Date(c.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-zinc-200">{c.remainingQty}</td>
                    <td className="px-3 py-2 text-zinc-300">${c.price.toFixed(4)}</td>
                    <td className={cn("px-3 py-2 font-semibold", pnlEst >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {pnlEst >= 0 ? '+' : ''}{pnlEst.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{c.isFromDB ? 'BD' : 'Import'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Qty */}
      {selectedBuyRef && (
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-widest">Cantidad a cerrar:</label>
          <input
            type="number"
            value={qtyInput}
            min={0.0001}
            max={maxQty}
            step="any"
            onChange={e => setQtyInput(e.target.value)}
            className="w-28 px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-lg text-[12px] outline-none focus:border-blue-500 text-zinc-200"
          />
          <span className="text-[10px] text-zinc-600">máx: {maxQty}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={onSkip}
          className="px-4 py-2 border border-white/10 text-zinc-500 hover:text-zinc-300 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
          Omitir
        </button>
        <button
          disabled={!selectedBuyRef}
          onClick={() => {
            if (!selectedBuyRef) return;
            onDecide({ sellRef: current.sellRef, buyRef: selectedBuyRef, qty: parseFloat(qtyInput) || current.qty });
          }}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all"
        >
          Confirmar y siguiente
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImportCSVView({ onClose, brokers = [], accounts = [], onPreview, onConfirm }: ImportCSVViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [manualDecisions, setManualDecisions] = useState<ManualDecision[]>([]);
  const [manualIdx, setManualIdx] = useState(0);
  const [doneResult, setDoneResult] = useState<{ importedExecs: number; createdTrades: number } | null>(null);

  const validRows = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => r.error);

  const toImportRows = (): ImportRow[] =>
    validRows.map((r, i) => ({
      ref: `import-${i}`,
      date: r.date.toISOString(),
      side: r.side,
      qty: r.qty,
      symbol: r.symbol,
      price: r.price,
      broker: r.broker,
      account: r.account,
    }));

  function processFile(file: File) {
    setFileName(file.name);
    setSimResult(null);
    setManualDecisions([]);
    setStep('upload');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRows(parseImportCSV(
        text,
        brokers.length > 0 ? brokers : undefined,
        accounts.length > 0 ? accounts : undefined,
      ));
    };
    reader.readAsText(file);
  }

  async function handleCalculate(decisions?: ManualDecision[]) {
    setLoading(true);
    try {
      const result = await onPreview(toImportRows(), decisions ?? []);
      setSimResult(result);
      if ((decisions ?? []).length > 0 || result.manualMatchRequired.length === 0) {
        setStep('final-review');
      } else {
        setStep('preview');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await onConfirm(toImportRows(), manualDecisions);
      setDoneResult({ importedExecs: result.importedExecs, createdTrades: result.createdTrades });
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  function handleManualDecide(decision: ManualDecision) {
    const next = [...manualDecisions, decision];
    setManualDecisions(next);
    if (manualIdx + 1 < (simResult?.manualMatchRequired.length ?? 0)) {
      setManualIdx(i => i + 1);
    } else {
      // All manual decisions done → final review
      handleCalculate(next);
    }
  }

  function handleManualSkip() {
    if (manualIdx + 1 < (simResult?.manualMatchRequired.length ?? 0)) {
      setManualIdx(i => i + 1);
    } else {
      handleCalculate(manualDecisions);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white">Importar Ejecuciones CSV</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {step === 'upload' && 'Cargá el archivo, verificá las filas y calculá los trades'}
            {step === 'preview' && 'Preview de ejecuciones y trades que se generarán'}
            {step === 'manual' && 'Resolución de coincidencias manuales'}
            {step === 'final-review' && 'Revisión final antes de confirmar'}
            {step === 'done' && 'Importación completada'}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── UPLOAD STEP ── */}
      {step === 'upload' && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              dragging ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/30 bg-white/[0.02]"
            )}
          >
            <Upload className="w-7 h-7 mx-auto mb-2 text-zinc-500" />
            <p className="text-[12px] text-zinc-400">
              {fileName ? <span className="text-blue-400 font-semibold">{fileName}</span> : "Arrastrá tu archivo o hacé click"}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">.csv · .tsv · .txt</p>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
          </div>

          {rows.length > 0 && (
            <>
              {validRows.length > 0 && (
                <CollapsibleSection title="Ejecuciones válidas" count={validRows.length}>
                  <ExecsTable rows={validRows} />
                </CollapsibleSection>
              )}
              {invalidRows.length > 0 && (
                <CollapsibleSection title="Filas con errores (no se importarán)" count={invalidRows.length} defaultOpen={false}>
                  <InvalidTable rows={invalidRows} />
                </CollapsibleSection>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button onClick={onClose}
                  className="px-5 py-2 border border-white/10 text-zinc-400 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:text-white transition-all">
                  Cancelar
                </button>
                <button onClick={() => handleCalculate()} disabled={loading || validRows.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all flex items-center gap-2">
                  {loading
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Calculando...</>
                    : <><Upload className="w-3.5 h-3.5" />Calcular trades ({validRows.length})</>
                  }
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── PREVIEW STEP ── */}
      {(step === 'preview' || step === 'final-review') && simResult && (
        <>
          <CollapsibleSection title="Ejecuciones a importar" count={validRows.length} defaultOpen={false}>
            <ExecsTable rows={validRows} />
          </CollapsibleSection>

          <CollapsibleSection title="Trades que se generarán" count={simResult.trades.length}>
            <TradesTable trades={simResult.trades} />
          </CollapsibleSection>

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => { setStep('upload'); setSimResult(null); }}
              className="px-5 py-2 border border-white/10 text-zinc-400 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:text-white transition-all">
              ← Volver
            </button>
            {step === 'preview' && simResult.manualMatchRequired.length > 0 && (
              <button onClick={() => { setManualIdx(0); setStep('manual'); }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
                Resolver coincidencias manuales ({simResult.manualMatchRequired.length})
              </button>
            )}
            {(step === 'final-review' || simResult.manualMatchRequired.length === 0) && (
              <button onClick={handleConfirm} disabled={loading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all flex items-center gap-2">
                {loading
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importando...</>
                  : <>Confirmar importación</>
                }
              </button>
            )}
          </div>
        </>
      )}

      {/* ── MANUAL STEP ── */}
      {step === 'manual' && simResult && (
        <>
          <ManualMatchStep
            pending={simResult.manualMatchRequired}
            currentIdx={manualIdx}
            onDecide={handleManualDecide}
            onSkip={handleManualSkip}
          />
          {loading && (
            <div className="flex items-center justify-center py-4 gap-2 text-zinc-400 text-[12px]">
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
              Calculando trades...
            </div>
          )}
        </>
      )}

      {/* ── DONE STEP ── */}
      {step === 'done' && doneResult && (
        <>
          <div className="flex items-center gap-3 px-4 py-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[12px] text-emerald-300 font-semibold">
                {doneResult.importedExecs} ejecuciones importadas · {doneResult.createdTrades} trades generados
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onClose}
              className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
              Cerrar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
