import * as XLSX from 'xlsx';

export interface PDFColumn {
  header: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface PDFMetaItem {
  label: string;
  value: string | number;
}

export interface PDFKpiItem {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate';
}

export interface CorporatePDFOptions {
  title: string;
  subtitle?: string;
  meta?: PDFMetaItem[];
  kpis?: PDFKpiItem[];
  columns: PDFColumn[];
  rows: Record<string, any>[];
  totalsRow?: Record<string, any>;
  orientation?: 'portrait' | 'landscape';
  footerNote?: string;
}

export const formatDateDDMMYYYY = (isoDate?: string | null): string => {
  if (!isoDate) return '';
  const clean = String(isoDate).split('T')[0].split(' ')[0].trim();
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return clean;
};

export const formatCurrencyCLP = (val: any): string => {
  const num = Number(val || 0);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CL');
};

export const exportToExcel = (
  rows: Record<string, any>[],
  filename: string,
  sheetName = 'Reporte'
): void => {
  if (!rows || rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const cleanName = filename.replace(/\.xlsx$/i, '');
  XLSX.writeFile(wb, `${cleanName}.xlsx`);
};

export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const escapeHtml = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export const exportToCorporatePDF = (options: CorporatePDFOptions): void => {
  const {
    title,
    subtitle = 'Sistema CMDS ADMIN — Gestión de Boletas de Honorarios, Evidencias y Mantenedor General',
    meta = [],
    kpis = [],
    columns,
    rows,
    totalsRow,
    orientation = columns.length >= 7 ? 'landscape' : 'portrait',
    footerNote = 'Documento Oficial Generado por CMDS ADMIN — Corporación Municipal de Desarrollo Social de Antofagasta (CMDS)'
  } = options;

  if (!rows || rows.length === 0) return;

  const printWin = window.open('', '_blank', 'width=1150,height=850');
  if (!printWin) {
    alert('Por favor habilite las ventanas emergentes (pop-ups) en su navegador para generar el documento PDF.');
    return;
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fechaEmision = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
  const logoUrl = `${window.location.origin}/logo.png`;

  const colorMap: Record<string, { bg: string; border: string; title: string; val: string }> = {
    blue: { bg: '#f0f9ff', border: '#bae6fd', title: '#0369a1', val: '#016098' },
    emerald: { bg: '#ecfdf5', border: '#a7f3d0', title: '#047857', val: '#065f46' },
    rose: { bg: '#fff1f2', border: '#fecdd3', title: '#be123c', val: '#9f1239' },
    amber: { bg: '#fffbeb', border: '#fde68a', title: '#b45309', val: '#92400e' },
    indigo: { bg: '#eef2ff', border: '#c7d2fe', title: '#4338ca', val: '#3730a3' },
    slate: { bg: '#f8fafc', border: '#cbd5e1', title: '#475569', val: '#1e293b' }
  };

  const metaHtml = [
    { label: 'Fecha Emisión', value: fechaEmision },
    { label: 'Total Registros', value: rows.length.toLocaleString('es-CL') },
    ...meta
  ]
    .map(
      (m) =>
        `<div class="meta-item"><span class="meta-label">${escapeHtml(m.label)}:</span> <span class="meta-val">${escapeHtml(
          m.value
        )}</span></div>`
    )
    .join('');

  const kpisHtml =
    kpis.length > 0
      ? `<div class="kpi-grid" style="grid-template-columns: repeat(${Math.min(kpis.length, 5)}, 1fr);">
          ${kpis
            .map((k) => {
              const c = colorMap[k.color || 'blue'] || colorMap.blue;
              return `<div class="kpi-card" style="background:${c.bg}; border-color:${c.border};">
                <div class="kpi-label" style="color:${c.title};">${escapeHtml(k.label)}</div>
                <div class="kpi-val" style="color:${c.val};">${escapeHtml(k.value)}</div>
                ${k.sub ? `<div class="kpi-sub">${escapeHtml(k.sub)}</div>` : ''}
              </div>`;
            })
            .join('')}
        </div>`
      : '';

  const theadHtml = `<tr>${columns
    .map(
      (col) =>
        `<th style="text-align:${col.align || 'left'};${col.width ? `width:${col.width};` : ''}">${escapeHtml(
          col.header
        )}</th>`
    )
    .join('')}</tr>`;

  const tbodyHtml = rows
    .map(
      (row, idx) =>
        `<tr class="${idx % 2 === 1 ? 'even-row' : ''}">${columns
          .map((col) => {
            const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
            return `<td style="text-align:${col.align || 'left'};">${escapeHtml(val)}</td>`;
          })
          .join('')}</tr>`
    )
    .join('');

  const tfootHtml = totalsRow
    ? `<tfoot><tr class="totals-row">${columns
        .map((col) => {
          const val = totalsRow[col.key] !== undefined && totalsRow[col.key] !== null ? totalsRow[col.key] : '';
          return `<td style="text-align:${col.align || 'left'};">${escapeHtml(val)}</td>`;
        })
        .join('')}</tr></tfoot>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — CMDS Antofagasta</title>
  <style>
    @page { size: A4 ${orientation}; margin: 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 9.5px; line-height: 1.38; background: #ffffff; }
    .toolbar { background: #0f172a; color: #ffffff; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 3px solid #016098; }
    .toolbar-title { font-size: 12px; font-weight: 700; color: #e2e8f0; }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn-print { background: #016098; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .btn-close { background: #334155; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .page-container { padding: 4px 12px 16px 12px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #016098; padding-bottom: 10px; margin-bottom: 12px; gap: 16px; }
    .brand-left { display: flex; align-items: center; gap: 14px; }
    .logo-box { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background: #ffffff; flex-shrink: 0; }
    .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .inst-org { font-size: 9px; font-weight: 800; color: #016098; letter-spacing: 0.5px; text-transform: uppercase; }
    .inst-dept { font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 1px; }
    .report-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 4px 0 2px 0; }
    .report-subtitle { font-size: 9.5px; color: #64748b; margin: 0; }
    .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #016098; border-radius: 6px; padding: 7px 11px; min-width: 220px; text-align: right; }
    .meta-item { font-size: 8.8px; margin-bottom: 2px; color: #334155; }
    .meta-label { font-weight: 700; color: #475569; }
    .meta-val { font-weight: 800; color: #016098; }
    .kpi-grid { display: grid; gap: 8px; margin-bottom: 12px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; }
    .kpi-label { font-size: 8px; font-weight: 800; text-transform: uppercase; }
    .kpi-val { font-size: 13px; font-weight: 800; margin-top: 2px; }
    .kpi-sub { font-size: 7.5px; color: #64748b; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; font-size: ${columns.length >= 10 ? '8px' : '8.5px'}; }
    th { background-color: #016098 !important; color: #ffffff !important; font-weight: 700; text-transform: uppercase; padding: 6px; border: 1px solid #014b78; }
    td { padding: 5px 6px; border: 1px solid #e2e8f0; color: #1e293b; }
    tr.even-row td { background-color: #f8fafc !important; }
    tr.totals-row td { background-color: #f1f5f9 !important; border-top: 2px solid #016098; font-weight: 800; }
    .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 8px; color: #64748b; }
    @media print { .no-print { display: none !important; } .page-container { padding: 0; } }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div class="toolbar-title">Vista Previa Documento PDF Corporativo — CMDS Antofagasta</div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
      <button class="btn-close" onclick="window.close()">Cerrar</button>
    </div>
  </div>
  <div class="page-container">
    <div class="header">
      <div class="brand-left">
        <div class="logo-box">
          <img src="${logoUrl}" alt="Logo CMDS" onerror="this.style.display='none'" />
        </div>
        <div>
          <div class="inst-org">Corporación Municipal de Desarrollo Social de Antofagasta</div>
          <div class="inst-dept">Dirección de Administración y Finanzas — Sistema CMDS ADMIN</div>
          <h1 class="report-title">${escapeHtml(title)}</h1>
          <p class="report-subtitle">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="meta-box">${metaHtml}</div>
    </div>
    ${kpisHtml}
    <table>
      <thead>${theadHtml}</thead>
      <tbody>${tbodyHtml}</tbody>
      ${tfootHtml}
    </table>
    <div class="footer">
      <span>${escapeHtml(footerNote)}</span>
      <span>Emitido el ${escapeHtml(fechaEmision)}</span>
    </div>
  </div>
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
};

export const exportToTextFile = downloadTextFile;
export const formatCLP = formatCurrencyCLP;

export const formatRut = (rut?: string | number | null, dv?: string | null): string => {
  if (!rut) return '—';
  const clean = String(rut).replace(/\D/g, '');
  if (!clean) return String(rut);
  const formatted = Number(clean).toLocaleString('es-CL');
  if (dv) return `${formatted}-${String(dv).toUpperCase()}`;
  return formatted;
};

export const exportToPDF = (
  title: string,
  headers: string[],
  matrixRows: any[][],
  _filename?: string
): void => {
  const columns: PDFColumn[] = headers.map((h, i) => ({
    header: h,
    key: `col_${i}`
  }));
  const rows = matrixRows.map((arr) => {
    const obj: Record<string, any> = {};
    headers.forEach((_, i) => {
      obj[`col_${i}`] = arr[i] ?? '';
    });
    return obj;
  });
  exportToCorporatePDF({ title, columns, rows });
};

