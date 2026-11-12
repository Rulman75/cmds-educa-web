import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel } from '../utils/exportUtils';

export default function LibroLeccionario() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'leccionario' | 'parvularia' | 'anotaciones' | 'atrasos'>('leccionario');
  const [leccionarios, setLeccionarios] = useState<any[]>([]);
  const [parvularia, setParvularia] = useState<any[]>([]);
  const [anotaciones, setAnotaciones] = useState<any[]>([]);
  const [atrasos, setAtrasos] = useState<any[]>([]);
  const [salidas, setSalidas] = useState<any[]>([]);
  const [citaciones, setCitaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showLeccModal, setShowLeccModal] = useState(false);
  const [leccForm, setLeccForm] = useState({
    cuasSec: 401,
    fecha: new Date().toISOString().slice(0, 10),
    objetivo: 'OA 08: Formular una interpretación de textos literarios y argumentativos.',
    texto: '',
    horas: 2,
    esPie: 'N'
  });

  const [showAnotModal, setShowAnotModal] = useState(false);
  const [anotForm, setAnotForm] = useState({
    grcuSec: 301,
    fialSec: 5001,
    tipoObs: 'POSITIVA',
    observacion: ''
  });

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/libro/leccionario?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setLeccionarios(json.leccionarios || []);
        setParvularia(json.parvularia || []);
        setAnotaciones(json.anotaciones || []);
        setAtrasos(json.atrasos || []);
        setSalidas(json.salidas || []);
        setCitaciones(json.citaciones || []);
      }
    } catch (err) {
      console.error('Error cargando Leccionario:', err);
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

  const handleCreateLeccionario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/libro/leccionario/clases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leccForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowLeccModal(false);
        setLeccForm({ ...leccForm, texto: '' });
        fetchData(esedSec);
      }
    } catch {}
  };

  const handleCreateAnotacion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/libro/leccionario/anotaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anotForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowAnotModal(false);
        setAnotForm({ ...anotForm, observacion: '' });
        setActiveTab('anotaciones');
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
            Libro de Clases Digital · Leccionario y Convivencia (`EDC_LECCIONARIO_CLASES` · `EDC_OBSERVACION_ALUM`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Registro de Contenidos OA, Educación Parvularia, Hoja de Vida y Control de Atrasos
          </h1>
          <p className="text-xs text-slate-500">
            Registro curricular diario con Firma Digital OTP (`EDC_TOKEN_LECCIONARIO`) y bitácora conductual
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(leccionarios, 'Leccionario_Libro_Digital_CMDS', 'Leccionario')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Leccionario (.xlsx)
          </button>
          <button
            onClick={() => setShowAnotModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#EB567F] hover:bg-[#d6416a] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Registrar Anotación
          </button>
          <button
            onClick={() => setShowLeccModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Registrar y Firmar Leccionario
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
          { id: 'leccionario', label: `Leccionario de Clases y Firma OTP (${leccionarios.length})` },
          { id: 'parvularia', label: `Educación Parvularia NT1/NT2 (${parvularia.length})` },
          { id: 'anotaciones', label: `Hoja de Vida / Anotaciones (${anotaciones.length})` },
          {
            id: 'atrasos',
            label: `Atrasos, Retiros y Citación Apoderados (${atrasos.length + salidas.length + citaciones.length})`
          }
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
          Consultando leccionarios y registros de convivencia desde PostgreSQL 18...
        </div>
      ) : activeTab === 'leccionario' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Folio / Fecha</th>
                <th className="py-2.5 px-3">Curso / Asignatura</th>
                <th className="py-2.5 px-3">Objetivo de Aprendizaje (OA MINEDUC)</th>
                <th className="py-2.5 px-3">Actividad y Contenido Desarrollado</th>
                <th className="py-2.5 px-3 text-center">Hrs / PIE</th>
                <th className="py-2.5 px-3 text-center">Firma Token OTP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leccionarios.map((l) => (
                <tr key={l.LEAS_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">#{l.LEAS_SEC}</span>
                    <span className="block text-[10px] text-slate-500">{l.FECHA}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#016098] font-bold mr-1">
                      {l.CURSO}
                    </span>
                    <span className="font-bold text-slate-800">{l.ASIGNATURA}</span>
                    <span className="block text-[10px] text-slate-500">{l.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-xs">{l.LEAS_OBJETIVO}</td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-md">{l.LEAS_TEXTO}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-bold">{l.LEAS_HORAS} hrs</span>
                    {l.LEAS_ES_LECC_PIE === 'S' && (
                      <span className="block mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        CO-DOCENCIA PIE
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-mono font-bold text-[#016098] block">{l.TOKEN_OTP || 'OTP-VERIF'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {l.TOLC_ESTADO_TOKEN || 'FIRMADO OTP'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'parvularia' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Fecha / Nivel</th>
                <th className="py-2.5 px-3">Núcleo de Aprendizaje BCEP</th>
                <th className="py-2.5 px-3">Objetivo de Aprendizaje (OA)</th>
                <th className="py-2.5 px-3">Experiencia de Aprendizaje</th>
                <th className="py-2.5 px-3">Instrumento y Logro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parvularia.map((p) => (
                <tr key={p.LEPA_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">{p.FECHA}</span>
                    <span className="block font-bold text-slate-800">{p.CURSO}</span>
                    <span className="block text-[10px] text-slate-500">{p.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{p.LEPA_NUCLEO}</td>
                  <td className="py-2.5 px-3 text-slate-700">{p.LEPA_OBJETIVO}</td>
                  <td className="py-2.5 px-3 text-slate-700">{p.LEPA_EXPERIENCIA}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-700 block">{p.LEPA_INSTRUMENTO}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {p.LEPA_EVALU_SUMATIVA}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'anotaciones' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Folio / Fecha</th>
                <th className="py-2.5 px-3">Estudiante / Curso</th>
                <th className="py-2.5 px-3 text-center">Tipo Observación</th>
                <th className="py-2.5 px-3">Detalle en Hoja de Vida (`EDC_OBSERVACION_ALUM`)</th>
                <th className="py-2.5 px-3">Registrado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {anotaciones.map((a) => (
                <tr key={a.OBAL_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">#{a.OBAL_SEC}</span>
                    <span className="block text-[10px] text-slate-500">{a.FECHA}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{a.NOMBRE_ALUMNO}</span>
                    <span className="block text-[10px] text-slate-500">
                      {a.CURSO} · {a.ESTABLECIMIENTO}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        a.OBAL_TIPO_OBS === 'POSITIVA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.OBAL_TIPO_OBS === 'NEGATIVA'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {a.OBAL_TIPO_OBS}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{a.OBAL_OBSERVACION}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{a.OBAL_USER_ING}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-extrabold text-[#016098] uppercase mb-2">
              Control de Atrasos (`EDC_CTRL_ATRASOS_ALUMNOS`)
            </h3>
            <div className="space-y-2 text-xs">
              {atrasos.map((at) => (
                <div key={at.ATAL_SEC} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {at.NOMBRE_ALUMNO} ({at.CURSO})
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold">
                    {at.FECHA} · Hora llegada: {at.ATAL_HORA_ATRASO} (Bloque #{at.ATAL_NRO_BLOQUE})
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">{at.ATAL_OBSERVACION}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-extrabold text-emerald-700 uppercase mb-2">
              Registro de Retiros / Salidas (`EDC_CTRL_HORARIO_SALIDA`)
            </h3>
            <div className="space-y-2 text-xs">
              {salidas.map((s) => (
                <div key={s.CTHS_SEC} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {s.NOMBRE_ALUMNO} ({s.CURSO})
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    Motivo: {s.CTHS_TIPO_SALIDA}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Retira: {s.PERSONA_RETIRA} (RUT {s.RUT_RETIRA})
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-extrabold text-[#EB567F] uppercase mb-2">
              Citaciones de Apoderados (`EDC_CITACIONES_APODERADOS`)
            </h3>
            <div className="space-y-2 text-xs">
              {citaciones.map((c) => (
                <div key={c.CIAP_SEC} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {c.NOMBRE_ALUMNO} ({c.CURSO})
                  </div>
                  <div className="text-[11px] text-[#EB567F] font-semibold">
                    Cita: {c.FECHA_CITACION} a las {c.CIAP_HORA_CITACION} hrs ({c.CIAP_TIPO_DOCENTE})
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">{c.CIAP_TEXTO}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Leccionario */}
      {showLeccModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#016098] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">
                Registrar Leccionario y Firmar con Token OTP (`EDC_LECCIONARIO_CLASES`)
              </h3>
              <button onClick={() => setShowLeccModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLeccionario} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Objetivo de Aprendizaje (OA MINEDUC)</label>
                <input
                  type="text"
                  value={leccForm.objetivo}
                  onChange={(e) => setLeccForm({ ...leccForm, objetivo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Actividad y Contenido Desarrollado en Aula</label>
                <textarea
                  rows={3}
                  value={leccForm.texto}
                  onChange={(e) => setLeccForm({ ...leccForm, texto: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Describa las actividades pedagógicas realizadas en el bloque..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horas Pedagógicas</label>
                  <input
                    type="number"
                    value={leccForm.horas}
                    onChange={(e) => setLeccForm({ ...leccForm, horas: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Co-docencia PIE</label>
                  <select
                    value={leccForm.esPie}
                    onChange={(e) => setLeccForm({ ...leccForm, esPie: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="N">NO (Aula Regular)</option>
                    <option value="S">SÍ (Con Apoyo Especialista PIE)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLeccModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Guardar y Firmar con Token OTP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Anotación */}
      {showAnotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#EB567F] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Registrar Anotación en Hoja de Vida (`EDC_OBSERVACION_ALUM`)</h3>
              <button onClick={() => setShowAnotModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAnotacion} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Observación</label>
                <select
                  value={anotForm.tipoObs}
                  onChange={(e) => setAnotForm({ ...anotForm, tipoObs: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="POSITIVA">POSITIVA (Destaca mérito académico o valórico)</option>
                  <option value="FORMATIVA">FORMATIVA / SEGUIMIENTO PEDAGÓGICO</option>
                  <option value="NEGATIVA">NEGATIVA (Incumplimiento Reglamento Interno)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Detalle de la Observación</label>
                <textarea
                  rows={3}
                  value={anotForm.observacion}
                  onChange={(e) => setAnotForm({ ...anotForm, observacion: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Ingrese el registro objetivo para la hoja de vida del estudiante..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAnotModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#EB567F] text-white font-bold cursor-pointer"
                >
                  Guardar Anotación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
