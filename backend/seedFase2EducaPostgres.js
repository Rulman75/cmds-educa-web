require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PG_CONFIG = {
  host: process.env.PG_HOST || '192.168.30.48',
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || 'cmds_admin',
  password: process.env.PG_PASS || 'CmdsPostgres2026!',
  database: process.env.PG_DB || 'bd_cmds_educa'
};

const SCRATCH_DATA_DIR = path.resolve(__dirname, '..', '..', 'migracion-sistemas-pad', 'data');

async function replaceRow(client, table, keyCol, keyVal, insertSql, params) {
  await client.query(`DELETE FROM ${table} WHERE ${keyCol} = $1`, [keyVal]);
  await client.query(insertSql, params);
}

async function main() {
  const client = new Client(PG_CONFIG);
  await client.connect();

  try {
    console.log('[1/5] Ajustando columnas VARCHAR en tablas de Fase 2 de bd_cmds_educa...');
    await client.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.table_schema, c.table_name, c.column_name
          FROM information_schema.columns c
          WHERE c.table_schema = 'adm_educa'
            AND c.table_name IN (
              'pie_profesionales_pie', 'pie_est_personas', 'pie_registro_acciones_prof',
              'pie_token_reg_acc_prof', 'pie_app_eval_estrategias',
              'edc_sige_parametros', 'edc_arch_lineas', 'edc_sige_asistencia_out', 'edc_sige_error_envio',
              'edc_forma_academica_prof', 'edc_plan_evaluacion', 'edc_evaluacion_prof',
              'edc_adm_funcionarios', 'edc_adm_docto_x_func',
              'edc_casos_estab', 'edc_casos_acciones', 'edc_contacto_empr',
              'edc_resumen_matri_estab', 'edc_postulacion_portal'
            )
            AND c.data_type IN ('character varying', 'character')
            AND c.character_maximum_length < 250
        LOOP
          BEGIN
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE VARCHAR(250)', r.table_schema, r.table_name, r.column_name);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END LOOP;
      END $$;
    `);

    console.log('[2/5] Poblando Módulo PIE (Programa de Integración Escolar — Decreto 170 / 83)...');
    const profsPie = [
      [1, 'S', 7, 501, 'EDUCADOR(A) DIFERENCIAL MENCION DEA/TEL', 15890123, '4', 'ENSEÑANZA MEDIA', 'CLAUDIA PATRICIA VARGAS ROJAS', '552639310', 'cvargas.pie@cmds.cl', 'VIGENTE'],
      [2, 'N', 7, null, 'PSICÓLOGO(A) EDUCACIONAL PIE', 16450982, '1', 'ENSEÑANZA MEDIA', 'FELIPE ANDRES MORALES SOTO', '552639311', 'fmorales.pie@cmds.cl', 'VIGENTE'],
      [3, 'S', 22, 503, 'EDUCADOR(A) DIFERENCIAL MENCION TEA/DI', 17120394, 'K', 'BÁSICA Y MEDIA', 'PAULINA ALEJANDRA ARAYA CASTRO', '552639312', 'paraya.pie@cmds.cl', 'VIGENTE'],
      [4, 'N', 10, null, 'FONOAUDIÓLOGO(A) ESPECIALISTA TEL', 18019283, '7', 'ENSEÑANZA BÁSICA', 'SEBASTIAN IGNACIO GODOY DIAZ', '552639313', 'sgodoy.pie@cmds.cl', 'VIGENTE'],
      [5, 'N', 10, null, 'TERAPEUTA OCUPACIONAL PIE', 18901234, '5', 'ENSEÑANZA BÁSICA', 'VALERIA PAZ CORTES VEGA', '552639314', 'vcortes.pie@cmds.cl', 'VIGENTE'],
      [6, 'S', 45, 506, 'EDUCADOR(A) DIFERENCIAL ATENCIÓN TEMPRANA', 17654321, '9', 'EDUCACIÓN PARVULARIA', 'NATALIA BELEN PIZARRO MUÑOZ', '552639315', 'npizarro.pie@cmds.cl', 'VIGENTE']
    ];
    for (const p of profsPie) {
      await replaceRow(
        client,
        'adm_educa.pie_profesionales_pie',
        'prpi_sec',
        p[0],
        `INSERT INTO adm_educa.pie_profesionales_pie (
          prpi_sec, prpi_prof_educa, esed_sec, prpi_prof_educa_sec, prpi_tipo_prof,
          prpi_rut, prpi_dv, prpi_nivel, prpi_profesional, prpi_telefono, prpi_mail, prpi_estado, prpi_fec_ing
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        p
      );
    }

    await client.query(`DELETE FROM adm_educa.pie_est_personas`);
    const estPie = [
      ['NEE TRANSITORIA - DEA (DIFICULTAD ESPECÍFICA DEL APRENDIZAJE)', 1, 7003],
      ['NEE PERMANENTE - TEA (TRASTORNO DEL ESPECTRO AUTISTA)', 2, 7006],
      ['NEE TRANSITORIA - TEL MIXTO (TRASTORNO ESPECÍFICO DEL LENGUAJE)', 3, 7008],
      ['NEE TRANSITORIA - TDA (DÉFICIT ATENCIONAL CON APOYO PACI)', 4, 7012]
    ];
    for (const ep of estPie) {
      await client.query(
        `INSERT INTO adm_educa.pie_est_personas (etpe_tipo, etpe_sec_id, alcu_sec) VALUES ($1, $2, $3)`,
        ep
      );
    }

    const accionesPie = [
      [1, 301, '2026-11-10', 3, 'Co-docencia en aula regular de Lenguaje y apoyo focalizado en comprensión lectora (Decreto 83 DUA).', '15890123-4', 'OTP-PIE-88101'],
      [2, 301, '2026-11-10', 2, 'Intervención psicopedagógica en Aula de Recursos para fortalecimiento de funciones ejecutivas y autorregulación.', '16450982-1', 'OTP-PIE-88102'],
      [3, 304, '2026-11-09', 3, 'Adecuación Curricular Individual (PACI) en Matemática y mediación con material concreto.', '17120394-K', 'OTP-PIE-88103'],
      [4, 305, '2026-11-09', 2, 'Sesión fonoaudiológica grupal para estimulación de conciencia fonológica y estructuración morfosintáctica.', '18019283-7', 'OTP-PIE-88104'],
      [5, 308, '2026-11-08', 2, 'Apoyo de integración sensorial y estimulación temprana en nivel NT2.', '17654321-9', 'OTP-PIE-88105']
    ];
    for (const ac of accionesPie) {
      await replaceRow(
        client,
        'adm_educa.pie_registro_acciones_prof',
        'reap_sec',
        ac[0],
        `INSERT INTO adm_educa.pie_registro_acciones_prof (
          reap_sec, recu_sec, reap_fecha, reap_horas, reap_actividades, reap_fec_ing, reap_user_ing
        ) VALUES ($1, $2, $3::timestamp, $4, $5, NOW(), $6)`,
        [ac[0], ac[1], ac[2], ac[3], ac[4], ac[5]]
      );
      await replaceRow(
        client,
        'adm_educa.pie_token_reg_acc_prof',
        'reap_sec',
        ac[0],
        `INSERT INTO adm_educa.pie_token_reg_acc_prof (
          reap_sec, trap_rut_usuario, trap_codigo_tkn, trap_fec_zh, trap_estado_token, trap_fec_ing, trap_user_ing
        ) VALUES ($1, $2, $3, '2026-11-10 11:15:00 -0300', 'FIRMADO OTP PIE', NOW(), $2)`,
        [ac[0], ac[5], ac[6]]
      );
    }

    const evalEstrategias = [
      [1, 301, '2° SEMESTRE 2026', 'Presentación multimodal de contenidos (visual, auditiva y kinestésica) y evaluación diferenciada con tiempo extendido.', 'LOGRADO (88% de avance en objetivos PACI del curso 1° Medio A).'],
      [2, 304, '2° SEMESTRE 2026', 'Uso de apoyos visuales anticipatorios y estructuración ambiental para estudiantes con diagnóstico TEA.', 'LOGRADO DESTACADO (100% de adherencia y mejora en participación en aula).'],
      [3, 305, '2° SEMESTRE 2026', 'Talleres semanales de conciencia fonológica en articulación entre educadora diferencial y fonoaudiólogo.', 'LOGRADO (Incremento de 1,2 puntos en velocidad y comprensión lectora).']
    ];
    for (const ev of evalEstrategias) {
      await replaceRow(
        client,
        'adm_educa.pie_app_eval_estrategias',
        'aees_sec',
        ev[0],
        `INSERT INTO adm_educa.pie_app_eval_estrategias (
          aees_sec, escu_sec, aees_periodos, aees_acciones, aees_evaluacion, aees_fec_ing, aess_user_ing
        ) VALUES ($1, $2, $3, $4, $5, NOW(), '10633447')`,
        ev
      );
    }

    console.log('[3/5] Poblando Módulo SIGE MINEDUC (Archivos 4 y 5 + Interoperabilidad SOAP)...');
    const otherCats = JSON.parse(fs.readFileSync(path.join(SCRATCH_DATA_DIR, 'oracle_other_catalogs.json'), 'utf8'));
    await client.query(`DELETE FROM adm_educa.edc_sige_parametros`);
    const sigeParams =
      (otherCats.educa_sige_param || []).length > 0
        ? otherCats.educa_sige_param
        : [
            { SIPA_CODIGO: 'URL_SEMILLA_SIGE', SIPA_VALOR: 'http://w7app.mineduc.cl/WsApiAutorizacion/services/SemillaServiciosSoapPort', SIPA_DESC: 'Endpoint SOAP Obtención de Semilla MINEDUC' },
            { SIPA_CODIGO: 'URL_ASISTENCIA_SIGE', SIPA_VALOR: 'http://w7app.mineduc.cl/WsApiMineduc/services/AsistenciaSigeSoapPort', SIPA_DESC: 'Endpoint SOAP Envío de Asistencia Diaria SIGE' },
            { SIPA_CODIGO: 'MASIV_SIGE', SIPA_VALOR: 'SI', SIPA_DESC: 'Habilita transmisión masiva de asistencia por RBD' },
            { SIPA_CODIGO: 'RUT_SOSTENEDOR', SIPA_VALOR: '70902700-3', SIPA_DESC: 'RUT Corporación Municipal de Desarrollo Social de Antofagasta' }
          ];
    for (const sp of sigeParams) {
      await client.query(
        `INSERT INTO adm_educa.edc_sige_parametros (sipa_codigo, sipa_valor, sipa_desc) VALUES ($1, $2, $3)`,
        [sp.SIPA_CODIGO || 'PARAM', sp.SIPA_VALOR || '', sp.SIPA_DESC || '']
      );
    }

    await client.query(`DELETE FROM adm_educa.edc_arch_lineas`);
    const archLineas = [
      [4, 1, '4|00285|6|310|01|A|2026|23451092|4|GONZALEZ|ARAYA|MATEO IGNACIO|M|20110412|20260302|VIGENTE|PRIORITARIO'],
      [4, 2, '4|00285|6|310|01|A|2026|23890145|K|ROJAS|CARRASCO|SOFIA ANTONIA|F|20110825|20260302|VIGENTE|PREFERENTE'],
      [4, 3, '4|00285|6|310|01|A|2026|24102938|7|CORTES|OLIVARES|BENJAMIN ALONSO|M|20120119|20260302|VIGENTE|PIE_DEA'],
      [4, 4, '4|00304|9|310|03|A|2026|24891234|9|PIZARRO|VEGA|LUCAS SEBASTIAN|M|20100615|20260302|VIGENTE|PRIORITARIO'],
      [5, 1, '5|00285|6|310|01|A|2026|11|23451092|4|20|0|100.0|SINCRONIZADO_SIGE'],
      [5, 2, '5|00285|6|310|01|A|2026|11|23890145|K|19|1|95.0|SINCRONIZADO_SIGE'],
      [5, 3, '5|00285|6|310|01|A|2026|11|24102938|7|18|2|90.0|LICENCIA_MEDICA_JUSTIFICADA'],
      [5, 4, '5|00288|1|110|04|A|2026|11|25490128|1|20|0|100.0|SINCRONIZADO_SIGE']
    ];
    for (const al of archLineas) {
      await client.query(
        `INSERT INTO adm_educa.edc_arch_lineas (arch_sec, arli_nro_linea, arli_linea) VALUES ($1, $2, $3)`,
        al
      );
    }

    await client.query(`DELETE FROM adm_educa.edc_sige_asistencia_out`);
    const sigeOut = [
      [1001, 1, 'CMDS', 7, '310', 301, '1M', 2026, 11, 285, 310, 1, '2026-11-10', 'PRESENCIAL', 'A', 40, '6', 'SEMILLA-OK-20261110-00285A'],
      [1002, 2, 'CMDS', 7, '310', 302, '2M', 2026, 11, 285, 310, 2, '2026-11-10', 'PRESENCIAL', 'B', 41, '6', 'SEMILLA-OK-20261110-00285B'],
      [1003, 3, 'CMDS', 22, '310', 303, '3M', 2026, 11, 304, 310, 3, '2026-11-10', 'PRESENCIAL', 'A', 39, '9', 'SEMILLA-OK-20261110-00304A'],
      [1004, 4, 'CMDS', 10, '110', 305, '4B', 2026, 11, 288, 110, 4, '2026-11-10', 'PRESENCIAL', 'A', 38, '1', 'SEMILLA-OK-20261110-00288A'],
      [1005, 5, 'CMDS', 2, '510', 307, '4M', 2026, 11, 279, 510, 4, '2026-11-10', 'PRESENCIAL', 'A', 35, '4', 'SEMILLA-OK-20261110-00279A']
    ];
    for (const so of sigeOut) {
      await client.query(
        `INSERT INTO adm_educa.edc_sige_asistencia_out (
          siao_sec, sias_sec, esad_cod, esed_sec, tien_cod, grcu_sec, grte_cod,
          siao_anio_escolar, siao_mes_escolar, siao_rbd, siao_codigo_tipo_ensenanza,
          siao_codigo_grado, siao_fecha_asistencia, siao_tipo_asistencia,
          siao_letra_curso, siao_numero, siao_dv, siao_semilla
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::timestamp,$14,$15,$16,$17,$18)`,
        so
      );
    }

    await client.query(`DELETE FROM adm_educa.edc_sige_error_envio`);
    await client.query(`
      INSERT INTO adm_educa.edc_sige_error_envio (siea_sec, siee_msg_error, siee_fec_error) VALUES
      (1001, 'CÓDIGO 00 (OK MINEDUC): Asistencia recepcionada y validada sin observaciones por WebService SIGE.', NOW()),
      (1002, 'CÓDIGO 00 (OK MINEDUC): Asistencia recepcionada y validada sin observaciones por WebService SIGE.', NOW()),
      (1003, 'ADVERTENCIA SIGE-04: Estudiante RUN 24.102.938-7 registra licencia médica informada en bloque 1.', NOW())
    `);

    console.log('[4/5] Poblando Módulo Profesores, Acompañamiento Docente y Gestión Documental...');
    const formAcad = [
      [1, 501, 'TITULO PROFESIONAL', 'PROFESORA DE ESTADO EN CASTELLANO Y COMUNICACIÓN', 'UNIVERSIDAD DE ANTOFAGASTA', 2006, 'TITULO_CROJAS_UA.PDF', 'S', 'IDÓNEO TITULADO'],
      [2, 502, 'TITULO PROFESIONAL', 'PROFESOR DE MATEMÁTICA Y COMPUTACIÓN', 'UNIVERSIDAD CATÓLICA DEL NORTE', 2004, 'TITULO_RVALENZUELA_UCN.PDF', 'S', 'IDÓNEO TITULADO + MAGÍSTER'],
      [3, 503, 'TITULO PROFESIONAL', 'PROFESORA DE LENGUAJE Y MAGÍSTER EN CURRÍCULUM', 'UNIVERSIDAD CATÓLICA DEL NORTE', 2009, 'TITULO_MCORTES_UCN.PDF', 'S', 'IDÓNEO TRAMO EXPERTO I'],
      [4, 504, 'TITULO PROFESIONAL', 'PROFESOR DE EDUCACIÓN GENERAL BÁSICA CON MENCIÓN', 'UNIVERSIDAD DE ANTOFAGASTA', 2011, 'TITULO_JTAPIA_UA.PDF', 'S', 'IDÓNEO AVANZADO'],
      [5, 505, 'TITULO PROFESIONAL', 'INGENIERA EJECUCIÓN EN ELECTRICIDAD Y DOCENTE TP', 'UNIVERSIDAD DE ANTOFAGASTA', 2008, 'TITULO_PMUNOZ_UA.PDF', 'S', 'IDÓNEO ESPECIALIDAD TP'],
      [6, 506, 'TITULO PROFESIONAL', 'EDUCADORA DE PÁRVULOS Y ESCOLARES INICIALES', 'UNIVERSIDAD DE ANTOFAGASTA', 2014, 'TITULO_CDIAZ_UA.PDF', 'S', 'IDÓNEO TITULADO']
    ];
    for (const fa of formAcad) {
      await replaceRow(
        client,
        'adm_educa.edc_forma_academica_prof',
        'fapr_sec',
        fa[0],
        `INSERT INTO adm_educa.edc_forma_academica_prof (
          fapr_sec, prof_sec, fapr_tipo_forma_acad, fapr_nom_forma_acad,
          fapr_insti_forma_acad, fapr_anno_forma_acad, fapr_docto_forma_acad,
          fapr_forma_acad_princ, fapr_idoneidad_docente
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        fa
      );
    }

    const planesEval = [
      [1, 7, 2026, 'PAUTA DE ACOMPAÑAMIENTO PEDAGÓGICO EN AULA MBE 2026', 'Observación de clases según Marco para la Buena Enseñanza (Dominios A, B y C) y retroalimentación UTP.', 'ACTIVO', '2026-04-01', '2026-11-30'],
      [2, 22, 2026, 'EVALUACIÓN DE PRÁCTICAS DUA Y RETROALIMENTACIÓN FORMATIVA', 'Seguimiento decreto 67 y diversificación de la enseñanza en aula.', 'ACTIVO', '2026-04-01', '2026-11-30']
    ];
    for (const pe of planesEval) {
      await replaceRow(
        client,
        'adm_educa.edc_plan_evaluacion',
        'plev_sec',
        pe[0],
        `INSERT INTO adm_educa.edc_plan_evaluacion (
          plev_sec, esed_sec, peri_sec, plev_nombre, plev_descrip, plev_estado, plev_fec_ini, plev_fec_fin, plev_fec_ing
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8::timestamp,NOW())`,
        pe
      );
    }

    const evalsProf = [
      [1, 1, 501, '2026-10-22', 1, 'DESTACADO (96%): Excelente clima de aula, activación de conocimientos previos y cierre metacognitivo efectivo.', 'FINALIZADA CON FIRMA DOCENTE'],
      [2, 1, 502, '2026-10-25', 1, 'COMPETENTE ALTO (91%): Modelamiento matemático riguroso y resolución colaborativa de problemas tipo PAES.', 'FINALIZADA CON FIRMA DOCENTE'],
      [3, 2, 503, '2026-11-04', 2, 'DESTACADO (95%): Integración sobresaliente de estrategias DUA y co-docencia con especialista PIE.', 'FINALIZADA CON FIRMA DOCENTE']
    ];
    for (const ep of evalsProf) {
      await replaceRow(
        client,
        'adm_educa.edc_evaluacion_prof',
        'evin_sec',
        ep[0],
        `INSERT INTO adm_educa.edc_evaluacion_prof (
          evin_sec, ines_sec, prof_sec, evpr_fec_eval, plev_sec, evpr_obs, evpr_estado, evpr_fec_ing
        ) VALUES ($1,$2,$3,$4::timestamp,$5,$6,$7,NOW())`,
        ep
      );
    }

    const admFuncs = [
      [1, 'CMDS', 12450891, '2', 'CAROLINA ANDREA', 'ROJAS', 'PIZARRO', 'F', 101, 'DOCENTE AULA', 'TITULAR ESTATUTO DOCENTE (44 HRS)', 'AFP HABITAT', 'FONASA', 'VIGENTE'],
      [2, 'CMDS', 13892104, 'K', 'RODRIGO ALEJANDRO', 'VALENZUELA', 'CASTRO', 'M', 102, 'DOCENTE AULA', 'TITULAR ESTATUTO DOCENTE (44 HRS)', 'AFP PROVida', 'ISAPRE CRUZBLANCA', 'VIGENTE'],
      [3, 'CMDS', 15210983, '5', 'MARCELA PAZ', 'CORTES', 'ARAYA', 'F', 103, 'DOCENTE AULA / UTP', 'CONTRATA ESTATUTO DOCENTE (44 HRS)', 'AFP MODELO', 'FONASA', 'VIGENTE'],
      [4, 'CMDS', 15890123, '4', 'CLAUDIA PATRICIA', 'VARGAS', 'ROJAS', 'F', 101, 'COORDINADORA PIE', 'CONTRATA SUBVENCIÓN PIE (44 HRS)', 'AFP CUPRUM', 'FONASA', 'VIGENTE']
    ];
    for (const af of admFuncs) {
      await replaceRow(
        client,
        'adm_educa.edc_adm_funcionarios',
        'afun_sec',
        af[0],
        `INSERT INTO adm_educa.edc_adm_funcionarios (
          afun_sec, esad_cod, afun_rut, afun_dv, afun_nombre, afun_ape_pat, afun_ape_mat,
          afun_genero, pers_sec, afun_cod_cargo, afun_tipo_contrato, afun_cod_afp,
          afun_tipo_inst_salud, afun_estado, afun_existe_educa, afun_fec_ing
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'S',NOW())`,
        af
      );
    }

    const doctosFunc = [
      [1, 1, 1, 'CERT_INHABILIDAD_MENORES_12450891.PDF', 'VIGENTE SIN INHABILIDADES', 184],
      [2, 1, 2, 'TITULO_UNIVERSITARIO_LEGALIZADO_12450891.PDF', 'VALIDADO CONTRALORÍA / MINEDUC', 412],
      [3, 2, 1, 'CERT_INHABILIDAD_MENORES_13892104.PDF', 'VIGENTE SIN INHABILIDADES', 190],
      [4, 3, 3, 'DECRETO_CONTRATA_DOCENTE_2026_15210983.PDF', 'FIRMADO DIRECCIÓN EDUCACIÓN CMDS', 320],
      [5, 4, 4, 'REGISTRO_SECREDUC_PIE_15890123.PDF', 'HABILITADO REGISTRO NACIONAL PIE', 275]
    ];
    for (const df of doctosFunc) {
      await replaceRow(
        client,
        'adm_educa.edc_adm_docto_x_func',
        'adxf_sec',
        df[0],
        `INSERT INTO adm_educa.edc_adm_docto_x_func (
          adxf_sec, afun_sec, adge_sec, adxf_fec_ini, adxf_fec_fin, adxf_fec_carga,
          adxf_nom_arch_real, adxf_nom_arch_inte, adxf_tamano_arch, adxf_purgado, adxf_fec_ing
        ) VALUES ($1,$2,$3,'2026-03-01'::timestamp,'2027-02-28'::timestamp,NOW(),$4,$5,$6,'N',NOW())`,
        df
      );
    }

    console.log('[5/5] Poblando Convivencia Escolar, Formación Dual TP y Admisión SAE...');
    const casosConv = [
      [1, 7, 2026, 'Activación preventiva de Protocolo de Ciberconvivencia y Uso Responsable de Redes Sociales en 1° Medio A.', 'CONVIVENCIA DIGITAL', 'SEGUIMIENTO ACTIVO', '2026-11-04', '10:30', 'SALA DE CLASES / REDES'],
      [2, 22, 2026, 'Mediación escolar restaurativa entre pares en 3° Medio A con participación de Encargado de Convivencia y Dupla Psicosocial.', 'MEDIACIÓN ENTRE PARES', 'RESUELTO CON ACUERDO', '2026-10-28', '11:45', 'PATIO CENTRAL'],
      [3, 10, 2026, 'Plan de acompañamiento socioemocional y retención escolar por inasistencias reiteradas justificadas.', 'RETENCIÓN ESCOLAR', 'EN INTERVENCIÓN DUPLA', '2026-11-07', '09:15', 'INSPECTORÍA GENERAL']
    ];
    for (const cc of casosConv) {
      await replaceRow(
        client,
        'adm_educa.edc_casos_estab',
        'caso_sec',
        cc[0],
        `INSERT INTO adm_educa.edc_casos_estab (
          caso_sec, esed_sec, peri_sec, caso_descrip, caso_tipo_caso, caso_estado,
          caso_fec_caso, caso_hora_caso, caso_lugar_incidente, caso_tiene_accion, caso_fec_ing
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8,$9,'S',NOW())`,
        cc
      );
    }

    const accionesConv = [
      [1, 1, 'TALLER FORMATIVO', 'Taller de ciudadanía digital junto a equipo de Convivencia Escolar y entrevista con apoderados.', '2026-11-05', 'REALIZADO'],
      [2, 2, 'ACTA DE MEDIACIÓN', 'Firma de compromiso reparatorio y seguimiento quincenal por Profesor Jefe.', '2026-10-29', 'CUMPLIDO'],
      [3, 3, 'VISITA DOMICILIARIA / CITACIÓN', 'Coordinación con red de salud APS CMDS y recalendarización pedagógica UTP.', '2026-11-08', 'EN EJECUCIÓN']
    ];
    for (const ac of accionesConv) {
      await replaceRow(
        client,
        'adm_educa.edc_casos_acciones',
        'caac_sec',
        ac[0],
        `INSERT INTO adm_educa.edc_casos_acciones (
          caac_sec, caso_sec, caac_tipo_accion, caac_desc, caac_fecha, caac_estado, caac_fec_ing
        ) VALUES ($1,$2,$3,$4,$5::timestamp,$6,NOW())`,
        ac
      );
    }

    const empresasDual = [
      [1, 2, 76123450, '9', 'FINNING CHILE S.A. - CENTRO TÉCNICO LA NEGRA', 'GERENCIA', 'CAPACITACIÓN', 'M', '+56982001100', 'practicas.antofagasta@finning.com', 'MAESTRO GUÍA ELECTROMECÁNICA'],
      [2, 2, 79540120, 'K', 'FERROCARRIL DE ANTOFAGASTA A BOLIVIA (FCAB)', 'MANTENIMIENTO', 'FERROVIARIO', 'M', '+56982002200', 'formacion.dual@fcab.cl', 'SUPERVISOR MANTENIMIENTO INDUSTRIAL'],
      [3, 3, 96500110, '3', 'EMPRESA PORTUARIA ANTOFAGASTA (EPA / ATI)', 'OPERACIONES', 'LOGÍSTICA', 'F', '+56982003300', 'rrhh.dual@puertoantofagasta.cl', 'TUTOR ADMINISTRACIÓN Y COMERCIO EXTERIOR']
    ];
    for (const em of empresasDual) {
      await replaceRow(
        client,
        'adm_educa.edc_contacto_empr',
        'coem_sec',
        em[0],
        `INSERT INTO adm_educa.edc_contacto_empr (
          coem_sec, emes_sec, coem_rut, coem_dv, coem_nombres, coem_ape_pat, coem_ape_mat,
          coem_genero, coem_celular, coem_email, coem_cargo, coem_fec_ing
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
        em
      );
    }

    await client.query(`DELETE FROM adm_educa.edc_resumen_matri_estab`);
    const saeCupos = [
      [7, 2026, '310', '1M', 280, 7, 274, 6],
      [22, 2026, '310', '1M', 240, 6, 238, 2],
      [22, 2026, '110', '7B', 160, 4, 157, 3],
      [10, 2026, '110', '1B', 114, 3, 110, 4],
      [2, 2026, '510', '1M', 320, 8, 305, 15],
      [45, 2026, '10', 'NT1', 120, 4, 116, 4]
    ];
    for (const sc of saeCupos) {
      await client.query(
        `INSERT INTO adm_educa.edc_resumen_matri_estab (
          esed_sec, peri_sec, tien_cod, grte_cod, rmes_cupos_decla, rmes_cnt_cursos,
          rmes_prematri_peri, rmes_cupos_diponibles, rmes_fec_ing
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        sc
      );
    }

    const postulantesSae = [
      [24990112, '3', 'DIEGO ALONSO', 'CARRASCO', 'VERA', 'M', '2012-03-14', 'AV. ARGENTINA 1920', '1° MEDIO HC (RBD 285 LICEO MARTA NAREA)', 15112233, '4', 'MARIA JOSE', 'VERA', 'mvera@correo.cl', '+56991112233', 'SAE-2026-001'],
      [25330445, 'K', 'FLORENCIA PAZ', 'MIRANDA', 'CASTRO', 'F', '2012-07-29', 'CALLE URIBE 740', '1° MEDIO HC (RBD 304 LICEO ANDRÉS SABELLA)', 14223344, '1', 'CRISTIAN', 'MIRANDA', 'cmiranda@correo.cl', '+56992223344', 'SAE-2026-002'],
      [26880991, '5', 'MAXIMILIANO', 'TORO', 'GUZMAN', 'M', '2020-04-11', 'PJE. COBIJA 412', 'NT2 TRANSICIÓN (RBD 12822 ESC. SEMILLITA)', 17889900, '2', 'CAMILA', 'GUZMAN', 'cguzman@correo.cl', '+56993334455', 'SAE-2026-003']
    ];
    for (const ps of postulantesSae) {
      await replaceRow(
        client,
        'adm_educa.edc_postulacion_portal',
        'ppor_rut',
        ps[0],
        `INSERT INTO adm_educa.edc_postulacion_portal (
          ppor_rut, ppor_dv, ppor_nombres, ppor_ape_pat, ppor_ape_mat, ppor_genero,
          ppor_fec_nac, ppor_direccion, comu_cod, ciud_cod, regi_cod, ppor_desc_grado,
          ppor_rut_cont, ppor_dv_cont, ppor_nom_cont, ppor_ape_pat_cont,
          ppor_email_cont, ppor_celular_cont, ppor_id_unico, ppor_fec_ing
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8,'02101','ANTOFAGASTA','02',$9,$10,$11,$12,$13,$14,$15,$16,NOW())`,
        ps
      );
    }

    console.log('\n========================================================================');
    console.log(' ✓ Fase 2 de PADEDUCA poblada exitosamente en 192.168.30.48:5432 / bd_cmds_educa');
    console.log('========================================================================');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error en seedFase2EducaPostgres:', err);
  process.exit(1);
});
