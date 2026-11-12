import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { exportToExcel, exportToCorporatePDF } from '../utils/exportUtils';

export default function InicioEduca() {
  const [esedSec, setEsedSec] = useState<number>(() => Number(localStorage.getItem('educa_esed_sec') || 1));
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (targetEsed = esedSec) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?esedSec=${targetEsed}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setData(json);
      }
    } catch (err) {
      console.error('Error cargando dashboard PADEDUCA:', err);
    } finally {
      setLoading(false);
    }
  }, [esedSec]);

  useEffect(() => {
    fetchDashboard(esedSec);
  }, [esedSec, fetchDashboard]);

  useEffect(() => {
    const handler = (ev: any) => {
      const next = Number(ev.detail || localStorage.getItem('educa_esed_sec') || 1);
      setEsedSec(next);
    };
    window.addEventListener('educa-estab-changed', handler);
    return () => window.removeEventListener('educa-estab-changed', handler);
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="inline-block w-8 h-8 border-4 border-[#016098] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-600">
          Consultando indicadores académicos desde PostgreSQL 18 (`bd_cmds_educa`)...
        </p>
      </div>
    );
  }

  const r = data.resumen;

  return (
    <div className="space-y-6">
      {/* Cabecera Ejecutiva */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#016098]/10 text-[#016098] uppercase tracking-wider">
              PADEDUCA · Fases 1 y 2 (100% Completo)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
              PostgreSQL 18.6 (`192.168.30.48` · `bd_cmds_educa`)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] mt-1">
            Panel de Gestión Escolar y Libro de Clases Digital
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cumplimiento Circular N° 30 SuperEduc / MINEDUC · Asistencia SIGE, Calificaciones, Leccionario y Matrícula
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              exportToExcel(
                data.cursosResumen,
                `PADEDUCA_Cursos_${esedSec === 1 ? 'Comunal' : esedSec}`,
                'Cursos PADEDUCA'
              )
            }
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Exportar Cursos (.xlsx)
          </button>
          <button
            onClick={() =>
              exportToCorporatePDF({
                title: 'Resumen Ejecutivo Escolar — Sistema PADEDUCA CMDS',
                subtitle: 'Dirección de Educación · Corporación Municipal de Desarrollo Social de Antofagasta',
                meta: [
                  { label: 'Año Escolar', value: '2026' },
                  { label: 'Base de Datos', value: 'PostgreSQL 18 (bd_cmds_educa)' }
                ],
                kpis: [
                  { label: 'Establecimientos RBDs', value: String(r.totalEstablecimientos), color: 'blue' },
                  { label: 'Matrícula Activa', value: String(r.totalMatricula), color: 'emerald' },
                  { label: 'Asistencia Media', value: `${r.porcentajeAsistencia}%`, color: 'indigo' },
                  { label: 'Promedio Notas', value: String(r.promedioGeneral), color: 'amber' }
                ],
                columns: [
                  { header: 'RBD', key: 'RBD', align: 'center' },
                  { header: 'Establecimiento', key: 'ESTABLECIMIENTO', align: 'left' },
                  { header: 'Curso', key: 'CURSO', align: 'center' },
                  { header: 'Jornada', key: 'GRCU_JORNADA', align: 'center' },
                  { header: 'Profesor Jefe', key: 'PROFESOR_JEFE', align: 'left' },
                  { header: 'Matrícula', key: 'MATRICULADOS', align: 'right' }
                ],
                rows: data.cursosResumen
              })
            }
            className="px-3.5 py-2 rounded-lg bg-[#016098] hover:bg-[#024a8d] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Reporte PDF Sostenedor
          </button>
        </div>
      </div>

      {/* Fila 1: KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-[#016098]">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Establecimientos y Cursos (`EDC_GRADOS_CURSOS`)
          </div>
          <div className="text-2xl font-extrabold text-[#016098] mt-1">
            {r.totalCursos} Cursos Activos
          </div>
          <div className="mt-2 flex gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#016098] font-semibold">
              {r.totalEstablecimientos} Colegios / Liceos CMDS
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              {r.totalVacantes} Cupos SAE
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-emerald-600">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Matrícula y Subvención SEP / PIE
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {r.totalMatricula} Estudiantes
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              Prioritarios SEP: {r.prioritariosSep}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              PIE: {r.alumnosPie}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-[#39BABD]">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Asistencia Media y Firma OTP (`EDC_TOKEN_ASBL`)
          </div>
          <div className="text-2xl font-extrabold text-[#0f766e] mt-1">
            {r.porcentajeAsistencia}% Asistencia
          </div>
          <div className="mt-2 flex gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold">
              {r.firmasDigitalesOtp} Bloques Firmados con Token OTP
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-[#EB567F]">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Rendimiento Académico (`EDC_NOTAS_ASIG_CURSO`)
          </div>
          <div className="text-2xl font-extrabold text-[#EB567F] mt-1">
            Nota Media {r.promedioGeneral}
          </div>
          <div className="mt-2 flex gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
              {r.certificadosEmitidos} Certificados QR Verificados
            </span>
          </div>
        </div>
      </div>

      {/* Fila 2: Accesos Directos a los Módulos de PADEDUCA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Link
          to="/libro/asistencia"
          className="bg-white hover:bg-[#016098]/5 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#016098]"
        >
          <div className="text-[10px] font-bold text-[#016098] uppercase">Libro Digital · Circular N° 30</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Asistencia y Firma OTP</div>
          <div className="text-xs text-slate-500 mt-1">Control por bloque, SIGE y token docente</div>
        </Link>
        <Link
          to="/libro/notas"
          className="bg-white hover:bg-[#39BABD]/10 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#39BABD]"
        >
          <div className="text-[10px] font-bold text-[#0f766e] uppercase">Libro Digital · Calificaciones</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Sábana de Notas y Actas</div>
          <div className="text-xs text-slate-500 mt-1">Notas N1..N6, promedios y promoción</div>
        </Link>
        <Link
          to="/libro/leccionario"
          className="bg-white hover:bg-indigo-50/60 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-600"
        >
          <div className="text-[10px] font-bold text-indigo-700 uppercase">Libro Digital · Aula</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Leccionario y Hoja de Vida</div>
          <div className="text-xs text-slate-500 mt-1">Objetivos OA, Parvularia, Anotaciones y Atrasos</div>
        </Link>
        <Link
          to="/alumnos"
          className="bg-white hover:bg-emerald-50/60 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-600"
        >
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Gestión de Estudiantes</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Matrícula y Certificados QR</div>
          <div className="text-xs text-slate-500 mt-1">Ficha alumno, SEP/PIE, Apoderados y Certificados</div>
        </Link>
        <Link
          to="/establecimiento"
          className="bg-white hover:bg-[#EB567F]/10 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#EB567F]"
        >
          <div className="text-[10px] font-bold text-[#EB567F] uppercase">Estructura Académica</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Cursos, Horarios y 52 RBDs</div>
          <div className="text-xs text-slate-500 mt-1">Planes de estudio, bloques horarios y docentes</div>
        </Link>
        <Link
          to="/pie"
          className="bg-white hover:bg-amber-50/70 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-amber-500"
        >
          <div className="text-[10px] font-bold text-amber-700 uppercase">Fase 2 · Decreto 170</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Programa Integración PIE</div>
          <div className="text-xs text-slate-500 mt-1">NEE, Especialistas, PACI/DUA y Firma OTP</div>
        </Link>
        <Link
          to="/sige"
          className="bg-white hover:bg-blue-50/60 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#016098]"
        >
          <div className="text-[10px] font-bold text-[#016098] uppercase">Fase 2 · Subvenciones</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">SIGE MINEDUC (Arch. 4 y 5)</div>
          <div className="text-xs text-slate-500 mt-1">Sincronización SOAP y archivos planos</div>
        </Link>
        <Link
          to="/profesores"
          className="bg-white hover:bg-indigo-50/60 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-600"
        >
          <div className="text-[10px] font-bold text-indigo-700 uppercase">Fase 2 · Estatuto Docente</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Docentes y Carpeta Digital</div>
          <div className="text-xs text-slate-500 mt-1">Idoneidad, acompañamiento MBE e inhabilidades</div>
        </Link>
        <Link
          to="/convivencia-sae"
          className="bg-white hover:bg-rose-50/60 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#EB567F]"
        >
          <div className="text-[10px] font-bold text-[#EB567F] uppercase">Fase 2 · Comunidad</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">Convivencia, SAE y Dual TP</div>
          <div className="text-xs text-slate-500 mt-1">Protocolos, vacantes SAE y prácticas TP</div>
        </Link>
      </div>

      {/* Fila 3: Cursos Vigentes y Últimas Firmas Digitales OTP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1e293b]">
                Cursos Habilitados en SIGE (`ADM_EDUCA.EDC_GRADOS_CURSOS`)
              </h3>
              <p className="text-xs text-slate-500">
                Nómina de cursos con profesor jefe y matrícula activa
              </p>
            </div>
            <Link to="/establecimiento" className="text-xs font-bold text-[#016098] hover:underline">
              Ver Todos &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <th className="py-2 px-2.5">RBD / Establecimiento</th>
                  <th className="py-2 px-2.5 text-center">Curso</th>
                  <th className="py-2 px-2.5">Profesor Jefe</th>
                  <th className="py-2 px-2.5 text-right">Matrícula / Cupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.cursosResumen.map((c: any) => (
                  <tr key={c.GRCU_SEC} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5">
                      <span className="font-mono font-bold text-[#016098]">RBD {c.RBD}</span>
                      <span className="block text-[11px] font-semibold text-slate-800">{c.ESTABLECIMIENTO}</span>
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#016098] font-bold">
                        {c.CURSO}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-medium text-slate-700">{c.PROFESOR_JEFE}</td>
                    <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                      {c.MATRICULADOS} / {c.GRCU_CNT_VACANTES}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1e293b]">
                Últimas Firmas Digitales con Token OTP (`ADM_EDUCA.EDC_TOKEN_ASBL`)
              </h3>
              <p className="text-xs text-slate-500">
                Trazabilidad criptográfica exigida por la Circular N° 30 (SuperEduc)
              </p>
            </div>
            <Link to="/libro/asistencia" className="text-xs font-bold text-[#016098] hover:underline">
              Firmar Bloque &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <th className="py-2 px-2.5">Token OTP</th>
                  <th className="py-2 px-2.5">Curso / Asignatura</th>
                  <th className="py-2 px-2.5">Docente Firmante</th>
                  <th className="py-2 px-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.ultimasFirmas.map((f: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5">
                      <span className="font-mono font-bold text-[#016098]">{f.CODIGO_TOKEN}</span>
                      <span className="block text-[10px] text-slate-500">
                        {f.FECHA} · Bloque #{f.BLOQUE}
                      </span>
                    </td>
                    <td className="py-2 px-2.5">
                      <span className="font-bold text-slate-800">{f.CURSO} · {f.ASIGNATURA}</span>
                      <span className="block text-[10px] text-slate-500">{f.ESTABLECIMIENTO}</span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px]">{f.DOCENTE_RUT}</td>
                    <td className="py-2 px-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {f.ESTADO}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
