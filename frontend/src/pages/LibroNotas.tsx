import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel, exportToCorporatePDF } from '../utils/exportUtils';

export default function LibroNotas() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/libro/notas?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setNotas(json.notas || []);
      }
    } catch (err) {
      console.error('Error cargando Calificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [esedSec]);

  useEffect(() => {
    fetchData(esedSec);
  }, [esedSec, fetchData]);

  useEffect(() => {
    const handler = (ev: any) => {
      setEsedSec(Number(ev.detail || 1));
    };
    window.addEventListener('educa-estab-changed', handler);
    return () => window.removeEventListener('educa-estab-changed', handler);
  }, []);

  const handleSaveNotas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    try {
      const res = await fetch('/api/libro/notas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuasSec: editingRow.CUAS_SEC,
          fialSec: editingRow.FIAL_SEC,
          n1: editingRow.NACU_NOTA_1,
          n2: editingRow.NACU_NOTA_2,
          n3: editingRow.NACU_NOTA_3,
          n4: editingRow.NACU_NOTA_4,
          n5: editingRow.NACU_NOTA_5,
          n6: editingRow.NACU_NOTA_6
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setEditingRow(null);
        fetchData(esedSec);
      }
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#39BABD]/15 text-[#0f766e] uppercase">
            Libro de Clases Digital · Calificaciones (`EDC_NOTAS_ASIG_CURSO` · `EDC_PROMEDIO_FINAL_ASIG`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Sábana de Calificaciones Parciales, Concentración Anual y Actas MINEDUC
          </h1>
          <p className="text-xs text-slate-500">
            Escala reglamentaria 1.0 a 7.0 (Decreto N° 67 MINEDUC) con cálculo automático de promedios
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(notas, 'Sabana_Calificaciones_PADEDUCA', 'Calificaciones')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Sábana (.xlsx)
          </button>
          <button
            onClick={() =>
              exportToCorporatePDF({
                title: 'Acta de Concentración de Calificaciones — Libro de Clases Digital',
                subtitle: 'Dirección de Educación CMDS · Decreto de Evaluación N° 67 MINEDUC',
                meta: [
                  { label: 'Período Académico', value: 'Año Escolar 2026 (2° Semestre)' },
                  { label: 'Total Registros', value: String(notas.length) }
                ],
                kpis: [
                  { label: 'Evaluaciones Procesadas', value: String(notas.length), color: 'blue' },
                  { label: 'Escala Oficial', value: '1.0 a 7.0 (4.0 Aprob.)', color: 'emerald' }
                ],
                columns: [
                  { header: 'Curso', key: 'CURSO', align: 'center' },
                  { header: 'Asignatura', key: 'ASIGNATURA', align: 'left' },
                  { header: 'RUT', key: 'RUT_ALUMNO', align: 'center' },
                  { header: 'Estudiante', key: 'NOMBRE_ALUMNO', align: 'left' },
                  { header: 'N1', key: 'NACU_NOTA_1', align: 'center' },
                  { header: 'N2', key: 'NACU_NOTA_2', align: 'center' },
                  { header: 'N3', key: 'NACU_NOTA_3', align: 'center' },
                  { header: 'N4', key: 'NACU_NOTA_4', align: 'center' },
                  { header: 'N5', key: 'NACU_NOTA_5', align: 'center' },
                  { header: 'N6', key: 'NACU_NOTA_6', align: 'center' },
                  { header: 'Prom. Final', key: 'NACU_PROM_FINAL', align: 'center' }
                ],
                rows: notas
              })
            }
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Informe Concentración PDF
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 font-extrabold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-xs text-slate-500 border border-slate-200">
          Consultando calificaciones en PostgreSQL 18 (`bd_cmds_educa`)...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Curso / Asignatura</th>
                <th className="py-2.5 px-3 text-center">Lista</th>
                <th className="py-2.5 px-3">Estudiante</th>
                <th className="py-2.5 px-2 text-center">N1</th>
                <th className="py-2.5 px-2 text-center">N2</th>
                <th className="py-2.5 px-2 text-center">N3</th>
                <th className="py-2.5 px-2 text-center">N4</th>
                <th className="py-2.5 px-2 text-center">N5</th>
                <th className="py-2.5 px-2 text-center">N6</th>
                <th className="py-2.5 px-3 text-center">Prom. Final</th>
                <th className="py-2.5 px-3 text-center">Situación</th>
                <th className="py-2.5 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {notas.map((n, idx) => {
                const pf = parseFloat(n.NACU_PROM_FINAL || '0');
                return (
                  <tr key={idx} className="hover:bg-blue-50/40">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-[#016098] font-bold mr-1">
                        {n.CURSO}
                      </span>
                      <span className="font-bold text-slate-800">{n.ASIGNATURA}</span>
                      <span className="block text-[10px] text-slate-500">{n.ESTABLECIMIENTO}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">#{n.NACU_NRO_LISTA}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800">{n.NOMBRE_ALUMNO}</span>
                      <span className="block font-mono text-[10px] text-slate-500">{n.RUT_ALUMNO}</span>
                    </td>
                    {[n.NACU_NOTA_1, n.NACU_NOTA_2, n.NACU_NOTA_3, n.NACU_NOTA_4, n.NACU_NOTA_5, n.NACU_NOTA_6].map(
                      (val, i) => (
                        <td
                          key={i}
                          className={`py-2.5 px-2 text-center font-mono font-bold ${
                            parseFloat(val) < 4.0 ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {val}
                        </td>
                      )
                    )}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-mono font-extrabold ${
                          pf >= 4.0 ? 'bg-blue-100 text-[#016098]' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {n.NACU_PROM_FINAL}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pf >= 4.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pf >= 4.0 ? 'APROBADO' : 'EN RIESGO'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setEditingRow({ ...n })}
                        className="px-2.5 py-1 rounded bg-[#016098] hover:bg-[#024a8d] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Editar Notas
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Editar Calificaciones */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#016098] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">
                Modificar Calificaciones — {editingRow.NOMBRE_ALUMNO}
              </h3>
              <button onClick={() => setEditingRow(null)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNotas} className="p-5 space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-700">
                {editingRow.CURSO} · {editingRow.ASIGNATURA}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const key = `NACU_NOTA_${num}`;
                  return (
                    <div key={num}>
                      <label className="block font-bold text-slate-700 mb-1">Nota N{num}</label>
                      <input
                        type="text"
                        value={editingRow[key] || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-center"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Recalcular Promedio y Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
