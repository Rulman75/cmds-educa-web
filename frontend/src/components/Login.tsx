import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('10633447');
  const [password, setPassword] = useState('2114');
  const [esedSec, setEsedSec] = useState('1');
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/establecimientos')
      .then((r) => r.json())
      .then((json) => {
        if (json.status === 'ok' && Array.isArray(json.data)) {
          setEstablecimientos(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, esedSec: Number(esedSec) })
      });
      const json = await res.json();
      if (json.status === 'ok' && json.token) {
        localStorage.setItem('educa_token', json.token);
        localStorage.setItem('educa_user', JSON.stringify(json.user));
        localStorage.setItem('educa_esed_sec', String(json.user.esedSec || esedSec));
        navigate('/inicio');
      } else {
        setError(json.message || 'Credenciales inválidas.');
      }
    } catch {
      setError('No se pudo conectar con el servidor PADEDUCA (Puerto 3006).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#016098] via-[#024a8d] to-[#0f172a] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <div className="bg-[#016098] px-6 py-7 text-center text-white relative">
          <img
            src="/logo.png"
            alt="Logo CMDS"
            className="max-w-[95px] mx-auto mb-3 bg-white p-2 rounded-xl shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#39BABD] text-white uppercase tracking-wider">
            Dirección de Educación · CMDS Antofagasta
          </span>
          <h1 className="text-xl font-extrabold mt-2 tracking-tight">
            PADEDUCA · Libro de Clases Digital
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            Sistema de Gestión Escolar y Sostenedor (`bd_cmds_educa` · PostgreSQL 18)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              RUT Usuario (Sin dígito verificador)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#016098]"
              placeholder="Ej: 10633447"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contraseña PADEDUCA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#016098]"
              placeholder="••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Establecimiento Educacional / Vista Sostenedor (`control_perfil_colegios`)
            </label>
            <select
              value={esedSec}
              onChange={(e) => setEsedSec(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#016098]"
            >
              {establecimientos.length === 0 ? (
                <>
                  <option value="1">99999 - Corporación CMDS (Consolidado 52 Colegios)</option>
                  <option value="7">285 - LICEO BICENTENARIO MARTA NAREA DIAZ</option>
                  <option value="22">304 - LICEO BICENTENARIO ANDRES SABELLA</option>
                  <option value="10">288 - ESCUELA JAPÓN</option>
                  <option value="2">279 - LICEO INDUSTRIAL EULOGIO GORDO MONEO</option>
                </>
              ) : (
                establecimientos.map((e) => (
                  <option key={e.ESED_SEC} value={e.ESED_SEC}>
                    {e.ESED_COD} - {e.ESED_DESCRIPCION}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#016098] hover:bg-[#024a8d] text-white font-bold text-sm rounded-lg shadow-md transition-colors cursor-pointer"
          >
            {loading ? 'Ingresando a PADEDUCA...' : 'Ingresar al Portal Educacional'}
          </button>

          <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-500">
            Acceso migrado desde <code className="text-[#016098]">cmds.pad.cl:2443</code> &rarr;{' '}
            <strong className="text-emerald-700">PostgreSQL 18 (bd_cmds_educa)</strong>
          </div>
        </form>
      </div>
    </div>
  );
}
