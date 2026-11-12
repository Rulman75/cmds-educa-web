import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel, exportToCorporatePDF } from '../utils/exportUtils';

export default function ProgramaPie() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'estudiantes' | 'acciones' | 'profesionales' | 'dua'>('estudiantes');
  const [estudiantesPie, setEstudiantesPie] = useState<any[]>([]);
  const [profesionalesPie, setProfesionalesPie] = useState<any[]>([]);
  const [accionesPie, setAccionesPie] = useState<any[]>([]);
  const [evaluacionesDua, setEvaluacionesDua] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showAccionModal, setShowAccionModal] = useState(false);
  const [accionForm, setAccionForm] = useState({
    grcuSec: 301,
    fecha: new Date().toISOString().slice(0, 10),
    horas: 2,
    actividades: '',
    rutProfesional: '15890123-4'
  });

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pie?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setEstudiantesPie(json.estudiantesPie || []);
        setProfesionalesPie(json.profesionalesPie || []);
        setAccionesPie(json.accionesPie || []);
        setEvaluacionesDua(json.evaluacionesDua || []);
      }
    } catch (err) {
      console.error('Error cargando PIE:', err);
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

  const handleCreateAccion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pie/acciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accionForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowAccionModal(false);
        setAccionForm({ ...accionForm, actividades: '' });
        setActiveTab('acciones');
        fetchData(esedSec);
      }
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase">
            Módulo PIE · Decreto 170 y Decreto 83 (`PIE_EST_PERSONAS` · `PIE_REGISTRO_ACCIONES_PROF`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Programa de Integración Escolar (PIE) — Registro de Apoyos, PACI y Firma OTP
          </h1>
          <p className="text-xs text-slate-500">
            Gestión de NEE Transitorias y Permanentes, Equipos de Aula, Fonoaudiología y Estrategias DUA
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(estudiantesPie, 'Nomina_Estudiantes_PIE_CMDS', 'Estudiantes PIE')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Nómina PIE (.xlsx)
          </button>
          <button
            onClick={() =>
              exportToCorporatePDF({
                title: 'Registro Normativo Programa de Integración Escolar (PIE — Decreto N° 170)',
                subtitle: 'Dirección de Educación CMDS · Subvención de Educación Especial Diferencial',
                meta: [
                  { label: 'Año Escolar', value: '2026' },
                  { label: 'Estudiantes NEE', value: String(estudiantesPie.length) }
                ],
                kpis: [
                  { label: 'Estudiantes PIE', value: String(estudiantesPie.length), color: 'amber' },
                  { label: 'Especialistas PIE', value: String(profesionalesPie.length), color: 'blue' },
                  { label: 'Apoyos Firmados OTP', value: String(accionesPie.length), color: 'emerald' }
                ],
                columns: [
                  { header: 'RBD', key: 'RBD', align: 'center' },
                  { header: 'Establecimiento', key: 'ESTABLECIMIENTO', align: 'left' },
                  { header: 'Curso', key: 'CURSO', align: 'center' },
                  { header: 'RUT', key: 'RUT_ALUMNO', align: 'center' },
                  { header: 'Estudiante', key: 'NOMBRE_ALUMNO', align: 'left' },
                  { header: 'Diagnóstico NEE (Decreto 170)', key: 'DIAGNOSTICO_NEE', align: 'left' }
                ],
                rows: estudiantesPie
              })
            }
            className="px-3 py-2 rounded-lg bg-[#39BABD] hover:bg-[#2da3a6] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Reporte PDF Decreto 170
          </button>
          <button
            onClick={() => setShowAccionModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Registrar y Firmar Apoyo PIE
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

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'estudiantes', label: `Nómina Estudiantes PIE NEE (${estudiantesPie.length})` },
          { id: 'acciones', label: `Registro de Apoyos y Firma OTP (${accionesPie.length})` },
          { id: 'profesionales', label: `Dotación Especialistas PIE (${profesionalesPie.length})` },
          { id: 'dua', label: `Evaluación Estrategias DUA / PACI (${evaluacionesDua.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === t.id
                ? 'bg-[#016098] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-xs text-slate-500 border border-slate-200">
          Consultando registros PIE en PostgreSQL 18 (`bd_cmds_educa`)...
        </div>
      ) : activeTab === 'estudiantes' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">RBD / Establecimiento</th>
                <th className="py-2.5 px-3 text-center">Curso</th>
                <th className="py-2.5 px-3">RUT Estudiante</th>
                <th className="py-2.5 px-3">Nombre Estudiante</th>
                <th className="py-2.5 px-3">Diagnóstico NEE (Decreto 170)</th>
                <th className="py-2.5 px-3 text-center">Previsión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {estudiantesPie.map((e, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{e.ETPE_SEC_ID}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">RBD {e.RBD}</span>
                    <span className="block font-semibold text-slate-800">{e.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#016098] font-bold">
                      {e.CURSO}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{e.RUT_ALUMNO}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{e.NOMBRE_ALUMNO}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                      {e.DIAGNOSTICO_NEE}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                    {e.FIAL_TRAMO_FONASA}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'acciones' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Folio / Fecha</th>
                <th className="py-2.5 px-3">Establecimiento / Curso</th>
                <th className="py-2.5 px-3">Actividad de Apoyo y Co-docencia Realizada</th>
                <th className="py-2.5 px-3 text-center">Horas</th>
                <th className="py-2.5 px-3">Especialista</th>
                <th className="py-2.5 px-3 text-center">Firma Token OTP PIE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {accionesPie.map((a) => (
                <tr key={a.REAP_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">#{a.REAP_SEC}</span>
                    <span className="block text-[10px] text-slate-500">{a.FECHA}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#016098] font-bold mr-1">
                      {a.CURSO}
                    </span>
                    <span className="font-semibold text-slate-800">{a.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{a.REAP_ACTIVIDADES}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{a.REAP_HORAS} hrs</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{a.REAP_USER_ING}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-mono font-bold text-[#016098] block">{a.TOKEN_OTP}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {a.TRAP_ESTADO_TOKEN}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'profesionales' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Establecimiento</th>
                <th className="py-2.5 px-3">RUT</th>
                <th className="py-2.5 px-3">Profesional Especialista</th>
                <th className="py-2.5 px-3">Especialidad Decreto 170</th>
                <th className="py-2.5 px-3">Nivel Atención</th>
                <th className="py-2.5 px-3">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {profesionalesPie.map((p) => (
                <tr key={p.PRPI_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{p.PRPI_SEC}</td>
                  <td className="py-2.5 px-3 font-semibold">{p.ESTABLECIMIENTO}</td>
                  <td className="py-2.5 px-3 font-mono">{p.RUT_PROFESIONAL}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{p.NOMBRE_PROFESIONAL}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#016098] font-bold">
                      {p.ESPECIALIDAD}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{p.PRPI_NIVEL}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-600">{p.PRPI_MAIL}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Curso / Establecimiento</th>
                <th className="py-2.5 px-3">Período</th>
                <th className="py-2.5 px-3">Estrategia DUA / Adecuación PACI Aplicada</th>
                <th className="py-2.5 px-3">Evaluación de Impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evaluacionesDua.map((ev) => (
                <tr key={ev.AEES_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-[#016098]">{ev.CURSO}</span>
                    <span className="block text-[10px] text-slate-500">{ev.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold">{ev.AEES_PERIODOS}</td>
                  <td className="py-2.5 px-3 text-slate-700">{ev.AEES_ACCIONES}</td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-700">{ev.AEES_EVALUACION}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registrar Apoyo PIE */}
      {showAccionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#016098] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Registrar Apoyo PIE y Firmar con Token OTP</h3>
              <button onClick={() => setShowAccionModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAccion} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Intervención</label>
                  <input
                    type="date"
                    value={accionForm.fecha}
                    onChange={(e) => setAccionForm({ ...accionForm, fecha: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horas de Apoyo</label>
                  <input
                    type="number"
                    value={accionForm.horas}
                    onChange={(e) => setAccionForm({ ...accionForm, horas: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción de Actividades (Aula de Recursos / Co-docencia DUA)
                </label>
                <textarea
                  rows={3}
                  value={accionForm.actividades}
                  onChange={(e) => setAccionForm({ ...accionForm, actividades: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Detalle las estrategias pedagógicas o fonoaudiológicas..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAccionModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Firmar con Token OTP PIE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
