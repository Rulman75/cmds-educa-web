import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel, exportToCorporatePDF } from '../utils/exportUtils';

export default function AlumnosMatricula() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'alumnos' | 'apoderados' | 'certificados'>('alumnos');
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [certificados, setCertificados] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showMatricularModal, setShowMatricularModal] = useState(false);
  const [matForm, setMatForm] = useState({
    rut: '',
    dv: 'K',
    nombres: '',
    apePat: '',
    apeMat: '',
    genero: 'M',
    fecNac: '2011-05-14',
    esedSec: 7,
    grcuSec: 301,
    direccion: 'AV. BRASIL #1250, ANTOFAGASTA',
    celular: '+56987654321',
    prioritario: 'S',
    preferente: 'N',
    pie: 'N',
    fonasa: 'FONASA B'
  });

  const [showCertModal, setShowCertModal] = useState(false);
  const [certForm, setCertForm] = useState({
    fialSec: 5001,
    tepoSec: 1
  });

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('esedSec', String(targetEsed));
      if (search) params.set('search', search);
      const res = await fetch(`/api/alumnos-matricula?${params.toString()}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setAlumnos(json.alumnos || []);
        setApoderados(json.apoderados || []);
        setCertificados(json.certificados || []);
      }
    } catch (err) {
      console.error('Error cargando Alumnos y Matrícula:', err);
    } finally {
      setLoading(false);
    }
  }, [esedSec, search]);

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

  const handleMatricular = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/alumnos-matricula/matricular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowMatricularModal(false);
        fetchData(esedSec);
      }
    } catch {}
  };

  const handleEmitirCertificado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/alumnos-matricula/certificados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certForm)
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        setShowCertModal(false);
        setActiveTab('certificados');
        fetchData(esedSec);
      }
    } catch {}
  };

  const handleDownloadCertPDF = (c: any) => {
    exportToCorporatePDF({
      title: c.TIPO_CERTIFICADO,
      subtitle: `${c.ESTABLECIMIENTO} · Dirección de Educación CMDS Antofagasta`,
      meta: [
        { label: 'Código Verificación QR', value: c.CODIGO_VERIFICACION_QR },
        { label: 'Fecha Emisión', value: c.FECHA_EMISION },
        { label: 'Válido Hasta', value: c.FECHA_VIGENCIA }
      ],
      kpis: [
        { label: 'Estudiante', value: c.NOMBRE_ALUMNO, color: 'blue' },
        { label: 'RUT', value: c.RUT_ALUMNO, color: 'indigo' },
        { label: 'Curso 2026', value: c.CURSO || 'REGULAR', color: 'emerald' },
        { label: 'Estado', value: 'ALUMNO REGULAR VIGENTE', color: 'amber' }
      ],
      columns: [
        { header: 'Folio Verificación', key: 'CODIGO_VERIFICACION_QR', align: 'center' },
        { header: 'Documento Oficial', key: 'TIPO_CERTIFICADO', align: 'left' },
        { header: 'RUT Estudiante', key: 'RUT_ALUMNO', align: 'center' },
        { header: 'Nombre Completo', key: 'NOMBRE_ALUMNO', align: 'left' },
        { header: 'Establecimiento', key: 'ESTABLECIMIENTO', align: 'left' },
        { header: 'Curso', key: 'CURSO', align: 'center' }
      ],
      rows: [c]
    });
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase">
            Módulo Alumnos (`EDC_FICHA_ALUMNO` · `EDC_MATRICULA_ALUMNOS` · `EDC_DOCTO_VERIFICADO`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Libro de Matrícula, Ficha del Estudiante (SEP / PIE) y Certificados QR
          </h1>
          <p className="text-xs text-slate-500">
            Gestión integral de estudiantes, apoderados y certificados verificados (`ADM_EDUCA` + `ADM_NOTAS`)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(alumnos, 'Libro_Matricula_CMDS_2026', 'Alumnos Matriculados')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Libro Matrícula (.xlsx)
          </button>
          <button
            onClick={() => setShowCertModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#39BABD] hover:bg-[#2da3a6] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Emitir Certificado QR
          </button>
          <button
            onClick={() => setShowMatricularModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Nueva Matrícula 2026
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

      {/* Buscador y Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'alumnos', label: `Nómina y Libro de Matrícula (${alumnos.length})` },
            { id: 'apoderados', label: `Apoderados y Contactos (${apoderados.length})` },
            { id: 'certificados', label: `Certificados Emitidos con Código QR (${certificados.length})` }
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

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por RUT, nombre o folio matrícula..."
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-xs text-slate-500 border border-slate-200">
          Consultando fichas de estudiantes en PostgreSQL 18 (`bd_cmds_educa`)...
        </div>
      ) : activeTab === 'alumnos' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Folio Matr.</th>
                <th className="py-2.5 px-3">RUT</th>
                <th className="py-2.5 px-3">Estudiante</th>
                <th className="py-2.5 px-3">Establecimiento / Curso</th>
                <th className="py-2.5 px-3 text-center">SEP / PIE</th>
                <th className="py-2.5 px-3 text-center">Previsión</th>
                <th className="py-2.5 px-3 text-center">Estado SIGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {alumnos.map((a) => (
                <tr key={a.FIAL_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">
                    {a.FIAL_NRO_MATR_ESTAB}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">{a.RUT_FORMATEADO}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{a.NOMBRE_ALUMNO}</span>
                    <span className="block text-[10px] text-slate-500">
                      Nac: {a.FECHA_NACIMIENTO} · N° Lista #{a.NRO_LISTA || 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#016098] font-bold mr-1.5">
                      {a.CURSO}
                    </span>
                    <span className="text-[11px] font-medium text-slate-700">{a.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center space-x-1">
                    {a.FIAL_ES_PRIORITARIO === 'S' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        PRIORITARIO SEP
                      </span>
                    )}
                    {a.FIAL_ES_PREFERENTE === 'S' && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                        PREFERENTE
                      </span>
                    )}
                    {a.FIAL_PROG_INTEG_ESCOLAR === 'S' && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        PIE D.170
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                    {a.FIAL_TRAMO_FONASA} ({a.FIAL_GRUPO_SANGUINEO})
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {a.FIAL_ESTA_DATO_SIGE}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'apoderados' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Estudiante</th>
                <th className="py-2.5 px-3">RUT Apoderado</th>
                <th className="py-2.5 px-3">Nombre Apoderado Titular</th>
                <th className="py-2.5 px-3 text-center">Parentesco</th>
                <th className="py-2.5 px-3">Teléfono / Celular</th>
                <th className="py-2.5 px-3">Correo Electrónico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {apoderados.map((ap) => (
                <tr key={ap.COAL_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{ap.COAL_SEC}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{ap.ALUMNO}</td>
                  <td className="py-2.5 px-3 font-mono">{ap.RUT_APODERADO}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{ap.NOMBRE_APODERADO}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#016098] font-bold">
                      {ap.COAL_PARENTESCO}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{ap.COAL_CELULAR}</td>
                  <td className="py-2.5 px-3 text-slate-600">{ap.COAL_EMAIL}</td>
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
                <th className="py-2.5 px-3">Código QR Verificación</th>
                <th className="py-2.5 px-3">Tipo Certificado Oficial</th>
                <th className="py-2.5 px-3">Estudiante / RUT</th>
                <th className="py-2.5 px-3">Establecimiento / Curso</th>
                <th className="py-2.5 px-3 text-center">Emisión / Vigencia</th>
                <th className="py-2.5 px-3 text-center">Descarga PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {certificados.map((c) => (
                <tr key={c.DOVE_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-extrabold text-[#016098]">
                    {c.CODIGO_VERIFICACION_QR}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{c.TIPO_CERTIFICADO}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-800">{c.NOMBRE_ALUMNO}</span>
                    <span className="block font-mono text-[10px] text-slate-500">{c.RUT_ALUMNO}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-[#016098] mr-1">{c.CURSO}</span>
                    <span className="text-[11px] text-slate-600">{c.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-[11px]">
                    {c.FECHA_EMISION} &rarr; <strong className="text-emerald-700">{c.FECHA_VIGENCIA}</strong>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleDownloadCertPDF(c)}
                      className="px-2.5 py-1 rounded bg-[#016098] hover:bg-[#024a8d] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Descargar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nueva Matrícula */}
      {showMatricularModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#016098] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Inscribir y Matricular Estudiante (`EDC_FICHA_ALUMNO`)</h3>
              <button onClick={() => setShowMatricularModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleMatricular} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">RUT Estudiante (Sin puntos)</label>
                  <input
                    type="text"
                    value={matForm.rut}
                    onChange={(e) => setMatForm({ ...matForm, rut: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="Ej: 24910234"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DV</label>
                  <input
                    type="text"
                    value={matForm.dv}
                    onChange={(e) => setMatForm({ ...matForm, dv: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombres</label>
                  <input
                    type="text"
                    value={matForm.nombres}
                    onChange={(e) => setMatForm({ ...matForm, nombres: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellido Paterno</label>
                  <input
                    type="text"
                    value={matForm.apePat}
                    onChange={(e) => setMatForm({ ...matForm, apePat: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellido Materno</label>
                  <input
                    type="text"
                    value={matForm.apeMat}
                    onChange={(e) => setMatForm({ ...matForm, apeMat: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prioritario SEP</label>
                  <select
                    value={matForm.prioritario}
                    onChange={(e) => setMatForm({ ...matForm, prioritario: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="S">SÍ (Prioritario SEP)</option>
                    <option value="N">NO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Programa PIE (D.170)</label>
                  <select
                    value={matForm.pie}
                    onChange={(e) => setMatForm({ ...matForm, pie: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="N">NO</option>
                    <option value="S">SÍ (Integración PIE)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previsión Salud</label>
                  <select
                    value={matForm.fonasa}
                    onChange={(e) => setMatForm({ ...matForm, fonasa: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="FONASA A">FONASA A</option>
                    <option value="FONASA B">FONASA B</option>
                    <option value="FONASA C">FONASA C</option>
                    <option value="ISAPRE">ISAPRE</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowMatricularModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Confirmar Matrícula 2026
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Emitir Certificado QR */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-[#39BABD] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">Emitir Certificado Oficial con Código QR (`EDC_DOCTO_VERIFICADO`)</h3>
              <button onClick={() => setShowCertModal(false)} className="text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleEmitirCertificado} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estudiante Matriculado</label>
                <select
                  value={certForm.fialSec}
                  onChange={(e) => setCertForm({ ...certForm, fialSec: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  {alumnos.map((a) => (
                    <option key={a.FIAL_SEC} value={a.FIAL_SEC}>
                      {a.RUT_FORMATEADO} - {a.NOMBRE_ALUMNO} ({a.CURSO})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Certificado Oficial</label>
                <select
                  value={certForm.tepoSec}
                  onChange={(e) => setCertForm({ ...certForm, tepoSec: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value={1}>1 - CERTIFICADO DE ALUMNO REGULAR</option>
                  <option value={2}>2 - COMPROBANTE OFICIAL DE MATRÍCULA</option>
                  <option value={3}>3 - CERTIFICADO ANUAL DE ESTUDIOS (ADM_NOTAS)</option>
                  <option value={4}>4 - INFORME DE ASISTENCIA ESCOLAR</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#016098] text-white font-bold cursor-pointer"
                >
                  Generar Folio y Código QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
