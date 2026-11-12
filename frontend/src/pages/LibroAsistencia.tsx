import React, { useState, useEffect, useCallback } from 'react';
import { exportToExcel } from '../utils/exportUtils';

export default function LibroAsistencia() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [activeTab, setActiveTab] = useState<'bloques' | 'tokens'>('bloques');
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [tokensOtp, setTokensOtp] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/libro/asistencia?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setAsistencia(json.asistenciaBloques || []);
        setTokensOtp(json.tokensOtp || []);
      }
    } catch (err) {
      console.error('Error cargando Asistencia:', err);
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

  const handleToggleEstado = async (row: any, nuevoEstado: string) => {
    try {
      const res = await fetch('/api/libro/asistencia/estado', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuasSec: row.CUAS_SEC,
          nroBloque: row.ASBL_NRO_BLOQUE,
          fialSec: row.FIAL_SEC,
          asistencia: nuevoEstado,
          observacion:
            nuevoEstado === 'P'
              ? 'PRESENTE EN AULA'
              : nuevoEstado === 'A'
              ? 'AUSENTE EN BLOQUE'
              : 'ATRASO REGISTRADO EN BLOQUE'
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(`Asistencia de ${row.NOMBRE_ALUMNO} actualizada a [${nuevoEstado}].`);
        fetchData(esedSec);
      }
    } catch {}
  };

  const handleFirmarOtp = async () => {
    try {
      const res = await fetch('/api/libro/asistencia/firmar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuasSec: asistencia[0]?.CUAS_SEC || 401,
          nroBloque: asistencia[0]?.ASBL_NRO_BLOQUE || 1,
          rutDocente: '10633447-1'
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setFeedback(json.message);
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
            Libro de Clases Digital · Circular N° 30 (`EDC_ASISTENCIA_BLOQUE` · `EDC_TOKEN_ASBL`)
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            Control de Asistencia por Bloque, Interoperabilidad SIGE y Firma Digital OTP
          </h1>
          <p className="text-xs text-slate-500">
            Registro oficial de asistencia por asignatura y validación criptográfica con Token Docente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToExcel(asistencia, 'Asistencia_Libro_Digital_CMDS', 'Asistencia Bloques')}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Asistencia (.xlsx)
          </button>
          <button
            onClick={handleFirmarOtp}
            className="px-4 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Firmar Bloque con Token OTP (Circular N° 30)
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
        <button
          onClick={() => setActiveTab('bloques')}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
            activeTab === 'bloques'
              ? 'bg-[#016098] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Registro de Asistencia por Bloque y Asignatura ({asistencia.length})
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
            activeTab === 'tokens'
              ? 'bg-[#016098] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Bitácora de Firmas Digitales OTP (`EDC_TOKEN_ASBL` · {tokensOtp.length})
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-xs text-slate-500 border border-slate-200">
          Cargando registros del Libro de Clases Digital desde PostgreSQL 18...
        </div>
      ) : activeTab === 'bloques' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#016098] text-white uppercase text-[10px]">
                <th className="py-2.5 px-3">Fecha / Bloque</th>
                <th className="py-2.5 px-3">Curso / Asignatura</th>
                <th className="py-2.5 px-3 text-center">N° Lista</th>
                <th className="py-2.5 px-3">Estudiante</th>
                <th className="py-2.5 px-3 text-center">Estado Asistencia</th>
                <th className="py-2.5 px-3">Observación / Justificación</th>
                <th className="py-2.5 px-3 text-center">Token OTP / SIGE</th>
                <th className="py-2.5 px-3 text-center">Cambiar Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {asistencia.map((r, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[#016098]">{r.FECHA}</span>
                    <span className="block text-[10px] text-slate-500">
                      Bloque #{r.ASBL_NRO_BLOQUE} ({r.ASBL_HORA_LLEGA})
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#016098] font-bold mr-1">
                      {r.CURSO}
                    </span>
                    <span className="font-semibold text-slate-800">{r.ASIGNATURA}</span>
                    <span className="block text-[10px] text-slate-500">{r.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">#{r.ASBL_NRO_LISTA}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{r.NOMBRE_ALUMNO}</span>
                    <span className="block font-mono text-[10px] text-slate-500">{r.RUT_ALUMNO}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.ASBL_ASISTENCIA === 'P'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.ASBL_ASISTENCIA === 'A'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.ASBL_ASISTENCIA === 'P'
                        ? 'PRESENTE (P)'
                        : r.ASBL_ASISTENCIA === 'A'
                        ? 'AUSENTE (A)'
                        : 'ATRASADO (T)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.ASBL_OBSERV}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-mono font-bold text-[#016098] block text-[11px]">
                      {r.ASBL_COD_VERIFICACION}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">{r.ASBL_ESTADO_SIGE}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center space-x-1">
                    {['P', 'A', 'T'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleToggleEstado(r, st)}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          r.ASBL_ASISTENCIA === st
                            ? 'bg-[#016098] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
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
                <th className="py-2.5 px-3">Código Token OTP</th>
                <th className="py-2.5 px-3">Fecha / Sello Horario</th>
                <th className="py-2.5 px-3 text-center">Bloque</th>
                <th className="py-2.5 px-3">Curso / Asignatura</th>
                <th className="py-2.5 px-3">RUT Docente Firmante</th>
                <th className="py-2.5 px-3 text-center">Estado Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tokensOtp.map((t, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="py-2.5 px-3 font-mono font-extrabold text-[#016098]">
                    {t.TOAB_CODIGO_TKN}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{t.TOAB_FEC_ZH}</td>
                  <td className="py-2.5 px-3 text-center font-bold">Bloque #{t.TOAB_NRO_BLOQUE}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{t.CURSO} · {t.ASIGNATURA}</span>
                    <span className="block text-[10px] text-slate-500">{t.ESTABLECIMIENTO}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold">{t.TOAB_RUT_USUARIO}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {t.TOAB_ESTADO_TOKEN}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
