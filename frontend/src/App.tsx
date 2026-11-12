import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import InicioEduca from './pages/InicioEduca';
import EstablecimientoCursos from './pages/EstablecimientoCursos';
import AlumnosMatricula from './pages/AlumnosMatricula';
import LibroAsistencia from './pages/LibroAsistencia';
import LibroNotas from './pages/LibroNotas';
import LibroLeccionario from './pages/LibroLeccionario';
import ProgramaPie from './pages/ProgramaPie';
import SigeMineduc from './pages/SigeMineduc';
import ProfesoresDocentes from './pages/ProfesoresDocentes';
import ConvivenciaSae from './pages/ConvivenciaSae';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('educa_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="inicio" element={<InicioEduca />} />
          <Route path="establecimiento" element={<EstablecimientoCursos />} />
          <Route path="alumnos" element={<AlumnosMatricula />} />
          <Route path="libro/asistencia" element={<LibroAsistencia />} />
          <Route path="libro/notas" element={<LibroNotas />} />
          <Route path="libro/leccionario" element={<LibroLeccionario />} />
          <Route path="pie" element={<ProgramaPie />} />
          <Route path="sige" element={<SigeMineduc />} />
          <Route path="profesores" element={<ProfesoresDocentes />} />
          <Route path="convivencia-sae" element={<ConvivenciaSae />} />
        </Route>
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
