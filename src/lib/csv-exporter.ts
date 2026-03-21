export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val instanceof Date) return val.toLocaleDateString('es-AR');
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return String(val ?? '');
    }).join(',')
  );
  return [headers, ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
