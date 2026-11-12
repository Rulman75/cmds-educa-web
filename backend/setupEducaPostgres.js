const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PG_CONFIG = {
  host: process.env.PG_HOST || '192.168.30.48',
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || 'cmds_admin',
  password: process.env.PG_PASS || 'CmdsPostgres2026!'
};
const TARGET_DB = process.env.PG_DB || 'bd_cmds_educa';

const SCRATCH_DATA_DIR = path.resolve(__dirname, '..', '..', 'migracion-sistemas-pad', 'data');

function mapOracleTypeToPostgres(col) {
  const t = (col.type || 'VARCHAR2').toUpperCase();
  const len = parseInt(col.length, 10) || 255;
  const prec = parseInt(col.precision, 10);
  const scale = parseInt(col.scale, 10);

  if (t.includes('VARCHAR') || t === 'CHAR' || t === 'NCHAR' || t === 'NVARCHAR2' || t === 'ROWID') {
    if (len > 4000) return 'TEXT';
    return `VARCHAR(${Math.max(len, 1)})`;
  }
  if (t === 'NUMBER' || t === 'FLOAT' || t === 'BINARY_DOUBLE' || t === 'BINARY_FLOAT') {
    if (!Number.isNaN(prec) && prec > 0) {
      if (!Number.isNaN(scale) && scale > 0) {
        return `NUMERIC(${prec}, ${scale})`;
      }
      if (scale === 0 && prec <= 9) return 'INTEGER';
      if (scale === 0 && prec <= 18) return 'BIGINT';
      return `NUMERIC(${prec}, 0)`;
    }
    return 'NUMERIC';
  }
  if (t === 'DATE' || t.startsWith('TIMESTAMP')) {
    return 'TIMESTAMP WITHOUT TIME ZONE';
  }
  if (t === 'CLOB' || t === 'NCLOB' || t === 'LONG' || t === 'XMLTYPE') {
    return 'TEXT';
  }
  if (t === 'BLOB' || t === 'RAW' || t === 'LONG RAW' || t === 'BFILE') {
    return 'TEXT';
  }
  return 'TEXT';
}

function sanitizeIdent(name) {
  const clean = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  if (/^[0-9]/.test(clean)) return `_${clean}`;
  const reserved = new Set([
    'user', 'order', 'group', 'table', 'select', 'where', 'from', 'limit', 'offset',
    'default', 'check', 'primary', 'foreign', 'references', 'column', 'constraint',
    'desc', 'asc', 'date', 'time', 'timestamp', 'end', 'case', 'when', 'then', 'else',
    'all', 'any', 'some', 'in', 'is', 'null', 'not', 'and', 'or', 'on', 'to', 'for',
    'as', 'by', 'with', 'grant', 'revoke', 'union', 'intersect', 'except', 'distinct',
    'into', 'values', 'set', 'do', 'window', 'array', 'cast'
  ]);
  if (reserved.has(clean)) return `"${clean}"`;
  return clean;
}

async function ensureDatabaseExists() {
  const adminClient = new Client({ ...PG_CONFIG, database: 'postgres' });
  await adminClient.connect();
  try {
    const check = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [TARGET_DB]);
    if (check.rowCount === 0) {
      console.log(`[1/5] Creando base de datos PostgreSQL "${TARGET_DB}" en ${PG_CONFIG.host}:${PG_CONFIG.port}...`);
      await adminClient.query(`CREATE DATABASE ${TARGET_DB} ENCODING 'UTF8'`);
      console.log(`      ✓ Base de datos "${TARGET_DB}" creada exitosamente.`);
    } else {
      console.log(`[1/5] Base de datos "${TARGET_DB}" ya existe en ${PG_CONFIG.host}:${PG_CONFIG.port}.`);
    }
  } finally {
    await adminClient.end();
  }
}

async function replaceRow(client, table, keyCol, keyVal, insertSql, params) {
  await client.query(`DELETE FROM ${table} WHERE ${keyCol} = $1`, [keyVal]);
  await client.query(insertSql, params);
}

async function main() {
  await ensureDatabaseExists();

  const client = new Client({ ...PG_CONFIG, database: TARGET_DB });
  await client.connect();

  try {
    console.log(`[2/5] Creando esquemas (adm_educa, adm_notas, adm_auth) y funciones en "${TARGET_DB}"...`);
    for (const s of ['adm_educa', 'adm_notas', 'adm_auth']) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${s};`);
    }

    const compatSql = `
      CREATE OR REPLACE FUNCTION public.to_char(val numeric) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT val::text; $$;
      CREATE OR REPLACE FUNCTION public.to_char(val bigint) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT val::text; $$;
      CREATE OR REPLACE FUNCTION public.to_char(val integer) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT val::text; $$;
      CREATE OR REPLACE FUNCTION public.to_char(val text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT val; $$;
      CREATE OR REPLACE FUNCTION public.to_char(val timestamp without time zone, fmt text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT pg_catalog.to_char(val, fmt); $$;
      CREATE OR REPLACE FUNCTION public.to_char(val timestamp with time zone, fmt text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT pg_catalog.to_char(val, fmt); $$;
    `;
    await client.query(compatSql);

    console.log(`[3/5] Creando las 545 tablas de ADM_EDUCA y ADM_NOTAS desde el diccionario Oracle...`);
    const s2 = JSON.parse(fs.readFileSync(path.join(SCRATCH_DATA_DIR, 'oracle_other_schemas.json'), 'utf8'));
    const s1 = JSON.parse(fs.readFileSync(path.join(SCRATCH_DATA_DIR, 'oracle_schema.json'), 'utf8'));

    const allTables = [];
    for (const owner of ['ADM_EDUCA', 'ADM_NOTAS']) {
      const schemaObj = s2[owner] || {};
      for (const [, tbl] of Object.entries(schemaObj.tables || {})) {
        allTables.push({ ...tbl, owner });
      }
    }
    for (const [, tbl] of Object.entries(s1.tables || {})) {
      if (tbl.owner === 'ADM_AUTH') {
        allTables.push(tbl);
      }
    }

    const existingCheck = await client.query(`
      SELECT COUNT(*) AS cnt FROM information_schema.tables
      WHERE table_schema IN ('adm_educa','adm_notas','adm_auth')
    `);
    const alreadyCreated = Number(existingCheck.rows[0]?.cnt || 0);
    let createdCount = 0;

    for (const tbl of allTables) {
      const schemaName = sanitizeIdent(tbl.owner);
      const tableName = sanitizeIdent(tbl.table_name);
      if (!tbl.columns || tbl.columns.length === 0) continue;

      const seenCols = new Set();
      const colDefs = [];
      for (const col of tbl.columns) {
        const colName = sanitizeIdent(col.name);
        if (seenCols.has(colName)) continue;
        seenCols.add(colName);
        const pgType = mapOracleTypeToPostgres(col);
        colDefs.push(`  ${colName} ${pgType}`);
      }

      const pkConstraint = (tbl.constraints || []).find((c) => c.type === 'P' && c.columns);
      if (pkConstraint) {
        const pkCols = pkConstraint.columns
          .split(',')
          .map((c) => sanitizeIdent(c.trim()))
          .filter((c) => seenCols.has(c));
        if (pkCols.length > 0) {
          colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
        }
      }

      const createSql = `CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (\n${colDefs.join(',\n')}\n);`;
      if (alreadyCreated < 500) {
        try {
          await client.query(createSql);
          createdCount++;
        } catch (err) {
          console.warn(`  [Aviso] ${schemaName}.${tableName}: ${err.message}`);
        }
      } else {
        createdCount++;
      }
    }
    console.log(`      ✓ ${createdCount} tablas creadas/verificadas en "${TARGET_DB}".`);

    // Ampliar columnas VARCHAR cortas en tablas clave de adm_educa para permitir glosas completas
    await client.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.table_schema, c.table_name, c.column_name
          FROM information_schema.columns c
          WHERE c.table_schema IN ('adm_educa', 'adm_notas', 'adm_auth')
            AND c.table_name IN (
              'edc_estab_educa', 'edc_aplicaciones', 'edc_parametros', 'edc_periodos',
              'edc_tipo_ensenanza', 'edc_grados_tien', 'edc_grados_cursos', 'edc_asignaturas',
              'edc_curso_asignatura', 'edc_personas', 'edc_ficha_profesores', 'edc_ficha_alumno',
              'edc_contacto_alumnos', 'edc_matricula_alumnos', 'edc_alumnos_cursos',
              'edc_asistencia_curso', 'edc_asistencia_bloque', 'edc_token_asbl',
              'edc_notas_asig_curso', 'edc_promedio_final_asig', 'edc_leccionario_clases',
              'edc_leccionario_parv', 'edc_token_leccionario', 'edc_observacion_alum',
              'edc_ctrl_atrasos_alumnos', 'edc_ctrl_horario_salida', 'edc_citaciones_apoderados',
              'edc_docto_verificado', 'edc_usuarios', 'edc_perfil', 'edc_usua_estab',
              'edc_horarios_cursos', 'aut_usuarios'
            )
            AND c.data_type = 'character varying'
            AND c.character_maximum_length < 250
        LOOP
          BEGIN
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE VARCHAR(250)', r.table_schema, r.table_name, r.column_name);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END LOOP;
      END $$;
    `);

    console.log(`[4/5] Poblando los 53 Establecimientos Reales CMDS y Catálogos Oficiales de ADM_EDUCA...`);
    const htmlMenu = fs.readFileSync(path.join(SCRATCH_DATA_DIR, 'menu_adm_educa.html'), 'utf8');
    const optMatches = [...htmlMenu.matchAll(/<option value="(\d+)">\s*(\d+)\s*-\s*([^<]+)<\/option>/g)];

    const seenEsed = new Set();
    for (const m of optMatches) {
      const esedSec = Number(m[1]);
      const rbd = m[2].trim();
      const nombre = m[3].trim();
      if (seenEsed.has(esedSec)) continue;
      seenEsed.add(esedSec);

      const esLiceo = /LICEO|INSTITUTO|CEIA|C\.E\.I\.A/i.test(nombre);
      const esParv = /PARVULO|SEMILLITA|MARCELA PAZ|PINGUINITOS|BLANCA NIEVES/i.test(nombre);
      const ive = esParv ? 82 : esLiceo ? 86 : 89;

      await replaceRow(
        client,
        'adm_educa.edc_estab_educa',
        'esed_sec',
        esedSec,
        `INSERT INTO adm_educa.edc_estab_educa (
          esed_sec, esed_cod, esad_cod, esed_descripcion, esed_desc_corta,
          esed_direccion, comu_cod, ciud_cod, regi_cod, esed_fono, esed_email,
          esed_libro_digital, esde_estado_estab, esed_area_geografica,
          esed_dependencia_estab, esed_porcentaje_ive, esed_vigente
        ) VALUES ($1, $2, 'CMDS', $3, $4, $5, '02101', 'ANTOFAGASTA', '02', $6, $7, 'S', 'FUNCIONANDO', 'URBANA', 'MUNICIPAL CORPORACION', $8, 'S')`,
        [
          esedSec,
          rbd,
          nombre,
          nombre.slice(0, 35),
          `AV. ANTOFAGASTA #${100 + esedSec * 12}, ANTOFAGASTA`,
          `55263${String(100 + esedSec).slice(-3)}`,
          `direccion.rbd${rbd}@cmds.cl`,
          ive
        ]
      );
    }
    console.log(`      ✓ ${seenEsed.size} Establecimientos Educacionales CMDS insertados en adm_educa.edc_estab_educa.`);

    // Catálogo de Aplicaciones y Parámetros desde oracle_other_catalogs.json
    const otherCats = JSON.parse(fs.readFileSync(path.join(SCRATCH_DATA_DIR, 'oracle_other_catalogs.json'), 'utf8'));
    for (const app of otherCats.educa_apps || []) {
      await replaceRow(
        client,
        'adm_educa.edc_aplicaciones',
        'apli_cod',
        String(app.APLI_COD),
        `INSERT INTO adm_educa.edc_aplicaciones (
          apli_cod, apli_desc, apli_label, apli_padre, apli_link, apli_icono, sist_cod, apli_pos_aplic
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          String(app.APLI_COD),
          app.APLI_DESC || '',
          app.APLI_LABEL || app.APLI_DESC || '',
          app.APLI_PADRE ? String(app.APLI_PADRE) : null,
          app.APLI_LINK || '',
          app.APLI_ICONO || '',
          app.SIST_COD || 'EDUCA',
          Number(app.APLI_POS_APLIC || 1)
        ]
      );
    }
    for (const p of otherCats.educa_parametros || []) {
      await replaceRow(
        client,
        'adm_educa.edc_parametros',
        'para_codigo',
        String(p.PARA_CODIGO),
        `INSERT INTO adm_educa.edc_parametros (para_codigo, para_desc, para_valor) VALUES ($1, $2, $3)`,
        [String(p.PARA_CODIGO), p.PARA_DESC || '', p.PARA_VALOR || '']
      );
    }

    // Períodos Escolares
    const periodos = [
      [2024, '2024', 'AÑO ESCOLAR 2024 (CERRADO)', 'C', 1],
      [2025, '2025', 'AÑO ESCOLAR 2025 (CERRADO / PROMOCIÓN ACTA MINEDUC)', 'C', 1],
      [2026, '2026', 'AÑO ESCOLAR 2026 (VIGENTE - LIBRO DE CLASES DIGITAL)', 'A', 1]
    ];
    for (const p of periodos) {
      await replaceRow(
        client,
        'adm_educa.edc_periodos',
        'peri_sec',
        p[0],
        `INSERT INTO adm_educa.edc_periodos (peri_sec, peri_desc_corta, peri_desc_larga, peri_estado, esed_sec, peri_fec_ing)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        p
      );
    }

    // Tipos de Enseñanza MINEDUC
    const tiposEns = [
      ['10', 'EDUCACIÓN PARVULARIA (NT1 / NT2)', 'PARV', 'NORMAL', 'PARVULARIA', 'GENERAL'],
      ['110', 'ENSEÑANZA BÁSICA (1° A 8° BÁSICO)', 'BAS', 'NORMAL', 'BASICA', 'GENERAL'],
      ['212', 'EDUCACIÓN ESPECIAL / DIFERENCIAL (PIE / TEL)', 'ESP', 'ESPECIAL', 'ESPECIAL', 'DIFERENCIAL'],
      ['310', 'ENSEÑANZA MEDIA HUMANÍSTICO-CIENTÍFICA (1° A 4° MEDIO HC)', 'MHC', 'NORMAL', 'MEDIA', 'HC'],
      ['410', 'ENSEÑANZA MEDIA TÉCNICO-PROFESIONAL COMERCIAL', 'MTC', 'NORMAL', 'MEDIA', 'TP COMERCIAL'],
      ['510', 'ENSEÑANZA MEDIA TÉCNICO-PROFESIONAL INDUSTRIAL', 'MTI', 'NORMAL', 'MEDIA', 'TP INDUSTRIAL'],
      ['610', 'ENSEÑANZA MEDIA TÉCNICO-PROFESIONAL TÉCNICA', 'MTT', 'NORMAL', 'MEDIA', 'TP TECNICA']
    ];
    for (const te of tiposEns) {
      await replaceRow(
        client,
        'adm_educa.edc_tipo_ensenanza',
        'tien_cod',
        te[0],
        `INSERT INTO adm_educa.edc_tipo_ensenanza (tien_cod, tien_descripcion, tien_cod_interno, tien_tipo_modalidad, tien_tipo_nivel, tien_tipo_rama, tien_fec_ing)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        te
      );
    }

    // Asignaturas Oficiales MINEDUC
    const asignaturas = [
      ['LEN', 'LENGUAJE Y COMUNICACIÓN / LENGUA Y LITERATURA', 'OBLIGATORIA'],
      ['MAT', 'MATEMÁTICA', 'OBLIGATORIA'],
      ['HIS', 'HISTORIA, GEOGRAFÍA Y CIENCIAS SOCIALES', 'OBLIGATORIA'],
      ['CIE', 'CIENCIAS NATURALES / BIOLOGÍA, FÍSICA Y QUÍMICA', 'OBLIGATORIA'],
      ['ING', 'IDIOMA EXTRANJERO: INGLÉS', 'OBLIGATORIA'],
      ['ART', 'ARTES VISUALES Y MÚSICA', 'OBLIGATORIA'],
      ['EFI', 'EDUCACIÓN FÍSICA Y SALUD', 'OBLIGATORIA'],
      ['TEC', 'TECNOLOGÍA Y CIUDADANÍA DIGITAL', 'OBLIGATORIA'],
      ['ORI', 'ORIENTACIÓN Y CONVIVENCIA ESCOLAR', 'OBLIGATORIA'],
      ['PIE', 'AULA DE RECURSOS Y APOYO PIE (DECRETO 170)', 'DIFERENCIAL'],
      ['ESP-TP', 'MÓDULO ESPECIALIDAD TÉCNICO PROFESIONAL', 'ESPECIALIDAD'],
      ['PARV-INT', 'ÁMBITO COMUNICACIÓN INTEGRAL E INTERACCIÓN (NT1/NT2)', 'PARVULARIA']
    ];
    for (const a of asignaturas) {
      await replaceRow(
        client,
        'adm_educa.edc_asignaturas',
        'asig_cod',
        a[0],
        `INSERT INTO adm_educa.edc_asignaturas (asig_cod, asig_descripcion, asig_tipo) VALUES ($1, $2, $3)`,
        a
      );
    }

    console.log(`[5/5] Poblando Cursos, Docentes, Alumnos, Matrículas y Libro de Clases Digital (Circular N° 30)...`);

    // Personas: Usuarios, Profesores, Alumnos y Apoderados
    const personas = [
      // Usuarios / Directivos
      [1, 10633447, '1', 'RAUL', 'HORMAZABAL', 'FIGUEROA', 'M', '1978-05-14'],
      // Docentes
      [101, 12450891, '2', 'CAROLINA ANDREA', 'ROJAS', 'PIZARRO', 'F', '1982-03-19'],
      [102, 13892104, 'K', 'RODRIGO ALEJANDRO', 'VALENZUELA', 'CASTRO', 'M', '1979-11-04'],
      [103, 15210983, '5', 'MARCELA PAZ', 'CORTES', 'ARAYA', 'F', '1986-07-22'],
      [104, 16784321, '8', 'JORGE LUIS', 'TAPIA', 'GODOY', 'M', '1988-01-30'],
      [105, 14556789, '3', 'PATRICIA ELENA', 'MUÑOZ', 'RIVERA', 'F', '1984-09-12'],
      [106, 17890123, '1', 'CAMILA FERNANDA', 'DIAZ', 'CONTRERAS', 'F', '1991-04-18'],
      // Alumnos
      [1001, 23451092, '4', 'MATEO IGNACIO', 'GONZALEZ', 'ARAYA', 'M', '2011-04-12'],
      [1002, 23890145, 'K', 'SOFIA ANTONIA', 'ROJAS', 'CARRASCO', 'F', '2011-08-25'],
      [1003, 24102938, '7', 'BENJAMIN ALONSO', 'CORTES', 'OLIVARES', 'M', '2012-01-19'],
      [1004, 24567123, '2', 'VALENTINA PAZ', 'CASTILLO', 'MORALES', 'F', '2010-11-03'],
      [1005, 24891234, '9', 'LUCAS SEBASTIAN', 'PIZARRO', 'VEGA', 'M', '2010-06-15'],
      [1006, 25120394, '5', 'MARTINA ISIDORA', 'MUÑOZ', 'TAPIA', 'F', '2014-03-28'],
      [1007, 25490128, '1', 'TOMAS AGUSTIN', 'DIAZ', 'FUENTES', 'M', '2014-09-10'],
      [1008, 25781239, 'K', 'EMILIA FLORENCIA', 'CONTRERAS', 'SILVA', 'F', '2015-02-14'],
      [1009, 26019283, '3', 'JOAQUIN EDUARDO', 'HERRERA', 'LOPEZ', 'M', '2009-07-07'],
      [1010, 26345901, '8', 'CATALINA BELEN', 'GOMEZ', 'ESPINOZA', 'F', '2009-12-21'],
      [1011, 26789012, '6', 'GASPAR EMILIANO', 'VERGARA', 'SOTO', 'M', '2020-05-19'],
      [1012, 26901234, '0', 'AMANDA TRINIDAD', 'NAVARRO', 'BRAVO', 'F', '2020-10-02'],
      // Apoderados
      [2001, 14231098, '5', 'CLAUDIA ANDREA', 'ARAYA', 'PEREZ', 'F', '1983-02-11'],
      [2002, 13987451, '2', 'MARCO ANTONIO', 'ROJAS', 'DIAZ', 'M', '1980-06-24'],
      [2003, 15678234, 'K', 'LORENA BEATRIZ', 'OLIVARES', 'CASTRO', 'F', '1985-10-09'],
      [2004, 16123890, '7', 'ROBERTO CARLOS', 'CASTILLO', 'GOMEZ', 'M', '1987-04-03'],
      [2005, 14890321, '1', 'PAOLA XIMENA', 'VEGA', 'TORRES', 'F', '1982-12-17'],
      [2006, 17234901, '9', 'DANIELA CAROLINA', 'TAPIA', 'ROJAS', 'F', '1990-08-30']
    ];
    for (const p of personas) {
      await replaceRow(
        client,
        'adm_educa.edc_personas',
        'pers_sec',
        p[0],
        `INSERT INTO adm_educa.edc_personas (pers_sec, pers_rut, pers_dv, pers_nombres, pers_ape_pat, pers_ape_mat, pers_genero, pers_fec_nac, pers_fec_ing, pers_user_ing)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, NOW(), 'ADMIN')`,
        p
      );
    }

    // Usuario 10633447 (Pass 2114 en ADM_EDUCA y 7888 en ADM_AUTH)
    await replaceRow(
      client,
      'adm_educa.edc_usuarios',
      'usua_usuarios',
      10633447,
      `INSERT INTO adm_educa.edc_usuarios (usua_usuarios, usua_clave, usua_es_nuevo, usua_fec_ing, pers_sec)
       VALUES ($1, '2114', 'N', NOW(), 1)`,
      [10633447]
    );
    await replaceRow(
      client,
      'adm_auth.aut_usuarios',
      'usua_rut',
      '10633447',
      `INSERT INTO adm_auth.aut_usuarios (usua_id, usua_rut, usua_dv, usua_pwd, usa_nombre, usa_apellidos, usa_email, usa_telefono, usa_tipo, usua_estado)
       VALUES ('167', $1, '1', '2114', 'RAUL', 'HORMAZABAL FIGUEROA', 'rhormazabal@cmds.cl', '552639100', 'A', 'A')`,
      ['10633447']
    );

    // Perfiles en ADM_EDUCA
    const perfiles = [
      [1, 'SOST', 'ADMINISTRADOR CORPORATIVO SOSTENEDOR CMDS', 1],
      [2, 'DIR', 'DIRECTOR(A) DE ESTABLECIMIENTO EDUCACIONAL', 7],
      [3, 'UTP', 'JEFE(A) UNIDAD TÉCNICO PEDAGÓGICA (UTP)', 7],
      [4, 'INSP', 'INSPECTORÍA GENERAL Y CONVIVENCIA ESCOLAR', 7],
      [5, 'DOC', 'DOCENTE DE AULA / PROFESOR JEFE (LIBRO DIGITAL)', 7],
      [6, 'PIE', 'COORDINADOR(A) PROGRAMA INTEGRACIÓN ESCOLAR (PIE)', 7]
    ];
    for (const pf of perfiles) {
      await replaceRow(
        client,
        'adm_educa.edc_perfil',
        'prfl_sec',
        pf[0],
        `INSERT INTO adm_educa.edc_perfil (prfl_sec, prfl_cod, prfl_desc, esed_sec, prfl_fec_ing, prfl_user_ing)
         VALUES ($1, $2, $3, $4, NOW(), 'ADMIN')`,
        pf
      );
    }

    // Fichas de Profesores (distribuidos en Liceo Bicentenario Marta Narea #7, Liceo Andrés Sabella #22, Escuela Japón #10, Liceo Industrial #2, Escuela Semillita #45)
    const profesores = [
      [501, 7, 101, 'AV. BRASIL 1420', 'crojas@cmds.cl', '552639201', '+56982341011'],
      [502, 7, 102, 'CALLE PRAT 845', 'rvalenzuela@cmds.cl', '552639202', '+56982341012'],
      [503, 22, 103, 'AV. ANGAMOS 910', 'mcortes@cmds.cl', '552639203', '+56982341013'],
      [504, 10, 104, 'CALLE LATORRE 612', 'jtapia@cmds.cl', '552639204', '+56982341014'],
      [505, 2, 105, 'AV. PEDRO AGUIRRE CERDA 5400', 'pmunoz@cmds.cl', '552639205', '+56982341015'],
      [506, 45, 106, 'PJE. LOS NARANJOS 321', 'cdiaz@cmds.cl', '552639206', '+56982341016']
    ];
    for (const pr of profesores) {
      await replaceRow(
        client,
        'adm_educa.edc_ficha_profesores',
        'prof_sec',
        pr[0],
        `INSERT INTO adm_educa.edc_ficha_profesores (prof_sec, esed_sec, pers_sec, prof_direccion, comu_cod, ciud_cod, regi_cod, prof_email, prof_fono, prof_celular)
         VALUES ($1, $2, $3, $4, '02101', 'ANTOFAGASTA', '02', $5, $6, $7)`,
        pr
      );
    }

    // Cursos por Establecimiento (Año Escolar 2026)
    const cursos = [
      //grcu_sec, peri_sec, esed_sec, tien_cod, grte_cod, letra, tipo_peri, jornada, estado, prof_sec, vacantes
      [301, 2026, 7, '310', '1M', 'A', 'SEMESTRAL', 'JORNADA COMPLETA', 'VIGENTE', 501, 42],
      [302, 2026, 7, '310', '2M', 'B', 'SEMESTRAL', 'JORNADA COMPLETA', 'VIGENTE', 502, 42],
      [303, 2026, 22, '310', '3M', 'A', 'SEMESTRAL', 'JORNADA COMPLETA', 'VIGENTE', 503, 40],
      [304, 2026, 22, '110', '8B', 'A', 'SEMESTRAL', 'JORNADA COMPLETA', 'VIGENTE', 503, 40],
      [305, 2026, 10, '110', '4B', 'A', 'SEMESTRAL', 'MAÑANA', 'VIGENTE', 504, 38],
      [306, 2026, 10, '110', '6B', 'B', 'SEMESTRAL', 'MAÑANA', 'VIGENTE', 504, 38],
      [307, 2026, 2, '510', '4M', 'A', 'SEMESTRAL', 'JORNADA COMPLETA', 'VIGENTE', 505, 36],
      [308, 2026, 45, '10', 'NT2', 'A', 'SEMESTRAL', 'MAÑANA', 'VIGENTE', 506, 30]
    ];
    for (const c of cursos) {
      await replaceRow(
        client,
        'adm_educa.edc_grados_cursos',
        'grcu_sec',
        c[0],
        `INSERT INTO adm_educa.edc_grados_cursos (
          grcu_sec, peri_sec, esed_sec, tien_cod, grte_cod, grcu_letra_curso,
          grcu_tipo_peri, grcu_jornada, grcu_estado, prof_sec, grcu_cnt_vacantes,
          grcu_tipo_asist, grcu_estado_sige, grcu_fec_ing
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'BLOQUE', 'HABILITADO SIGE', NOW())`,
        c
      );
    }

    // Asignaturas por Curso (EDC_CURSO_ASIGNATURA)
    const cursoAsignaturas = [
      // cuas_sec, grcu_sec, asig_cod, horas, prof_sec
      [401, 301, 'LEN', 6, 501],
      [402, 301, 'MAT', 7, 502],
      [403, 301, 'HIS', 4, 501],
      [404, 301, 'CIE', 6, 502],
      [405, 301, 'ING', 4, 501],
      [406, 302, 'MAT', 7, 502],
      [407, 303, 'LEN', 6, 503],
      [408, 304, 'MAT', 6, 503],
      [409, 305, 'LEN', 8, 504],
      [410, 305, 'MAT', 6, 504],
      [411, 307, 'ESP-TP', 12, 505],
      [412, 308, 'PARV-INT', 10, 506]
    ];
    for (const ca of cursoAsignaturas) {
      await replaceRow(
        client,
        'adm_educa.edc_curso_asignatura',
        'cuas_sec',
        ca[0],
        `INSERT INTO adm_educa.edc_curso_asignatura (
          cuas_sec, grcu_sec, asig_cod, cuas_tipo_peri, cuas_tipo_calif,
          cuas_aplica_prom, cuas_aplica_informe, cuas_horas_asig, cuas_acta_sige, cuas_fec_ing
        ) VALUES ($1, $2, $3, 'SEMESTRAL', 'NUMERICA (1.0 - 7.0)', 'S', 'S', $4, 'S', NOW())`,
        [ca[0], ca[1], ca[2], ca[3]]
      );
      await replaceRow(
        client,
        'adm_educa.edc_curso_profesores',
        'cuas_sec',
        ca[0],
        `INSERT INTO adm_educa.edc_curso_profesores (cuas_sec, prof_sec, cupr_fec_ini, cupr_es_principal, cupr_fec_ing)
         VALUES ($1, $2, '2026-03-02'::timestamp, 'S', NOW())`,
        [ca[0], ca[4]]
      );
    }

    // Horarios Semanales (EDC_HORARIOS_CURSOS)
    const horarios = [
      [301, 'SEM1', 1, 'LENGUAJE (08:00-09:30)', 'MATEMÁTICA (08:00-09:30)', 'CIENCIAS (08:00-09:30)', 'MATEMÁTICA (08:00-09:30)', 'HISTORIA (08:00-09:30)'],
      [301, 'SEM1', 2, 'MATEMÁTICA (09:45-11:15)', 'LENGUAJE (09:45-11:15)', 'INGLÉS (09:45-11:15)', 'CIENCIAS (09:45-11:15)', 'LENGUAJE (09:45-11:15)'],
      [301, 'SEM1', 3, 'HISTORIA (11:30-13:00)', 'CIENCIAS (11:30-13:00)', 'MATEMÁTICA (11:30-13:00)', 'INGLÉS (11:30-13:00)', 'ED. FÍSICA (11:30-13:00)'],
      [301, 'SEM1', 4, 'ARTES (14:00-15:30)', 'TECNOLOGÍA (14:00-15:30)', 'LENGUAJE (14:00-15:30)', 'ORIENTACIÓN (14:00-15:30)', 'TALLER JEC (14:00-15:30)'],
      [303, 'SEM1', 1, 'LENGUAJE (08:00-09:30)', 'CIENCIAS (08:00-09:30)', 'MATEMÁTICA (08:00-09:30)', 'HISTORIA (08:00-09:30)', 'INGLÉS (08:00-09:30)'],
      [305, 'SEM1', 1, 'LENGUAJE (08:00-09:30)', 'MATEMÁTICA (08:00-09:30)', 'LENGUAJE (08:00-09:30)', 'CIENCIAS (08:00-09:30)', 'MATEMÁTICA (08:00-09:30)'],
      [307, 'SEM1', 1, 'TALLER INDUSTRIAL TP (08:00-11:15)', 'MATEMÁTICA APLICADA (08:00-09:30)', 'TALLER INDUSTRIAL TP (08:00-11:15)', 'LENGUAJE (08:00-09:30)', 'SEGURIDAD INDUSTRIAL (08:00-11:15)']
    ];
    await client.query(`DELETE FROM adm_educa.edc_horarios_cursos`);
    for (const h of horarios) {
      await client.query(
        `INSERT INTO adm_educa.edc_horarios_cursos (
          grcu_sec, hocu_tipo_peri, hocu_bloque, hocu_asig_lu, hocu_asig_ma, hocu_asig_mi, hocu_asig_ju, hocu_asig_vi, hocu_fec_ing
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        h
      );
    }

    // Fichas de Alumnos, Matrículas, Cursos y Apoderados
    const alumnos = [
      // fial_sec, esed_sec, pers_sec, grcu_sec, nro_lista, prioritario, preferente, pie, fonasa, nro_matr, coal_pers_sec, parentesco
      [5001, 7, 1001, 301, 1, 'S', 'N', 'N', 'FONASA B', 'MAT-2026-001', 2001, 'MADRE'],
      [5002, 7, 1002, 301, 2, 'N', 'S', 'N', 'FONASA C', 'MAT-2026-002', 2002, 'PADRE'],
      [5003, 7, 1003, 301, 3, 'S', 'N', 'S', 'FONASA A', 'MAT-2026-003', 2003, 'MADRE'],
      [5004, 7, 1004, 302, 1, 'N', 'S', 'N', 'ISAPRE', 'MAT-2026-004', 2004, 'PADRE'],
      [5005, 22, 1005, 303, 1, 'S', 'N', 'N', 'FONASA B', 'MAT-2026-005', 2005, 'MADRE'],
      [5006, 22, 1006, 304, 1, 'N', 'S', 'S', 'FONASA B', 'MAT-2026-006', 2006, 'MADRE'],
      [5007, 10, 1007, 305, 1, 'S', 'N', 'N', 'FONASA A', 'MAT-2026-007', 2001, 'MADRE'],
      [5008, 10, 1008, 305, 2, 'S', 'N', 'S', 'FONASA B', 'MAT-2026-008', 2002, 'PADRE'],
      [5009, 2, 1009, 307, 1, 'S', 'N', 'N', 'FONASA B', 'MAT-2026-009', 2003, 'MADRE'],
      [5010, 2, 1010, 307, 2, 'N', 'S', 'N', 'FONASA C', 'MAT-2026-010', 2004, 'PADRE'],
      [5011, 45, 1011, 308, 1, 'S', 'N', 'N', 'FONASA A', 'MAT-2026-011', 2005, 'MADRE'],
      [5012, 45, 1012, 308, 2, 'N', 'S', 'S', 'FONASA B', 'MAT-2026-012', 2006, 'MADRE']
    ];

    for (const al of alumnos) {
      const [fialSec, esedSec, persSec, grcuSec, nroLista, prio, pref, pie, fonasa, nroMatr, apPersSec, parentesco] = al;
      const cursoRow = cursos.find((c) => c[0] === grcuSec);
      const tienCod = cursoRow ? cursoRow[3] : '310';
      const grteCod = cursoRow ? cursoRow[4] : '1M';

      await replaceRow(
        client,
        'adm_educa.edc_ficha_alumno',
        'fial_sec',
        fialSec,
        `INSERT INTO adm_educa.edc_ficha_alumno (
          fial_sec, esed_sec, pers_sec, fial_direccion, comu_cod, ciud_cod, regi_cod,
          fial_email, fial_celular, fial_fec_incorporacion, fial_estado,
          fial_es_prioritario, fial_es_preferente, fial_nro_matr_estab,
          fial_prog_integ_escolar, fial_grupo_sanguineo, fial_tramo_fonasa,
          fial_esta_dato_sige, fial_fec_ing
        ) VALUES ($1, $2, $3, $4, '02101', 'ANTOFAGASTA', '02', $5, $6, '2026-03-02'::timestamp, 'MATRICULADO', $7, $8, $9, $10, 'O+', $11, 'VALIDADO SIGE', NOW())`,
        [
          fialSec,
          esedSec,
          persSec,
          `PASAJE SALAR DEL CARMEN #${200 + nroLista * 15}, ANTOFAGASTA`,
          `estudiante.${fialSec}@alumnos.cmds.cl`,
          `+5699123${String(fialSec).slice(-4)}`,
          prio,
          pref,
          nroMatr,
          pie,
          fonasa
        ]
      );

      await replaceRow(
        client,
        'adm_educa.edc_matricula_alumnos',
        'maal_sec',
        fialSec + 1000,
        `INSERT INTO adm_educa.edc_matricula_alumnos (
          maal_sec, esed_sec, peri_sec, fial_sec, tien_cod, grte_cod,
          maal_fec_matri, maal_nro_matri, maal_estado, maal_fec_ing
        ) VALUES ($1, $2, 2026, $3, $4, $5, '2026-02-20'::timestamp, $6, 'VIGENTE', NOW())`,
        [fialSec + 1000, esedSec, fialSec, tienCod, grteCod, fialSec - 5000]
      );

      await replaceRow(
        client,
        'adm_educa.edc_alumnos_cursos',
        'alcu_sec',
        fialSec + 2000,
        `INSERT INTO adm_educa.edc_alumnos_cursos (
          alcu_sec, grcu_sec, fial_sec, maal_sec, alcu_fec_incorp,
          alcu_orden, alcu_estado, alcu_situ_final, alcu_derecho_subven, alcu_fec_ing
        ) VALUES ($1, $2, $3, $4, '2026-03-02'::timestamp, $5, 'VIGENTE', 'EN CURSO', 'S', NOW())`,
        [fialSec + 2000, grcuSec, fialSec, fialSec + 1000, nroLista]
      );

      await replaceRow(
        client,
        'adm_educa.edc_contacto_alumnos',
        'coal_sec',
        fialSec + 3000,
        `INSERT INTO adm_educa.edc_contacto_alumnos (
          coal_sec, fiel_sec, pers_sec, coal_fono, coal_celular, coal_email,
          coal_parentesco, coal_es_apode, coal_fec_ing
        ) VALUES ($1, $2, $3, '552639000', $4, $5, $6, 'S', NOW())`,
        [
          fialSec + 3000,
          fialSec,
          apPersSec,
          `+5697654${String(fialSec).slice(-4)}`,
          `apoderado.${fialSec}@familia.cl`,
          parentesco
        ]
      );
    }

    // Certificados Verificados con Código QR (EDC_DOCTO_VERIFICADO)
    const certificados = [
      [8001, 1, 'CERT-REG-2026-9812A', 5001, '2026-11-05', '2027-03-05', '10633447'],
      [8002, 2, 'CERT-MAT-2026-4410B', 5002, '2026-11-06', '2027-03-06', '10633447'],
      [8003, 3, 'CERT-NOT-2026-7731C', 5005, '2026-11-08', '2027-03-08', '10633447'],
      [8004, 4, 'CERT-ASI-2026-5529D', 5007, '2026-11-10', '2027-03-10', '10633447']
    ];
    for (const cert of certificados) {
      await replaceRow(
        client,
        'adm_educa.edc_docto_verificado',
        'dove_sec',
        cert[0],
        `INSERT INTO adm_educa.edc_docto_verificado (
          dove_sec, tepo_sec, dove_cod, fial_sec, dove_fec_soli, dove_fec_fin, dove_fec_ing, dove_user_ing
        ) VALUES ($1, $2, $3, $4, $5::timestamp, $6::timestamp, NOW(), $7)`,
        cert
      );
    }

    // Asistencia por Bloque y Diaria + Tokens OTP de Firma Digital (Circular N° 30)
    await client.query(`DELETE FROM adm_educa.edc_asistencia_bloque`);
    await client.query(`DELETE FROM adm_educa.edc_asistencia_curso`);
    await client.query(`DELETE FROM adm_educa.edc_token_asbl`);

    const asisRows = [
      // cuas_sec, nro_bloque, fial_sec, nro_lista, fecha, estado_asis, justif, obs, hora_llega, cod_verif
      [401, 1, 5001, 1, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '08:00', 'OTP-ASBL-901283'],
      [401, 1, 5002, 2, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '08:00', 'OTP-ASBL-901283'],
      [401, 1, 5003, 3, '2026-11-10', 'A', 'S', 'LICENCIA MÉDICA PRESENTADA POR APODERADO', '-', 'OTP-ASBL-901283'],
      [402, 2, 5001, 1, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '09:45', 'OTP-ASBL-901410'],
      [402, 2, 5002, 2, '2026-11-10', 'T', 'N', 'INGRESA CON PASE DE INSPECTORÍA (09:58)', '09:58', 'OTP-ASBL-901410'],
      [402, 2, 5003, 3, '2026-11-10', 'A', 'S', 'LICENCIA MÉDICA VIGENTE', '-', 'OTP-ASBL-901410'],
      [406, 1, 5004, 1, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '08:00', 'OTP-ASBL-901522'],
      [407, 1, 5005, 1, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '08:00', 'OTP-ASBL-901633'],
      [408, 1, 5006, 1, '2026-11-10', 'P', 'N', 'PRESENTE CON APOYO PIE EN AULA', '08:00', 'OTP-ASBL-901744'],
      [409, 1, 5007, 1, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '08:00', 'OTP-ASBL-901855'],
      [409, 1, 5008, 2, '2026-11-10', 'P', 'N', 'PRESENTE EN AULA', '08:00', 'OTP-ASBL-901855'],
      [411, 1, 5009, 1, '2026-11-10', 'P', 'N', 'PRESENTE EN TALLER INDUSTRIAL', '08:00', 'OTP-ASBL-901966'],
      [411, 1, 5010, 2, '2026-11-10', 'P', 'N', 'PRESENTE EN TALLER INDUSTRIAL', '08:00', 'OTP-ASBL-901966'],
      [412, 1, 5011, 1, '2026-11-10', 'P', 'N', 'ASISTENCIA PARVULARIA NT2', '08:30', 'OTP-ASBL-902077'],
      [412, 1, 5012, 2, '2026-11-10', 'P', 'N', 'ASISTENCIA PARVULARIA NT2', '08:30', 'OTP-ASBL-902077']
    ];

    for (const r of asisRows) {
      await client.query(
        `INSERT INTO adm_educa.edc_asistencia_bloque (
          cuas_sec, asbl_nro_bloque, fial_sec, asbl_nro_lista, asbl_tipo_peri,
          asbl_fec_asistencia, asbl_asistencia, asbl_justific, asbl_observ,
          asbl_hora_llega, asbl_estado, alcu_sec, asbl_estado_sige, asbl_cod_verificacion, asbl_fec_ing
        ) VALUES ($1, $2, $3, $4, 'SEM2', $5::timestamp, $6, $7, $8, $9, 'FIRMADO', $10, 'ENVIADO SIGE', $11, NOW())`,
        [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[2] + 2000, r[9]]
      );
      await client.query(
        `INSERT INTO adm_educa.edc_asistencia_curso (
          cuas_sec, fial_sec, ascu_tipo_peri, ascu_fec_asistencia, ascu_asistencia,
          ascu_justific, ascu_observ, ascu_hora_llega, ascu_nro_lista, ascu_estado,
          alcu_sec, ascu_estado_sige, ascu_cod_verificacion, ascu_fec_ing
        ) VALUES ($1, $2, 'SEM2', $3::timestamp, $4, $5, $6, $7, $8, 'FIRMADO', $9, 'SINCRONIZADO SOAP MINEDUC', $10, NOW())`,
        [r[0], r[2], r[4], r[5], r[6], r[7], r[8], r[3], r[2] + 2000, r[9]]
      );
    }

    const tokensAsis = [
      [401, 1, '2026-11-10', '12450891-2', 'OTP-ASBL-901283', '2026-11-10 08:14:22 -0300', 'VALIDADO MINEDUC'],
      [402, 2, '2026-11-10', '13892104-K', 'OTP-ASBL-901410', '2026-11-10 10:02:11 -0300', 'VALIDADO MINEDUC'],
      [407, 1, '2026-11-10', '15210983-5', 'OTP-ASBL-901633', '2026-11-10 08:19:45 -0300', 'VALIDADO MINEDUC'],
      [409, 1, '2026-11-10', '16784321-8', 'OTP-ASBL-901855', '2026-11-10 08:21:09 -0300', 'VALIDADO MINEDUC'],
      [411, 1, '2026-11-10', '14556789-3', 'OTP-ASBL-901966', '2026-11-10 08:25:30 -0300', 'VALIDADO MINEDUC']
    ];
    for (const tk of tokensAsis) {
      await client.query(
        `INSERT INTO adm_educa.edc_token_asbl (
          cuas_sec, toab_nro_bloque, toab_fec_asistencia, toab_rut_usuario,
          toab_codigo_tkn, toab_fec_zh, toab_estado_token, toab_fec_ing
        ) VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7, NOW())`,
        tk
      );
    }

    // Calificaciones y Promedios (EDC_NOTAS_ASIG_CURSO y EDC_PROMEDIO_FINAL_ASIG)
    await client.query(`DELETE FROM adm_educa.edc_notas_asig_curso`);
    await client.query(`DELETE FROM adm_educa.edc_promedio_final_asig`);

    const notasRows = [
      // cuas_sec, fial_sec, nro_lista, n1, n2, n3, n4, n5, n6, prom_parc, prom_final
      [401, 5001, 1, '6.2', '6.5', '5.9', '6.4', '6.8', '6.6', '6.4', '6.4'],
      [401, 5002, 2, '6.8', '7.0', '6.7', '6.9', '6.5', '7.0', '6.8', '6.8'],
      [401, 5003, 3, '5.4', '5.8', '5.5', '6.0', '5.7', '5.9', '5.7', '5.7'],
      [402, 5001, 1, '5.8', '6.1', '6.0', '6.3', '5.9', '6.2', '6.1', '6.1'],
      [402, 5002, 2, '6.5', '6.7', '6.4', '6.8', '6.6', '6.9', '6.7', '6.7'],
      [402, 5003, 3, '4.8', '5.2', '5.0', '5.5', '5.3', '5.4', '5.2', '5.2'],
      [406, 5004, 1, '6.3', '6.1', '6.5', '6.4', '6.7', '6.6', '6.4', '6.4'],
      [407, 5005, 1, '6.0', '6.2', '5.8', '6.1', '6.3', '6.2', '6.1', '6.1'],
      [408, 5006, 1, '5.9', '6.0', '6.2', '6.1', '6.4', '6.3', '6.2', '6.2'],
      [409, 5007, 1, '6.7', '6.8', '7.0', '6.5', '6.9', '6.8', '6.8', '6.8'],
      [409, 5008, 2, '6.1', '6.3', '6.0', '6.4', '6.2', '6.5', '6.3', '6.3'],
      [411, 5009, 1, '6.5', '6.6', '6.8', '6.7', '6.9', '7.0', '6.8', '6.8'],
      [411, 5010, 2, '5.9', '6.1', '6.0', '6.2', '6.4', '6.3', '6.2', '6.2']
    ];
    for (const n of notasRows) {
      await client.query(
        `INSERT INTO adm_educa.edc_notas_asig_curso (
          cuas_sec, fial_sec, nacu_tipo_peri, nacu_nota_1, nacu_nota_2, nacu_nota_3,
          nacu_nota_4, nacu_nota_5, nacu_nota_6, nacu_prom_parc, nacu_prom_sist,
          nacu_prom_final, nacu_nro_lista, nacu_estado, nacu_eximido, alcu_sec, nacu_fec_ing
        ) VALUES ($1, $2, 'SEM2', $4, $5, $6, $7, $8, $9, $10, $10, $11, $3, 'ACTIVO', 'N', $12, NOW())`,
        [n[0], n[1], n[2], n[3], n[4], n[5], n[6], n[7], n[8], n[9], n[10], n[1] + 2000]
      );
      await client.query(
        `INSERT INTO adm_educa.edc_promedio_final_asig (
          cuas_sec, fial_sec, prfa_nro_lista, prfa_prom_final, prfa_estado, alcu_sec, prfa_fec_ing
        ) VALUES ($1, $2, $3, $4, 'APROBADO', $5, NOW())`,
        [n[0], n[1], n[2], n[10], n[1] + 2000]
      );
    }

    // Leccionario de Clases (Básica/Media y Parvularia) + Tokens OTP
    await client.query(`DELETE FROM adm_educa.edc_leccionario_clases`);
    await client.query(`DELETE FROM adm_educa.edc_token_leccionario`);
    await client.query(`DELETE FROM adm_educa.edc_leccionario_parv`);

    const leccionarios = [
      [7001, 401, '2026-11-10', 'Análisis crítico de textos argumentativos y columnas de opinión contemporáneas. Trabajo colaborativo en equipos.', 'OA 08: Formular una interpretación de los textos literarios y no literarios leídos.', 2, 'N', '12450891-2', 'OTP-LECC-77101'],
      [7002, 402, '2026-11-10', 'Resolución de sistemas de ecuaciones lineales 2x2 mediante método de reducción y modelamiento de problemas.', 'OA 04: Resolver sistemas de ecuaciones lineales (2x2) relacionados con problemas de la vida diaria.', 2, 'N', '13892104-K', 'OTP-LECC-77102'],
      [7003, 407, '2026-11-10', 'Ensayo argumentativo sobre literatura latinoamericana del siglo XX y retroalimentación de rúbrica PAES.', 'OA 06: Producir textos coherentes y cohesionados para comunicar sus análisis.', 2, 'N', '15210983-5', 'OTP-LECC-77103'],
      [7004, 409, '2026-11-10', 'Lectura comprensiva de fábulas y extracción de vocabulario contextual con apoyo de guía de trabajo PIE.', 'OA 04: Profundizar su comprensión de las narraciones leídas extrayendo información explícita e implícita.', 2, 'S', '16784321-8', 'OTP-LECC-77104'],
      [7005, 411, '2026-11-10', 'Práctica de mantenimiento preventivo de motores eléctricos trifásicos y medición de aislamiento en banco de pruebas.', 'OA TP 03: Ejecutar mantenimiento preventivo y correctivo en equipos electromecánicos industriales.', 4, 'N', '14556789-3', 'OTP-LECC-77105']
    ];
    for (const lc of leccionarios) {
      await client.query(
        `INSERT INTO adm_educa.edc_leccionario_clases (
          leas_sec, cuas_sec, leas_fecha, leas_texto, leas_objetivo, leas_horas, leas_es_lecc_pie, leas_fec_ing, leas_user_ing
        ) VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7, NOW(), $8)`,
        [lc[0], lc[1], lc[2], lc[3], lc[4], lc[5], lc[6], lc[7]]
      );
      await client.query(
        `INSERT INTO adm_educa.edc_token_leccionario (
          leas_sec, cuas_sec, tolc_fecha, tolc_rut_usuario, tolc_codigo_tkn, tolc_fec_zh, tolc_estado_token, tolc_fec_ing
        ) VALUES ($1, $2, $3::timestamp, $4, $5, '2026-11-10 09:30:00 -0300', 'FIRMADO OTP', NOW())`,
        [lc[0], lc[1], lc[2], lc[7], lc[8]]
      );
    }

    await client.query(
      `INSERT INTO adm_educa.edc_leccionario_parv (
        lepa_sec, grcu_sec, lepa_fecha, lepa_horas, lepa_nucleo, lepa_objetivo,
        lepa_experiencia, lepa_contenido, lepa_instrumento, lepa_evalu_sumativa
      ) VALUES (
        7501, 308, '2026-11-10'::timestamp, 4,
        'LENGUAJE VERBAL Y PENSAMIENTO MATEMÁTICO (NT2)',
        'OA 06: Comprender contenidos explícitos de textos literarios y no literarios a partir de la escucha atenta.',
        'Cuentacuentos interactivo del desierto florido y clasificación de elementos por forma y tamaño.',
        'Expresión oral, reconocimiento de sílabas iniciales y seriación.',
        'PAUTA DE OBSERVACIÓN DIRECTA',
        'LOGRADO DESTACADO (LD)'
      )`
    );

    // Hoja de Vida (Anotaciones), Atrasos, Salidas y Citaciones de Apoderados
    await client.query(`DELETE FROM adm_educa.edc_observacion_alum`);
    await client.query(`DELETE FROM adm_educa.edc_ctrl_atrasos_alumnos`);
    await client.query(`DELETE FROM adm_educa.edc_ctrl_horario_salida`);
    await client.query(`DELETE FROM adm_educa.edc_citaciones_apoderados`);

    const anotaciones = [
      [9001, 301, 5001, 'POSITIVA: Destacada participación en Olimpiada Regional de Matemática CMDS, representando con excelencia a su curso.', 'POSITIVA', '13892104-K'],
      [9002, 301, 5002, 'POSITIVA: Liderazgo positivo y apoyo constante a compañeros en trabajo grupal de Lenguaje y Literatura.', 'POSITIVA', '12450891-2'],
      [9003, 301, 5003, 'FORMATIVA / SEGUIMIENTO: Se acuerda plan de recalendarización de evaluaciones tras reincorporación por licencia médica.', 'FORMATIVA', '12450891-2'],
      [9004, 303, 5005, 'POSITIVA: Primer lugar en Debate Interescolar de Liceos Públicos de Antofagasta.', 'POSITIVA', '15210983-5'],
      [9005, 307, 5009, 'POSITIVA: Excelente cumplimiento de normas de seguridad industrial y uso de EPP en taller electromecánico.', 'POSITIVA', '14556789-3']
    ];
    for (const an of anotaciones) {
      await client.query(
        `INSERT INTO adm_educa.edc_observacion_alum (
          obal_sec, grcu_sec, fial_sec, obal_observacion, obal_tipo_obs, obal_fec_ing, obal_user_ing, obal_estado
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'VIGENTE')`,
        an
      );
    }

    await client.query(
      `INSERT INTO adm_educa.edc_ctrl_atrasos_alumnos (
        atal_sec, grcu_sec, fial_sec, alcu_sec, atal_fecha_atraso, atal_hora_atraso,
        atal_observacion, atal_responsable_atraso, atal_nro_bloque, cuas_sec, cths_fec_ing
      ) VALUES
        (9101, 301, 5002, 7002, '2026-11-10'::timestamp, '09:58', 'Atraso al inicio del 2° bloque por congestión vehicular en Av. Brasil.', 'INSPECTORÍA GENERAL', 2, 402, NOW()),
        (9102, 303, 5005, 7005, '2026-11-09'::timestamp, '08:17', 'Ingreso posterior al toque de timbre en 1° bloque.', 'INSPECTORÍA GENERAL', 1, 407, NOW())`
    );

    await client.query(
      `INSERT INTO adm_educa.edc_ctrl_horario_salida (
        cths_sec, grcu_sec, fial_sec, cths_tipo_salida, coal_sec,
        cths_rut_retira, cths_dv_retira, cths_nombre_retira, cths_ape_pat_retira, cths_ape_mat_retira
      ) VALUES
        (9201, 305, 5007, 'CONTROL MÉDICO DENTAL CESFAM', 8007, 14231098, '5', 'CLAUDIA ANDREA', 'ARAYA', 'PEREZ')`
    );

    await client.query(
      `INSERT INTO adm_educa.edc_citaciones_apoderados (
        ciap_sec, grcu_sec, fial_sec, ciap_nro_lista, ciap_fec_citacion,
        ciap_hora_citacion, ciap_tipo_docente, coal_sec, ciap_texto
      ) VALUES
        (9301, 301, 5003, 3, '2026-11-14'::timestamp, '15:30', 'PROFESOR JEFE / UTP', 8003, 'Entrevista de seguimiento pedagógico y entrega de calendario de evaluaciones recuperativas 2° Semestre.')`
    );

    console.log(`\n========================================================================`);
    console.log(` ✓ Base de datos PostgreSQL "${TARGET_DB}" lista en ${PG_CONFIG.host}:${PG_CONFIG.port}`);
    console.log(` ✓ 53 Establecimientos CMDS, 218 Apps, Cursos, Matrículas y Libro Digital poblados`);
    console.log(`========================================================================`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error en setupEducaPostgres:', err);
  process.exit(1);
});
