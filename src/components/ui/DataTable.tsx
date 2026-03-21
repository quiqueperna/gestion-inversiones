"use client";
import { useState, useMemo, useEffect } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, Pencil, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: number | string }> {
  data: T[];
  columns: ColumnDef<T>[];
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onExport?: () => void;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: number | string }>({
  data,
  columns,
  onView,
  onEdit,
  onDelete,
  onExport,
  rowsPerPageOptions = [25, 50, 100],
  defaultRowsPerPage = 50,
  emptyMessage = "Sin registros",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [showAll, setShowAll] = useState(false);

  // Reset to page 1 whenever the dataset changes
  useEffect(() => { setPage(1); }, [data]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av instanceof Date && bv instanceof Date) return sortDir === "asc" ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortDir]);

  const displayed = showAll ? sorted : sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const hasActions = onView || onEdit || onDelete;

  const SortIcon = ({ col }: { col: ColumnDef<T> }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />;
  };

  return (
    <div className="bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden">
      {/* Metadata bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/30">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{data.length} REGISTROS</span>
        <div className="flex items-center gap-1">
          {rowsPerPageOptions.map(n => (
            <button key={n} onClick={() => { setRowsPerPage(n); setShowAll(false); setPage(1); }}
              className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-all", !showAll && rowsPerPage === n ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300")}>
              {n}
            </button>
          ))}
          <button onClick={() => { setShowAll(true); setPage(1); }}
            className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-all", showAll ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300")}>
            Todos
          </button>
          {onExport && (
            <button onClick={onExport}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors border border-white/5 ml-2">
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5">
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap select-none",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.sortable && "cursor-pointer hover:text-zinc-300"
                  )}>
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
              {hasActions && <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">ACCIONES</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {displayed.length === 0 ? (
              <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} className="py-8 text-center text-zinc-600 text-sm">{emptyMessage}</td></tr>
            ) : displayed.map(row => (
              <tr key={row.id} className="group hover:bg-white/[0.03] transition-colors h-8">
                {columns.map(col => {
                  const val = (row as Record<string, unknown>)[col.key];
                  return (
                    <td key={col.key} className={cn(
                      "py-1 px-3 text-[13px]",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    )}>
                      {col.render ? col.render(val, row) : String(val ?? "-")}
                    </td>
                  );
                })}
                {hasActions && (
                  <td className="py-1 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onView && <button onClick={() => onView(row)} className="text-zinc-600 hover:text-blue-400 transition-colors"><Eye className="w-3.5 h-3.5" /></button>}
                      {onEdit && <button onClick={() => onEdit(row)} className="text-zinc-600 hover:text-zinc-200 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>}
                      {onDelete && <button onClick={() => onDelete(row)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-zinc-900/30">
          <span className="text-[10px] text-zinc-600">Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 hover:text-zinc-300 disabled:opacity-30">
              ‹ Ant
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 hover:text-zinc-300 disabled:opacity-30">
              Sig ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
