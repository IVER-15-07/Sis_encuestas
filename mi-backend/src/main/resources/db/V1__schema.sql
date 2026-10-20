-- =============================================================================
-- ESQUEMA COMPLETO DE ENCUESTAS (Titulados + Empleadores)
-- Ejecutado automáticamente por Spring Boot al arrancar
-- =============================================================================

-- 1. Trazabilidad de cada archivo cargado
CREATE TABLE IF NOT EXISTS importacion (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_encuesta    TEXT NOT NULL CHECK (tipo_encuesta IN ('titulados','empleadores')),
    nombre_archivo   TEXT NOT NULL,
    filas_leidas     INT  NOT NULL DEFAULT 0,
    filas_cargadas   INT  NOT NULL DEFAULT 0,
    filas_rechazadas INT  NOT NULL DEFAULT 0,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Estructura de preguntas del Excel
CREATE TABLE IF NOT EXISTS pregunta (
    codigo      TEXT PRIMARY KEY,
    encuesta    TEXT NOT NULL CHECK (encuesta IN ('titulados','empleadores')),
    texto_forms TEXT NOT NULL,
    tipo        TEXT NOT NULL CHECK (tipo IN ('unica','multiple','likert','numero','texto')),
    destino     TEXT,
    UNIQUE (encuesta, texto_forms)
);

-- Catálogo de respuestas válidas
CREATE TABLE IF NOT EXISTS opcion (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pregunta_codigo TEXT NOT NULL REFERENCES pregunta(codigo) ON DELETE CASCADE,
    valor           TEXT NOT NULL,
    orden           SMALLINT NOT NULL DEFAULT 0,
    puntaje         SMALLINT,
    UNIQUE (pregunta_codigo, valor)
);

-- 3. Supertipo: una fila por encuestado
CREATE TABLE IF NOT EXISTS respuesta (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    importacion_id BIGINT NOT NULL REFERENCES importacion(id) ON DELETE CASCADE,
    tipo           TEXT NOT NULL CHECK (tipo IN ('titulado','empleador')),
    id_forms       INT,
    fecha_inicio   TIMESTAMPTZ,
    fecha_envio    TIMESTAMPTZ
);

-- 4. Tablas de Titulados
CREATE TABLE IF NOT EXISTS titulado (
    id          BIGINT PRIMARY KEY REFERENCES respuesta(id) ON DELETE CASCADE,
    edad_rango  TEXT,
    genero      TEXT,
    acepta_red  BOOLEAN
);

CREATE TABLE IF NOT EXISTS titulado_contacto (
    titulado_id BIGINT PRIMARY KEY REFERENCES titulado(id) ON DELETE CASCADE,
    email       TEXT,
    telefono    TEXT,
    linkedin    TEXT
);

CREATE TABLE IF NOT EXISTS formacion_posgrado (
    titulado_id            BIGINT PRIMARY KEY REFERENCES titulado(id) ON DELETE CASCADE,
    tiene_formacion        BOOLEAN,
    nivel                  TEXT,
    lugar                  TEXT,
    financiamiento         TEXT,
    nombre_programa        TEXT,
    interesado             BOOLEAN,
    area_interes           TEXT,
    organizacion_preferida TEXT
);

CREATE TABLE IF NOT EXISTS situacion_laboral (
    titulado_id             BIGINT PRIMARY KEY REFERENCES titulado(id) ON DELETE CASCADE,
    anios_vida_profesional  NUMERIC(4,1),
    anios_desempleado       NUMERIC(4,1),
    situacion               TEXT,
    primer_empleo           BOOLEAN,
    tiempo_primer_trabajo   TEXT,
    num_empleos             TEXT,
    tuvo_trabajo_antes      BOOLEAN,
    razon_no_trabaja        TEXT
);

CREATE TABLE IF NOT EXISTS empleo_actual (
    titulado_id     BIGINT PRIMARY KEY REFERENCES titulado(id) ON DELETE CASCADE,
    organizacion    TEXT,
    rubro           TEXT,
    rubro_otro      TEXT,
    sector          TEXT,
    departamento    TEXT,
    cargo           TEXT,
    cargo_otro      TEXT,
    area_otro       TEXT,
    antiguedad      TEXT,
    medio_obtencion TEXT,
    remuneracion    TEXT
);

CREATE TABLE IF NOT EXISTS emprendimiento (
    titulado_id            BIGINT PRIMARY KEY REFERENCES titulado(id) ON DELETE CASCADE,
    origen                 TEXT,
    entregable             TEXT,
    financiamiento_externo TEXT
);

-- 5. Tablas de Empleadores
CREATE TABLE IF NOT EXISTS empleador (
    id                        BIGINT PRIMARY KEY REFERENCES respuesta(id) ON DELETE CASCADE,
    correo                    TEXT,
    organizacion              TEXT,
    tipo_organizacion         TEXT CHECK (tipo_organizacion IN ('Público','Privado')),
    tamano                    TEXT,
    rubro                     TEXT,
    contrato_ultimos_5        BOOLEAN,
    prob_contratacion         TEXT,
    nivel_formacion_demandado TEXT,
    medio_convocatoria        TEXT,
    areas_emergentes          TEXT,
    herramientas              TEXT,
    habilidades               TEXT
);

-- 6. Respuestas genéricas (Likert y Selección Múltiple)
CREATE TABLE IF NOT EXISTS respuesta_multiple (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    respuesta_id    BIGINT NOT NULL REFERENCES respuesta(id) ON DELETE CASCADE,
    pregunta_codigo TEXT   NOT NULL REFERENCES pregunta(codigo),
    opcion_id       BIGINT REFERENCES opcion(id),
    otro_texto      TEXT,
    CHECK (opcion_id IS NOT NULL OR otro_texto IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS respuesta_likert (
    respuesta_id    BIGINT NOT NULL REFERENCES respuesta(id) ON DELETE CASCADE,
    pregunta_codigo TEXT   NOT NULL REFERENCES pregunta(codigo),
    opcion_id       BIGINT NOT NULL REFERENCES opcion(id),
    PRIMARY KEY (respuesta_id, pregunta_codigo)
);

-- 7. Índices para acelerar búsquedas y llaves foráneas
CREATE INDEX IF NOT EXISTS idx_respuesta_importacion ON respuesta (importacion_id);
CREATE INDEX IF NOT EXISTS idx_resp_multiple_resp_preg ON respuesta_multiple (respuesta_id, pregunta_codigo);
CREATE INDEX IF NOT EXISTS idx_resp_multiple_opcion ON respuesta_multiple (opcion_id);
CREATE INDEX IF NOT EXISTS idx_resp_likert_preg_opcion ON respuesta_likert (pregunta_codigo, opcion_id);
CREATE INDEX IF NOT EXISTS idx_opcion_pregunta ON opcion (pregunta_codigo);

-- 8. Datos Semilla (Preguntas y Opciones iniciales)
INSERT INTO pregunta (codigo, encuesta, texto_forms, tipo, destino) VALUES
    ('T_EDAD', 'titulados', 'Edad que tiene actualmente:', 'unica', 'titulado.edad_rango'),
    ('T_GENERO', 'titulados', 'Género:', 'unica', 'titulado.genero'),
    ('T_SATISFACCION_GLOBAL', 'titulados', 'De manera global ¿Cuál es el grado de satisfacción que ha desarrollado con la formación profesional recibida en la Carrera de Ingenieria de Sistemas', 'likert', 'respuesta_likert'),
    ('E_CONF_CARRERA', 'empleadores', 'La Carrera de Ingeniería de Sistemas de la Universidad Mayor de San Simón brinda confianza a nuestra organización como formadora de profesionales del área tecnológica.', 'likert', 'respuesta_likert')
ON CONFLICT (codigo) DO NOTHING;

-- Opciones para Titulados
INSERT INTO opcion (pregunta_codigo, valor, orden, puntaje)
SELECT p.codigo, v.valor, v.orden, v.puntaje
FROM pregunta p
CROSS JOIN (VALUES
    ('Totalmente en desacuerdo', 1, 1),
    ('En desacuerdo',            2, 2),
    ('De acuerdo',               3, 3),
    ('Totalmente de Acuerdo',    4, 4)
) AS v(valor, orden, puntaje)
WHERE p.codigo = 'T_SATISFACCION_GLOBAL'
ON CONFLICT (pregunta_codigo, valor) DO NOTHING;

-- Opciones para Empleadores
INSERT INTO opcion (pregunta_codigo, valor, orden, puntaje)
SELECT p.codigo, v.valor, v.orden, v.puntaje
FROM pregunta p
CROSS JOIN (VALUES
    ('Totalmente desacuerdo',   1, 1),
    ('Parcialmente de acuerdo', 2, 2),
    ('Totalmente de acuerdo',   3, 3),
    ('No sabe',                 4, null::smallint)
) AS v(valor, orden, puntaje)
WHERE p.encuesta = 'empleadores' AND p.tipo = 'likert'
ON CONFLICT (pregunta_codigo, valor) DO NOTHING;

-- 9. Vistas para análisis
CREATE OR REPLACE VIEW v_titulados_plano WITH (security_invoker = true) AS
SELECT t.id, r.fecha_envio, t.edad_rango, t.genero, t.acepta_red,
       f.tiene_formacion, f.nivel, f.lugar, f.financiamiento,
       f.interesado, f.area_interes, f.organizacion_preferida,
       s.anios_vida_profesional, s.anios_desempleado, s.situacion,
       s.primer_empleo, s.tiempo_primer_trabajo, s.num_empleos,
       e.rubro, e.sector, e.departamento, e.cargo, e.antiguedad,
       e.medio_obtencion, e.remuneracion,
       em.origen, em.entregable, em.financiamiento_externo
FROM titulado t
JOIN respuesta r               ON r.id = t.id
LEFT JOIN formacion_posgrado f ON f.titulado_id = t.id
LEFT JOIN situacion_laboral s  ON s.titulado_id = t.id
LEFT JOIN empleo_actual e      ON e.titulado_id = t.id
LEFT JOIN emprendimiento em    ON em.titulado_id = t.id;

CREATE OR REPLACE VIEW v_likert_resumen WITH (security_invoker = true) AS
SELECT p.encuesta, p.codigo, p.texto_forms,
       count(o.puntaje)                 AS n,
       round(avg(o.puntaje), 2)         AS media,
       round(stddev_samp(o.puntaje), 2) AS desviacion
FROM respuesta_likert l
JOIN pregunta p ON p.codigo = l.pregunta_codigo
JOIN opcion   o ON o.id = l.opcion_id
GROUP BY p.encuesta, p.codigo, p.texto_forms;

-- 10. Seguridad Row Level Security (RLS)
ALTER TABLE importacion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregunta           ENABLE ROW LEVEL SECURITY;
ALTER TABLE opcion             ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuesta          ENABLE ROW LEVEL SECURITY;
ALTER TABLE titulado           ENABLE ROW LEVEL SECURITY;
ALTER TABLE titulado_contacto  ENABLE ROW LEVEL SECURITY;
ALTER TABLE formacion_posgrado ENABLE ROW LEVEL SECURITY;
ALTER TABLE situacion_laboral  ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleo_actual      ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprendimiento     ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleador          ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuesta_multiple ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuesta_likert   ENABLE ROW LEVEL SECURITY;