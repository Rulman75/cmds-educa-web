import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppVersion } from '../version';

export default function Layout() {
  const { display: versionDisplay, tooltip: versionTooltip } = useAppVersion();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuLibroOpen, setMenuLibroOpen] = useState(true);
  const [menuGestionOpen, setMenuGestionOpen] = useState(true);
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [esedSec, setEsedSec] = useState<string>(() => localStorage.getItem('educa_esed_sec') || '1');

  const [userData, setUserData] = useState({
    username: '10633447',
    nombre: 'RAUL HORMAZABAL FIGUEROA',
    perfil: 'SOSTENEDOR / DIRECTOR'
  });

  useEffect(() => {
    const rawUser = localStorage.getItem('educa_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setUserData({
          username: parsed.username || '10633447',
          nombre: parsed.nombre || 'RAUL HORMAZABAL FIGUEROA',
          perfil: parsed.perfil || 'SOSTENEDOR CORPORATIVO'
        });
      } catch {}
    }

    fetch('/api/establecimientos')
      .then((r) => r.json())
      .then((json) => {
        if (json.status === 'ok' && Array.isArray(json.data)) {
          setEstablecimientos(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleChangeEstablecimiento = (newEsed: string) => {
    setEsedSec(newEsed);
    localStorage.setItem('educa_esed_sec', newEsed);
    window.dispatchEvent(new CustomEvent('educa-estab-changed', { detail: Number(newEsed) }));
  };

  const handleLogout = () => {
    localStorage.removeItem('educa_token');
    localStorage.removeItem('educa_user');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const currentEstabObj = establecimientos.find((e) => String(e.ESED_SEC) === String(esedSec));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f4f7f6] font-sans text-[#1e293b] print:bg-white print:h-auto">
      {/* Sidebar Corporativo PADEDUCA */}
      <aside className="w-full md:w-[275px] bg-[#016098] text-white shrink-0 shadow-lg flex flex-col justify-between print:hidden">
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-76px)] custom-scrollbar">
          {/* Header Sidebar */}
          <div className="flex flex-col items-center pb-4 mb-4 border-b border-white/20 text-center">
            <img
              src="/logo.png"
              alt="Logo CMDS"
              className="max-w-[85px] h-auto mb-2 bg-white p-2 rounded-lg shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#39BABD] text-white uppercase tracking-wider">
              Dirección de Educación CMDS
            </span>
            <h4 className="text-[1.05rem] font-bold tracking-wide m-0 leading-tight mt-1">
              Sistema PADEDUCA
            </h4>
            <p className="text-[0.70rem] text-blue-200 mt-0.5">
              Libro de Clases Digital · Circular N° 30
            </p>
            <span
              title={versionTooltip}
              className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-blue-100 border border-white/15"
            >
              v{versionDisplay} · bd_cmds_educa (PG 18)
            </span>

            <div className="mt-3 bg-[#024a8d] px-3 py-1.5 rounded-full text-xs font-medium text-blue-100 flex items-center gap-1.5 border border-white/10 shadow-inner max-w-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
              <span className="truncate max-w-[160px]" title={userData.nombre}>
                {userData.nombre}
              </span>
            </div>
          </div>

          {/* Selector Activo de Establecimiento (control_perfil_colegios) */}
          <div className="mb-4 bg-[#024a8d]/90 p-2.5 rounded-xl border border-white/15">
            <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">
              Establecimiento Activo (RBD)
            </label>
            <select
              value={esedSec}
              onChange={(e) => handleChangeEstablecimiento(e.target.value)}
              className="w-full text-xs font-bold bg-white text-[#016098] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              {establecimientos.map((e) => (
                <option key={e.ESED_SEC} value={e.ESED_SEC}>
                  {e.ESED_COD === '99999'
                    ? '99999 - CORPORACIÓN CMDS (52 RBDs)'
                    : `${e.ESED_COD} - ${e.ESED_DESCRIPCION}`}
                </option>
              ))}
            </select>
          </div>

          {/* Navegación Principal PADEDUCA */}
          <nav className="space-y-1 text-sm">
            <Link
              to="/inicio"
              className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg transition-colors font-semibold ${
                isActive('/inicio')
                  ? 'bg-[#39BABD] text-white shadow-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Panel Escolar (Dashboard)</span>
            </Link>

            {/* Grupo 1: Libro de Clases Digital (Circular N° 30) */}
            <div className="pt-1">
              <button
                onClick={() => setMenuLibroOpen(!menuLibroOpen)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-white/90 hover:bg-white/10 transition-colors font-semibold text-left cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span>Libro de Clases Digital</span>
                </span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${menuLibroOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuLibroOpen && (
                <div className="ml-4 pl-3 border-l border-white/20 space-y-1 mt-1 text-xs">
                  <Link
                    to="/libro/asistencia"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/libro/asistencia')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Asistencia y Firma OTP (SIGE)
                  </Link>
                  <Link
                    to="/libro/notas"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/libro/notas')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Calificaciones y Promedios
                  </Link>
                  <Link
                    to="/libro/leccionario"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/libro/leccionario')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Leccionario, Hoja Vida y Atrasos
                  </Link>
                </div>
              )}
            </div>

            {/* Grupo 2: Gestión Escolar, Alumnos y Establecimientos */}
            <div className="pt-1">
              <button
                onClick={() => setMenuGestionOpen(!menuGestionOpen)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-white/90 hover:bg-white/10 transition-colors font-semibold text-left cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span>Alumnos y Establecimiento</span>
                </span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${menuGestionOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuGestionOpen && (
                <div className="ml-4 pl-3 border-l border-white/20 space-y-1 mt-1 text-xs">
                  <Link
                    to="/alumnos"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/alumnos')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Matrícula, Fichas y Certificados QR
                  </Link>
                  <Link
                    to="/establecimiento"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/establecimiento')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Cursos, Asignaturas, Horarios y RBDs
                  </Link>
                  <Link
                    to="/pie"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/pie')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Programa Integración Escolar (PIE)
                  </Link>
                  <Link
                    to="/sige"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/sige')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    SIGE MINEDUC (Archivos 4, 5 y SOAP)
                  </Link>
                  <Link
                    to="/profesores"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/profesores')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Docentes, Evaluación y Carpeta Digital
                  </Link>
                  <Link
                    to="/convivencia-sae"
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActive('/convivencia-sae')
                        ? 'bg-[#39BABD] text-white font-bold'
                        : 'text-blue-100 hover:bg-white/10'
                    }`}
                  >
                    Convivencia, Admisión SAE y Dual TP
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Botón Cerrar Sesión */}
        <div className="p-4 border-t border-white/15">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#EB567F] hover:bg-[#d6416a] text-white text-xs font-bold shadow transition-colors cursor-pointer"
          >
            Cerrar Sesión PADEDUCA
          </button>
        </div>
      </aside>

      {/* Contenedor Principal Derecho */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Barra Superior de Contexto Escolar */}
        <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-[#016098]/10 text-[#016098] font-bold">
              Año Escolar 2026
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-slate-700">
              {currentEstabObj
                ? `RBD ${currentEstabObj.ESED_COD} · ${currentEstabObj.ESED_DESCRIPCION}`
                : '99999 · CORPORACIÓN MUNICIPAL DE DESARROLLO SOCIAL (CONSOLIDADO COMUNAL)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Libro Digital Circular N° 30 Activo
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#016098] font-semibold">
              PostgreSQL 18 (`bd_cmds_educa`)
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 md:p-6 print:p-0 print:overflow-visible">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
