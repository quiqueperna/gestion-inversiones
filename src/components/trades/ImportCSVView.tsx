"use client";
import { useRef, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseImportCSV, type ParsedRow } from "@/lib/csv-import";

interface ImportCSVViewProps {
  onImport: (rows: {
    date: string;
    side: 'BUY' | 'SELL';
    qty: number;
    symbol: string;
    price: number;
    broker: string;
    account: string;
  }[]) => Promise<void>;
  onClose: () => void;
  brokers?: string[];
  accounts?: string[];
}

const TABLE_HEADERS = ["#", "Fecha", "Side", "Qty", "Symbol", "Precio", "Broker", "Account"];

function PreviewTable({ rows, showReason }: { rows: ParsedRow[]; showReason?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-zinc-900/95 border-b border-white/10">
            <tr>
              {[...TABLE_HEADERS, ...(showReason ? ["Razón"] : [])].map(h => (
                <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-widest text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={cn(
                "border-b border-white/5 transition-colors",
                showReason ? "bg-red-500/5" : "hover:bg-white/[0.02]"
              )}>
                <td className="px-3 py-1.5 text-zinc-600">{i + 1}</td>
                <td className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">{row.rawDate}</td>
                <td className="px-3 py-1.5">
                  <span className={cn("font-black", row.side === "BUY" ? "text-emerald-400" : "text-red-400")}>
                    {row.side}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-zinc-200">{row.qty || "—"}</td>
                <td className="px-3 py-1.5 font-bold text-white">{row.symbol || "—"}</td>
                <td className="px-3 py-1.5 text-zinc-300">{row.price > 0 ? `$${row.price.toFixed(4)}` : "—"}</td>
                <td className="px-3 py-1.5 text-zinc-400">{row.broker || "—"}</td>
                <td className="px-3 py-1.5 text-zinc-400">{row.account || "—"}</td>
                {showReason && (
                  <td className="px-3 py-1.5 text-red-400 text-[10px]">
                    <span className="flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      {row.error}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ImportCSVView({ onImport, onClose, brokers = [], accounts = [] }: ImportCSVViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);

  const validRows = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => r.error);

  function processFile(file: File) {
    setFileName(file.name);
    setResult(null);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleConfirm() {
    if (validRows.length === 0) return;
    setLoading(true);
    try {
      await onImport(validRows.map(r => ({
        date: r.date.toISOString(),
        side: r.side,
        qty: r.qty,
        symbol: r.symbol,
        price: r.price,
        broker: r.broker,
        account: r.account,
      })));
      setResult({ imported: validRows.length });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white">Importar Ejecuciones CSV</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Columnas: Exec Time · Side · Qty · Symbol · Net Price · Broker · Account</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            dragging ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/30 bg-white/[0.02]"
          )}
        >
          <Upload className="w-7 h-7 mx-auto mb-2 text-zinc-500" />
          <p className="text-[12px] text-zinc-400">
            {fileName
              ? <span className="text-blue-400 font-semibold">{fileName}</span>
              : "Arrastrá tu archivo o hacé click para seleccionar"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">.csv · .tsv · .txt</p>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileChange} className="hidden" />
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-300 font-semibold">
            {result.imported} ejecuciones importadas correctamente.
          </span>
          {invalidRows.length > 0 && (
            <span className="text-[11px] text-zinc-400 ml-2">{invalidRows.length} filas omitidas por errores.</span>
          )}
        </div>
      )}

      {/* Preview: válidas */}
      {!result && validRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-zinc-300 font-semibold">
              {validRows.length} ejecuciones listas para importar
            </span>
          </div>
          <PreviewTable rows={validRows} />
        </div>
      )}

      {/* Preview: inválidas */}
      {!result && invalidRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px] text-zinc-400 font-semibold">
              {invalidRows.length} filas que NO se importarán
            </span>
          </div>
          <PreviewTable rows={invalidRows} showReason />
        </div>
      )}

      {/* Sin filas válidas y hay filas */}
      {!result && rows.length > 0 && validRows.length === 0 && (
        <p className="text-[12px] text-red-400 text-center py-2">Ninguna fila es válida para importar.</p>
      )}

      {/* Actions */}
      {!result && rows.length > 0 && (
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose}
            className="px-5 py-2 border border-white/10 text-zinc-400 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading || validRows.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all flex items-center gap-2">
            {loading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importando...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" />Confirmar {validRows.length} ejecuciones</>
            )}
          </button>
        </div>
      )}

      {/* Post-import close */}
      {result && (
        <div className="flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
