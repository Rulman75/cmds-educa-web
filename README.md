# PADEDUCA (`ADM_EDUCA` + `ADM_NOTAS`) — Gestión Escolar y Libro de Clases Digital CMDS

Sistema corporativo de Gestión Escolar Comunal y Libro de Clases Electrónico (Circular N°30 SUPEREDUC) para los 53 establecimientos educacionales de CMDS Antofagasta, respaldado por **PostgreSQL 18.6**.

## Características Principales
- **Puerto por defecto:** `3006` (`http://localhost:3006`)
- **Base de Datos PostgreSQL 18.6 (`192.168.30.48:5432`):** `bd_cmds_educa` (**566 tablas**, **863.309 filas reales** en `adm_educa`, `adm_notas` y `adm_auth`)
- **Módulos Implementados:**
  1. **Fase 1 (Núcleo Escolar y Libro Digital):** Dashboard Comunal/RBD, Establecimientos, Cursos, Planes de Estudio y Horarios, Matrícula de Alumnos y Certificados con Verificación QR (`EDC_DOCTO_VERIFICADO`), Asistencia por Bloque con Firma Digital OTP (`EDC_ASISTENCIA_BLOQUE`, `EDC_TOKEN_ASBL`), Calificaciones (`EDC_NOTAS_ASIG_CURSO`) y Leccionario / Parvularia / Hoja de Vida / Control de Atrasos.
  2. **Fase 2 (Módulos Especializados):** Programa de Integración Escolar PIE Decreto 170/83 (`PIE_*`), Interoperabilidad SIGE MINEDUC (`EDC_SIGE_*`), Gestión y Evaluación Docente (`EDC_FICHA_PROFESORES`, `EDC_EVALUACION_PROF`) y Convivencia Escolar, Formación Dual TP y Admisión SAE.

## Ejecución Rápida
```powershell
cd backend
node server.js
```
