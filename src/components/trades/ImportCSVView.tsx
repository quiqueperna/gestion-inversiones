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
}

export default function ImportCSVView({ onImport, onClose }: ImportCSVViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  function processFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRows(parseImportCSV(text));
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
      setResult({ imported: validRows.length, errors: errorRows.map(r => r.error!) });
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
          {fileName ? <span className="text-blue-400 font-semibold">{fileName}</span> : "Arrastrá tu archivo o hacé click para seleccionar"}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">.csv · .tsv · .txt</p>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Result banner */}
      {result && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-300 font-semibold">
            {result.imported} ejecuciones importadas correctamente.
          </span>
          {result.errors.length > 0 && (
            <span className="text-[11px] text-red-400 ml-2">{result.errors.length} con error.</span>
          )}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !result && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              <span className="text-white font-bold">{validRows.length}</span> ejecuciones listas
              {errorRows.length > 0 && (
                <span className="text-red-400 ml-2">· {errorRows.length} con error</span>
              )}
            </span>
            <span className="text-[10px] text-zinc-600">{rows.length} filas totales</span>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
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
                    <tr key={i} className={cn(
                      "border-b border-white/5 transition-colors",
                      row.error ? "bg-red-500/5" : "hover:bg-white/[0.02]"
                    )}>
                      <td className="px-3 py-1.5 text-zinc-600">{i + 1}</td>
                      <td className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">
                        {row.error ? <span className="text-red-400 text-[10px]">{row.rawDate}</span> : row.rawDate}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.error ? "—" : (
                          <span className={cn("font-black", row.side === "BUY" ? "text-emerald-400" : "text-red-400")}>
                            {row.side}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-200">{row.error ? "—" : row.qty}</td>
                      <td className="px-3 py-1.5 font-bold text-white">{row.error ? "—" : row.symbol}</td>
                      <td className="px-3 py-1.5 text-zinc-300">{row.error ? "—" : `$${row.price.toFixed(4)}`}</td>
                      <td className="px-3 py-1.5 text-zinc-400">{row.broker}</td>
                      <td className="px-3 py-1.5 text-zinc-400">
                        {row.error ? (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-3 h-3" /> {row.error}
                          </span>
                        ) : row.account}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
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
        </>
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
