import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel } from '../utils/exportUtils';

export default function SigeMineduc() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'soap' | 'archivos' | 'bitacora' | 'parametros'>('soap');
  const [parametrosSige, setParametrosSige] = useState<any[]>([]);
  const [archivosPlanos, setArchivosPlanos] = useState<any[]>([]);
  const [colaSoap, setColaSoap] = useState<any[]>([]);
  const [bitacoraValidacion, setBitacoraValidacion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sige?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setParametrosSige(json.parametrosSige || []);
        setArchivosPlanos(json.archivosPlanos || []);
        setColaSoap(json.colaSoap || []);
        setBitacoraValidacion(json.bitacoraValidacion || []);
      }
    } catch (err) {
      console.error('Error cargando SIGE MINEDUC:', err);
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

  const handleSincronizarSoap = async () => {
    try {
      const res = await fetch('/api/sige/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          esedSec: esedSec === 1 ? 7 : esedSec,
          grcuSec: 301,
          presentes: 41
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
        fetchData(esedSec);
      }
    } catch {}
  };

  const handleDownloadTxt = (tipoArch: number) => {
    const lines = archivosPlanos
      .filter((a) => Number(a.ARCH_SEC) === tipoArch)
      .map((a) => a.ARLI_LINEA)
      .join('\r\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MINEDUC_SIGE_ARCHIVO_${tipoArch}_202611.TXT`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#016098]/10 text-[#016098] uppercase">
            Módulo SIGE MINEDUC (`EDC_SIGE_ASISTENCIA_OUT` · `EDC_ARCH_LINEAS`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Interoperabilidad SOAP MINEDUC y Generador de Archivos Planos 4 y 5
          </h1>
          <p className="text-xs text-slate-500">
            Declaración oficial de matrícula y asistencia mensual para pago de Subvención Escolar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadTxt(4)}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Descargar Archivo 4 (.TXT)
          </button>
          <button
            onClick={() => handleDownloadTxt(5)}
            className="px-3 py-2 rounded-lg bg-[#39BABD] hover:bg-[#2da3a6] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Descargar Archivo 5 (.TXT)
          </button>
          <button
            onClick={handleSincronizarSoap}
            className="px-4 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Transmitir Asistencia SOAP MINEDUC
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
          { id: 'soap', label: `Cola de Envío SOAP Asistencia (${colaSoap.length})` },
          { id: 'archivos', label: `Líneas Archivos Planos 4 y 5 (${archivosPlanos.length})` },
          { id: 'bitacora', label: `Bitácora de Respuesta MINEDUC (${bitacoraValidacion.length})` },
          { id: 'parametros', label: `Endpoints SOAP Configurados (${parametrosSige.length})` }
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
          Consultando cola de interoperabilidad SIGE en PostgreSQL 18...
        </div>
      ) : activeTab === 'soap' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">ID Envío</th>
                <th className="py-2.5 px-3">RBD / Establecimiento</th>
                <th className="py-2.5 px-3 text-center">Curso</th>
                <th className="py-2.5 px-3 text-center">Fecha Asistencia</th>
                <th className="py-2.5 px-3 text-center">Presentes</th>
                <th className="py-2.5 px-3">Semilla Autorización SOAP MINEDUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {colaSoap.map((s) => (
                <tr key={s.SIAO_SEC} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{s.SIAO_SEC}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">RBD {s.RBD}</span>
                    <span className="block font-semibold text-slate-800">{s.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">{s.CURSO}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{s.FECHA_ASISTENCIA}</td>
                  <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">
                    {s.PRESENTES_INFORMADOS} alumnos
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-800 font-bold">
                    {s.SIAO_SEMILLA}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'archivos' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">
              Estructura Oficial de Registros Planos (`EDC_ARCH_LINEAS`)
            </span>
            <button
              onClick={() => exportToExcel(archivosPlanos, 'Lineas_Archivos_SIGE_4_y_5', 'SIGE')}
              className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              Exportar a Excel
            </button>
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Tipo Archivo</th>
                <th className="py-2.5 px-3 text-center">N° Línea</th>
                <th className="py-2.5 px-3">Trama Plana Delimitada por Pipe (`|`)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {archivosPlanos.map((a, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-bold text-[#016098]">
                    Archivo #{a.ARCH_SEC} ({Number(a.ARCH_SEC) === 4 ? 'Matrícula' : 'Asistencia'})
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">#{a.ARLI_NRO_LINEA}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">{a.ARLI_LINEA}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'bitacora' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Folio Envío</th>
                <th className="py-2.5 px-3">Fecha / Hora Respuesta</th>
                <th className="py-2.5 px-3">Mensaje de Validación WebService SIGE (`EDC_SIGE_ERROR_ENVIO`)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bitacoraValidacion.map((b, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">#{b.SIEA_SEC}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{b.FECHA_LOG}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{b.SIEE_MSG_ERROR}</td>
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
                <th className="py-2.5 px-3">Código Parámetro</th>
                <th className="py-2.5 px-3">Valor / Endpoint SOAP MINEDUC</th>
                <th className="py-2.5 px-3">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parametrosSige.map((p, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#016098]">{p.SIPA_CODIGO}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{p.SIPA_VALOR}</td>
                  <td className="py-2.5 px-3 text-slate-600">{p.SIPA_DESC}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
