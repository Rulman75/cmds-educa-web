import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel } from '../utils/exportUtils';

export default function ProfesoresDocentes() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'profesores' | 'evaluacion' | 'documentos'>('profesores');
  const [profesores, setProfesores] = useState<any[]>([]);
  const [evaluacionesAula, setEvaluacionesAula] = useState<any[]>([]);
  const [carpetasFuncionarios, setCarpetasFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalForm, setEvalForm] = useState({
    profSec: 501,
    plevSec: 1,
    fecha: new Date().toISOString().slice(0, 10),
    observacion: ''
  });

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profesores?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setProfesores(json.profesores || []);
        setEvaluacionesAula(json.evaluacionesAula || []);
        setCarpetasFuncionarios(json.carpetasFuncionarios || []);
      }
    } catch (err) {
      console.error('Error cargando Profesores:', err);
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

  const handleCreateEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/profesores/evaluacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowEvalModal(false);
        setEvalForm({ ...evalForm, observacion: '' });
        setActiveTab('evaluacion');
        fetchData(esedSec);
      }
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 uppercase">
            Módulo Docentes (`EDC_FICHA_PROFESORES` · `EDC_EVALUACION_PROF` · `EDC_ADM_DOCTO_X_FUNC`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Dotación Docente, Idoneidad, Acompañamiento en Aula y Carpeta Digital
          </h1>
          <p className="text-xs text-slate-500">
            Formación académica universitaria, observación pedagógica MBE y control de inhabilidades
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(profesores, 'Dotacion_Docente_PADEDUCA', 'Profesores')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Dotación (.xlsx)
          </button>
          <button
            onClick={() => setShowEvalModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Registrar Acompañamiento en Aula
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
          { id: 'profesores', label: `Ficha Docente e Idoneidad (${profesores.length})` },
          { id: 'evaluacion', label: `Acompañamiento Pedagógico en Aula (${evaluacionesAula.length})` },
          { id: 'documentos', label: `Carpeta Digital e Inhabilidades (${carpetasFuncionarios.length})` }
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
          Consultando dotación docente en PostgreSQL 18 (`bd_cmds_educa`)...
        </div>
      ) : activeTab === 'profesores' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">RBD / Establecimiento</th>
                <th className="py-2.5 px-3">RUT Docente</th>
                <th className="py-2.5 px-3">Nombre Docente</th>
                <th className="py-2.5 px-3">Título Profesional y Universidad</th>
                <th className="py-2.5 px-3 text-center">Idoneidad / Carrera</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {profesores.map((p) => (
                <tr key={p.PROF_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{p.PROF_SEC}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">RBD {p.RBD}</span>
                    <span className="block font-semibold text-slate-800">{p.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{p.RUT_DOCENTE}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{p.NOMBRE_DOCENTE}</span>
                    <span className="block text-[10px] text-slate-500">{p.PROF_EMAIL}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{p.TITULO_PROFESIONAL}</span>
                    <span className="block text-[10px] text-slate-500">
                      {p.UNIVERSIDAD} ({p.FAPR_ANNO_FORMA_ACAD})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {p.FAPR_IDONEIDAD_DOCENTE}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'evaluacion' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Folio / Fecha</th>
                <th className="py-2.5 px-3">Docente Observado</th>
                <th className="py-2.5 px-3">Pauta de Evaluación (`EDC_PLAN_EVALUACION`)</th>
                <th className="py-2.5 px-3">Síntesis y Retroalimentación Pedagógica</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evaluacionesAula.map((ev) => (
                <tr key={ev.EVIN_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">#{ev.EVIN_SEC}</span>
                    <span className="block text-[10px] text-slate-500">{ev.FECHA_OBSERVACION}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{ev.NOMBRE_DOCENTE}</span>
                    <span className="block text-[10px] text-slate-500">{ev.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#016098]">{ev.PAUTA_EVALUACION}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{ev.RESULTADO_OBSERVACION}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {ev.EVPR_ESTADO}
                    </span>
                  </td>
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
                <th className="py-2.5 px-3">ID Docto</th>
                <th className="py-2.5 px-3">Funcionario / RUT</th>
                <th className="py-2.5 px-3">Cargo y Modalidad Estatuto Docente</th>
                <th className="py-2.5 px-3">Archivo Digitalizado (`EDC_ADM_DOCTO_X_FUNC`)</th>
                <th className="py-2.5 px-3 text-center">Vigencia</th>
                <th className="py-2.5 px-3 text-center">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carpetasFuncionarios.map((d) => (
                <tr key={d.ADXF_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{d.ADXF_SEC}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{d.FUNCIONARIO}</span>
                    <span className="block font-mono text-[10px] text-slate-500">{d.RUT_FUNCIONARIO}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-800">{d.CARGO}</span>
                    <span className="block text-[10px] text-slate-500">{d.AFUN_TIPO_CONTRATO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">
                    {d.ARCHIVO_DOCUMENTO} ({d.TAMANO_KB} KB)
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">{d.VIGENCIA_HASTA}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {d.ESTADO_VALIDACION}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registrar Acompañamiento */}
      {showEvalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#016098] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Registrar Acompañamiento Pedagógico en Aula</h3>
              <button onClick={() => setShowEvalModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEvaluacion} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Docente Observado</label>
                <select
                  value={evalForm.profSec}
                  onChange={(e) => setEvalForm({ ...evalForm, profSec: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  {profesores.map((p) => (
                    <option key={p.PROF_SEC} value={p.PROF_SEC}>
                      {p.NOMBRE_DOCENTE} ({p.ESTABLECIMIENTO})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Síntesis de Observación MBE y Retroalimentación UTP
                </label>
                <textarea
                  rows={3}
                  value={evalForm.observacion}
                  onChange={(e) => setEvalForm({ ...evalForm, observacion: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Ej: DESTACADO (94%): Estructura de clase clara, preguntas de alta demanda cognitiva..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEvalModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Guardar Evaluación Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
