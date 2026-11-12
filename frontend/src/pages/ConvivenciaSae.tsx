import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel } from '../utils/exportUtils';

export default function ConvivenciaSae() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'convivencia' | 'sae' | 'dual' | 'operaciones'>('convivencia');
  const [casosConvivencia, setCasosConvivencia] = useState<any[]>([]);
  const [empresasDual, setEmpresasDual] = useState<any[]>([]);
  const [cuposSae, setCuposSae] = useState<any[]>([]);
  const [postulantesSae, setPostulantesSae] = useState<any[]>([]);
  const [catalogoApps, setCatalogoApps] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showCasoModal, setShowCasoModal] = useState(false);
  const [casoForm, setCasoForm] = useState({
    esedSec: 7,
    tipoCaso: 'MEDIACIÓN ENTRE PARES',
    lugar: 'SALA DE CLASES',
    descripcion: '',
    medida: 'Entrevista formativa con Encargado de Convivencia Escolar y acuerdo reparatorio.'
  });

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/convivencia-sae?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setCasosConvivencia(json.casosConvivencia || []);
        setEmpresasDual(json.empresasDual || []);
        setCuposSae(json.cuposSae || []);
        setPostulantesSae(json.postulantesSae || []);
        setCatalogoApps(json.catalogoApps || []);
        setPerfiles(json.perfiles || []);
      }
    } catch (err) {
      console.error('Error cargando Convivencia y SAE:', err);
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

  const handleCreateCaso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/convivencia-sae/casos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(casoForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowCasoModal(false);
        setCasoForm({ ...casoForm, descripcion: '' });
        fetchData(esedSec);
      }
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EB567F]/15 text-[#EB567F] uppercase">
            Convivencia Escolar, Admisión SAE, Dual TP y Operaciones (`EDC_CASOS_ESTAB` · `EDC_POSTULACION_PORTAL`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Protocolos de Convivencia Escolar, Admisión SAE, Prácticas Dual TP y Operaciones
          </h1>
          <p className="text-xs text-slate-500">
            Seguimiento psicosocial, vacantes SAE MINEDUC, convenios empresariales TP y catálogo `EDC_APLICACIONES`
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(cuposSae, 'Cupos_Admision_SAE_CMDS', 'Vacantes SAE')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Cupos SAE (.xlsx)
          </button>
          <button
            onClick={() => setShowCasoModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#EB567F] hover:bg-[#d6416a] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Activar Protocolo Convivencia
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
          { id: 'convivencia', label: `Casos y Protocolos de Convivencia (${casosConvivencia.length})` },
          { id: 'sae', label: `Admisión Escolar SAE y Postulantes (${cuposSae.length + postulantesSae.length})` },
          { id: 'dual', label: `Formación Dual TP — Empresas (${empresasDual.length})` },
          { id: 'operaciones', label: `Perfiles y Catálogo de Apps (${catalogoApps.length})` }
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
          Cargando información desde PostgreSQL 18 (`bd_cmds_educa`)...
        </div>
      ) : activeTab === 'convivencia' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Caso / Fecha</th>
                <th className="py-2.5 px-3">Establecimiento / Lugar</th>
                <th className="py-2.5 px-3">Protocolo Activado</th>
                <th className="py-2.5 px-3">Descripción del Caso (`EDC_CASOS_ESTAB`)</th>
                <th className="py-2.5 px-3">Medida Formativa / Psicosocial</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {casosConvivencia.map((c) => (
                <tr key={c.CASO_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">#{c.CASO_SEC}</span>
                    <span className="block text-[10px] text-slate-500">
                      {c.FECHA_CASO} ({c.CASO_HORA_CASO})
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{c.ESTABLECIMIENTO}</span>
                    <span className="block text-[10px] text-slate-500">{c.CASO_LUGAR_INCIDENTE}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-[#EB567F] font-bold">
                      {c.CASO_TIPO_CASO}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{c.CASO_DESCRIP}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.MEDIDA_ACCION}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {c.CASO_ESTADO}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'sae' ? (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-[#016098]">
              Capacidad y Vacantes Declaradas al Sistema de Admisión Escolar SAE (`EDC_RESUMEN_MATRI_ESTAB`)
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#016098] text-white uppercase text-[10px]">
                  <th className="py-2 px-3">RBD / Establecimiento</th>
                  <th className="py-2 px-3 text-center">Nivel / Grado</th>
                  <th className="py-2 px-3 text-center">N° Cursos</th>
                  <th className="py-2 px-3 text-right">Cupos Declarados</th>
                  <th className="py-2 px-3 text-right">Matriculados</th>
                  <th className="py-2 px-3 text-right">Vacantes Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cuposSae.map((s, i) => (
                  <tr key={i} className="hover:bg-blue-50/40">
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-[#016098]">RBD {s.RBD}</span> ·{' '}
                      <strong className="text-slate-800">{s.ESTABLECIMIENTO}</strong>
                    </td>
                    <td className="py-2 px-3 text-center font-bold">{s.GRTE_COD}</td>
                    <td className="py-2 px-3 text-center">{s.RMES_CNT_CURSOS}</td>
                    <td className="py-2 px-3 text-right font-semibold">{s.RMES_CUPOS_DECLA}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#016098]">{s.RMES_PREMATRI_PERI}</td>
                    <td className="py-2 px-3 text-right font-extrabold text-emerald-700">
                      {s.RMES_CUPOS_DIPONIBLES} cupos
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-[#016098]">
              Postulantes Asignados vía Portal SAE MINEDUC (`EDC_POSTULACION_PORTAL`)
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <th className="py-2 px-3">Folio SAE</th>
                  <th className="py-2 px-3">RUT Postulante</th>
                  <th className="py-2 px-3">Estudiante Postulante</th>
                  <th className="py-2 px-3">Nivel y Establecimiento Asignado</th>
                  <th className="py-2 px-3">Apoderado / Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {postulantesSae.map((p, i) => (
                  <tr key={i} className="hover:bg-blue-50/40">
                    <td className="py-2 px-3 font-mono font-bold text-[#016098]">{p.FOLIO_SAE}</td>
                    <td className="py-2 px-3 font-mono">{p.RUT_POSTULANTE}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{p.NOMBRE_POSTULANTE}</td>
                    <td className="py-2 px-3 font-semibold text-emerald-800">
                      {p.NIVEL_ESTABLECIMIENTO_POSTULADO}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {p.APODERADO} ({p.PPOR_CELULAR_CONT})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'dual' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">RUT Empresa</th>
                <th className="py-2.5 px-3">Centro de Práctica Dual Técnico-Profesional</th>
                <th className="py-2.5 px-3">Área / Rubro Industrial</th>
                <th className="py-2.5 px-3">Maestro Guía / Tutor</th>
                <th className="py-2.5 px-3">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {empresasDual.map((em) => (
                <tr key={em.COEM_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{em.COEM_SEC}</td>
                  <td className="py-2.5 px-3 font-mono">{em.RUT_EMPRESA}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{em.EMPRESA_CENTRO_PRACTICA}</td>
                  <td className="py-2.5 px-3 text-slate-700">{em.AREA_RUBRO}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#016098]">{em.MAESTRO_GUIA}</td>
                  <td className="py-2.5 px-3 text-slate-600">{em.COEM_EMAIL}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {perfiles.map((pf) => (
              <div key={pf.PRFL_SEC} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-mono font-bold text-[#016098]">ROL {pf.PRFL_COD}</div>
                <div className="text-xs font-extrabold text-slate-800 mt-0.5">{pf.PRFL_DESC}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Catálogo Oficial de Aplicaciones Migradas desde Oracle (`ADM_EDUCA.EDC_APLICACIONES`)
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#016098] text-white uppercase text-[10px]">
                  <th className="py-2 px-3">Cód.</th>
                  <th className="py-2 px-3">Opción de Menú PADEDUCA</th>
                  <th className="py-2 px-3">Aplicación Scriptcase Original (`APLI_LINK`)</th>
                  <th className="py-2 px-3 text-center">Nodo Padre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {catalogoApps.map((app) => (
                  <tr key={app.APLI_COD} className="hover:bg-blue-50/40">
                    <td className="py-2 px-3 font-mono font-bold text-[#016098]">#{app.APLI_COD}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{app.APLI_DESC}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                      {app.APLI_LINK || '(Menú Contenedor)'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{app.APLI_PADRE || 'RAÍZ'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Activar Protocolo Convivencia */}
      {showCasoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#EB567F] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Activar Protocolo de Convivencia Escolar (`EDC_CASOS_ESTAB`)</h3>
              <button onClick={() => setShowCasoModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCaso} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Protocolo Reglamentario</label>
                <select
                  value={casoForm.tipoCaso}
                  onChange={(e) => setCasoForm({ ...casoForm, tipoCaso: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="MEDIACIÓN ENTRE PARES">MEDIACIÓN ENTRE PARES</option>
                  <option value="CONVIVENCIA DIGITAL">CONVIVENCIA DIGITAL / CIBERACOSO</option>
                  <option value="RETENCIÓN ESCOLAR">RETENCIÓN ESCOLAR Y ASISTENCIA</option>
                  <option value="CONTENCIÓN SOCIOEMOCIONAL">CONTENCIÓN SOCIOEMOCIONAL DEC</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción de los Hechos</label>
                <textarea
                  rows={3}
                  value={casoForm.descripcion}
                  onChange={(e) => setCasoForm({ ...casoForm, descripcion: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Describa los antecedentes del caso..."
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medida Formativa / Psicosocial Inicial</label>
                <input
                  type="text"
                  value={casoForm.medida}
                  onChange={(e) => setCasoForm({ ...casoForm, medida: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCasoModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#EB567F] text-white font-bold cursor-pointer"
                >
                  Registrar Caso en PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
