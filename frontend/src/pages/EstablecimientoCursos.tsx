import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel } from '../utils/exportUtils';

export default function EstablecimientoCursos() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'cursos' | 'asignaturas' | 'horarios' | 'rbds'>('cursos');
  const [cursos, setCursos] = useState<any[]>([]);
  const [planAsignaturas, setPlanAsignaturas] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [catalogos, setCatalogos] = useState<any>({ tiposEnsenanza: [], asignaturas: [], profesores: [] });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showNewCursoModal, setShowNewCursoModal] = useState(false);
  const [cursoForm, setCursoForm] = useState({
    esedSec: 7,
    tienCod: '310',
    grteCod: '1M',
    letra: 'C',
    jornada: 'JORNADA COMPLETA',
    profSec: 501,
    vacantes: 40
  });

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/establecimiento-cursos?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setCursos(json.cursos || []);
        setPlanAsignaturas(json.planAsignaturas || []);
        setHorarios(json.horarios || []);
        setEstablecimientos(json.establecimientos || []);
        setCatalogos(json.catalogos || { tiposEnsenanza: [], asignaturas: [], profesores: [] });
      }
    } catch (err) {
      console.error('Error cargando Establecimiento y Cursos:', err);
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

  const handleCreateCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/establecimiento-cursos/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cursoForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowNewCursoModal(false);
        fetchData(esedSec);
      }
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#016098]/10 text-[#016098] uppercase">
            Módulo Establecimiento (`EDC_ESTAB_EDUCA` · `EDC_GRADOS_CURSOS`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Administración de Cursos, Plan de Estudio, Horarios y 52 RBDs CMDS
          </h1>
          <p className="text-xs text-slate-500">
            Configuración académica anual sincronizada con SIGE MINEDUC sobre PostgreSQL 18 (`bd_cmds_educa`)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(establecimientos, 'Directorio_52_Establecimientos_CMDS', 'RBDs CMDS')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar 52 RBDs (.xlsx)
          </button>
          <button
            onClick={() => setShowNewCursoModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Nuevo Curso 2026
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
          { id: 'cursos', label: `Cursos Vigentes (${cursos.length})` },
          { id: 'asignaturas', label: `Plan de Estudio y Asignaturas (${planAsignaturas.length})` },
          { id: 'horarios', label: `Horario Semanal de Bloques (${horarios.length})` },
          { id: 'rbds', label: `Directorio Comunal 52 Establecimientos CMDS (${establecimientos.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === t.id
                ? 'bg-[#016098] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-xs text-slate-500 border border-slate-200">
          Cargando estructura académica desde PostgreSQL 18...
        </div>
      ) : activeTab === 'cursos' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">RBD / Establecimiento</th>
                <th className="py-2.5 px-3">Nivel Enseñanza</th>
                <th className="py-2.5 px-3 text-center">Curso</th>
                <th className="py-2.5 px-3">Jornada</th>
                <th className="py-2.5 px-3">Profesor Jefe</th>
                <th className="py-2.5 px-3 text-center">Matrícula / Cupo</th>
                <th className="py-2.5 px-3 text-center">Estado SIGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cursos.map((c) => (
                <tr key={c.GRCU_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{c.GRCU_SEC}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-700">RBD {c.RBD}</span>
                    <span className="block font-semibold text-slate-900">{c.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    [{c.TIEN_COD}] {c.TIPO_ENSENANZA}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded bg-blue-100 text-[#016098] font-extrabold">
                      {c.CURSO_NOMBRE}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{c.GRCU_JORNADA}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{c.PROFESOR_JEFE}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {c.MATRICULA_ACTUAL} / {c.GRCU_CNT_VACANTES}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {c.GRCU_ESTADO_SIGE}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'asignaturas' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Cód.</th>
                <th className="py-2.5 px-3">Establecimiento</th>
                <th className="py-2.5 px-3 text-center">Curso</th>
                <th className="py-2.5 px-3">Asignatura Oficial MINEDUC</th>
                <th className="py-2.5 px-3">Docente Titular</th>
                <th className="py-2.5 px-3 text-center">Hrs/Sem</th>
                <th className="py-2.5 px-3 text-center">Escala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {planAsignaturas.map((pa) => (
                <tr key={pa.CUAS_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{pa.CUAS_SEC}</td>
                  <td className="py-2.5 px-3 font-medium">{pa.ESTABLECIMIENTO}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-[#016098]">{pa.CURSO_NOMBRE}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    [{pa.ASIG_COD}] {pa.ASIG_DESCRIPCION}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{pa.DOCENTE_TITULAR}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{pa.CUAS_HORAS_ASIG} hrs</td>
                  <td className="py-2.5 px-3 text-center text-[11px]">{pa.CUAS_TIPO_CALIF}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'horarios' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Curso</th>
                <th className="py-2.5 px-3 text-center">Bloque</th>
                <th className="py-2.5 px-3">Lunes</th>
                <th className="py-2.5 px-3">Martes</th>
                <th className="py-2.5 px-3">Miércoles</th>
                <th className="py-2.5 px-3">Jueves</th>
                <th className="py-2.5 px-3">Viernes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {horarios.map((h, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-[#016098]">{h.CURSO_NOMBRE}</span>
                    <span className="block text-[10px] text-slate-500">{h.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-extrabold text-slate-700">
                    Bloque #{h.HOCU_BLOQUE}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{h.HOCU_ASIG_LU}</td>
                  <td className="py-2.5 px-3 font-medium">{h.HOCU_ASIG_MA}</td>
                  <td className="py-2.5 px-3 font-medium">{h.HOCU_ASIG_MI}</td>
                  <td className="py-2.5 px-3 font-medium">{h.HOCU_ASIG_JU}</td>
                  <td className="py-2.5 px-3 font-medium">{h.HOCU_ASIG_VI}</td>
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
                <th className="py-2.5 px-3">ESED_SEC</th>
                <th className="py-2.5 px-3">RBD MINEDUC</th>
                <th className="py-2.5 px-3">Establecimiento Educacional CMDS</th>
                <th className="py-2.5 px-3">Dirección</th>
                <th className="py-2.5 px-3">Correo Institucional</th>
                <th className="py-2.5 px-3 text-center">% IVE</th>
                <th className="py-2.5 px-3 text-center">Libro Digital</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {establecimientos.map((e) => (
                <tr key={e.ESED_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2 px-3 font-mono text-slate-500">#{e.ESED_SEC}</td>
                  <td className="py-2 px-3 font-mono font-extrabold text-[#016098]">{e.ESED_COD}</td>
                  <td className="py-2 px-3 font-bold text-slate-800">{e.ESED_DESCRIPCION}</td>
                  <td className="py-2 px-3 text-slate-600">{e.ESED_DIRECCION}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{e.ESED_EMAIL}</td>
                  <td className="py-2 px-3 text-center font-bold text-amber-700">{e.ESED_PORCENTAJE_IVE}%</td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ACTIVO CIRCULAR N° 30
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nuevo Curso */}
      {showNewCursoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#016098] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Crear Nuevo Curso Escolar 2026 (`EDC_GRADOS_CURSOS`)</h3>
              <button onClick={() => setShowNewCursoModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCurso} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Establecimiento (RBD)</label>
                <select
                  value={cursoForm.esedSec}
                  onChange={(e) => setCursoForm({ ...cursoForm, esedSec: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  {establecimientos.map((e) => (
                    <option key={e.ESED_SEC} value={e.ESED_SEC}>
                      {e.ESED_COD} - {e.ESED_DESCRIPCION}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grado (Ej: 1M, 8B, NT2)</label>
                  <input
                    type="text"
                    value={cursoForm.grteCod}
                    onChange={(e) => setCursoForm({ ...cursoForm, grteCod: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Letra Curso</label>
                  <input
                    type="text"
                    value={cursoForm.letra}
                    onChange={(e) => setCursoForm({ ...cursoForm, letra: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vacantes SAE</label>
                  <input
                    type="number"
                    value={cursoForm.vacantes}
                    onChange={(e) => setCursoForm({ ...cursoForm, vacantes: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profesor Jefe</label>
                  <select
                    value={cursoForm.profSec}
                    onChange={(e) => setCursoForm({ ...cursoForm, profSec: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    {catalogos.profesores.map((p: any) => (
                      <option key={p.PROF_SEC} value={p.PROF_SEC}>
                        {p.NOMBRE_DOCENTE}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewCursoModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Guardar Curso en PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
