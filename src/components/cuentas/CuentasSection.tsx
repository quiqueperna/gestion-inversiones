"use client";
import { useState } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Cuenta } from "@/lib/data-loader";

interface CuentasSectionProps {
  cuentas: Cuenta[];
  onAdd: (nombre: string, descripcion?: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onEdit: (id: number, nombre: string, descripcion?: string) => Promise<void>;
}

export default function CuentasSection({ cuentas, onAdd, onRemove, onEdit }: CuentasSectionProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");

  const handleAdd = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    await onAdd(nombre.trim(), descripcion.trim() || undefined);
    setNombre("");
    setDescripcion("");
    setSaving(false);
  };

  const startEdit = (c: Cuenta) => {
    setEditingId(c.id);
    setEditNombre(c.nombre);
    setEditDescripcion(c.descripcion || "");
  };

  const confirmEdit = async () => {
    if (!editNombre.trim() || editingId === null) return;
    await onEdit(editingId, editNombre.trim(), editDescripcion.trim() || undefined);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 rounded-[8px] border border-white/10 overflow-hidden">
        <div className="p-3 bg-zinc-900 border-b border-white/10">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Gestión de Cuentas</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Nombre</th>
              <th className="py-2 px-4">Descripción</th>
              <th className="py-2 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[13px]">
            {cuentas.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.03] transition-colors h-9">
                <td className="py-1 px-4 text-zinc-600 text-[11px]">#{c.id}</td>
                <td className="py-1 px-4 font-bold text-zinc-200">
                  {editingId === c.id
                    ? <input value={editNombre} onChange={e => setEditNombre(e.target.value)} autoFocus
                        className="w-full px-2 py-0.5 bg-zinc-950 border border-blue-500/50 rounded text-[13px] outline-none" />
                    : c.nombre}
                </td>
                <td className="py-1 px-4 text-zinc-500">
                  {editingId === c.id
                    ? <input value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)}
                        placeholder="Descripción opcional"
                        className="w-full px-2 py-0.5 bg-zinc-950 border border-white/10 rounded text-[13px] outline-none focus:border-blue-500/50" />
                    : (c.descripcion || "—")}
                </td>
                <td className="py-1 px-4 text-right">
                  {editingId === c.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={confirmEdit} className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(c)} className="p-1 text-zinc-600 hover:text-blue-400 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onRemove(c.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-zinc-900/50 rounded-[8px] border border-white/10 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Agregar Cuenta</p>
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre (ej: Europa)"
            className="flex-1 px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[13px] focus:border-blue-500 outline-none transition-all"
          />
          <input
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción opcional"
            className="flex-1 px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[13px] focus:border-blue-500 outline-none transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !nombre.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-[6px] text-[11px] font-bold uppercase tracking-widest transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
