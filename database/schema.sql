
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 

CREATE OR REPLACE FUNCTION generate_correlative_code() 
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    next_id INTEGER;
BEGIN
    prefix := TG_ARGV[0];
    EXECUTE format('SELECT last_value FROM %I_id_seq', TG_TABLE_NAME) INTO next_id;
    NEW.codigo := prefix || LPAD(NEW.id::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL, 
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'egresado', 'empresa')), 
    last_login TIMESTAMP, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 

CREATE TABLE egresados ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    nombre VARCHAR(100) NOT NULL, 
    apellido VARCHAR(100) NOT NULL, 
    carrera VARCHAR(150) NOT NULL, 
    anio_egreso INTEGER CHECK (anio_egreso >= 1950 AND anio_egreso <= EXTRACT(YEAR FROM CURRENT_DATE) + 5), 
    cv_url VARCHAR(255), 
    email_recuperacion VARCHAR(255), 
    datos_contacto JSONB, 
    empleado_actualmente BOOLEAN DEFAULT FALSE, 
    empresa_actual VARCHAR(255), 
    horario_inicio TIME,
    horario_fin TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 

CREATE TABLE empresas ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    nombre_empresa VARCHAR(200) NOT NULL, 
    sector VARCHAR(100), 
    ubicacion VARCHAR(200), 
    sitio_web VARCHAR(255), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 

CREATE TABLE administradores ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    nivel_acceso VARCHAR(50) DEFAULT 'basic', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 

CREATE TABLE habilidades ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE, 
    tipo VARCHAR(20) CHECK (tipo IN ('tecnica', 'blanda')), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 

CREATE TABLE egresados_habilidades ( 
    egresado_id INTEGER REFERENCES egresados(id) ON DELETE CASCADE, 
    habilidad_id INTEGER REFERENCES habilidades(id) ON DELETE CASCADE, 
    nivel_experiencia INTEGER CHECK (nivel_experiencia BETWEEN 1 AND 5), 
    PRIMARY KEY (egresado_id, habilidad_id) 
); 

CREATE TABLE ofertas_laborales ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE, 
    titulo VARCHAR(200) NOT NULL, 
    descripcion TEXT NOT NULL, 
    ubicacion VARCHAR(200), 
    modalidad VARCHAR(20) CHECK (modalidad IN ('remoto', 'hibrido', 'presencial')), 
    tipo_contrato VARCHAR(50), 
    salario_min DECIMAL(10, 2), 
    salario_max DECIMAL(10, 2), 
    horario_inicio TIME,
    horario_fin TIME,
    activa BOOLEAN DEFAULT TRUE, 
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    fecha_limite TIMESTAMP, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT salario_range CHECK (salario_min <= salario_max) 
); 

CREATE TABLE ofertas_habilidades ( 
    oferta_id INTEGER REFERENCES ofertas_laborales(id) ON DELETE CASCADE, 
    habilidad_id INTEGER REFERENCES habilidades(id) ON DELETE CASCADE, 
    importancia INTEGER CHECK (importancia BETWEEN 1 AND 5), 
    PRIMARY KEY (oferta_id, habilidad_id) 
); 

CREATE TABLE postulaciones ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    oferta_id INTEGER NOT NULL REFERENCES ofertas_laborales(id) ON DELETE CASCADE, 
    egresado_id INTEGER NOT NULL REFERENCES egresados(id) ON DELETE CASCADE, 
    estado VARCHAR(20) DEFAULT 'postulado' CHECK (estado IN ('postulado', 'revision', 'entrevista', 'contratado', 'rechazado')), 
    fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    UNIQUE(oferta_id, egresado_id) 
); 

CREATE TABLE historial_estados ( 
    id SERIAL PRIMARY KEY, 
    postulacion_id INTEGER NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE, 
    estado_anterior VARCHAR(20), 
    estado_nuevo VARCHAR(20) NOT NULL,
    comentario TEXT,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    cambiado_por INTEGER REFERENCES users(id) 
); 

CREATE TABLE notificaciones ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    tipo VARCHAR(50), 
    titulo VARCHAR(200) NOT NULL, 
    contenido TEXT, 
    leida BOOLEAN DEFAULT FALSE, 
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 

CREATE TABLE reportes ( 
    id SERIAL PRIMARY KEY, 
    codigo VARCHAR(20) UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    tipo_reporte VARCHAR(100) NOT NULL, 
    parametros_filtro JSONB, 
    url_pdf TEXT, 
    estado VARCHAR(20) DEFAULT 'generando', 
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    fecha_completado TIMESTAMP 
); 

CREATE TABLE metricas_dashboard ( 
    id SERIAL PRIMARY KEY, 
    tipo_metrica VARCHAR(100) NOT NULL, 
    fecha_referencia DATE NOT NULL, 
    valores JSONB NOT NULL, 
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    UNIQUE(tipo_metrica, fecha_referencia) 
); 

CREATE MATERIALIZED VIEW mv_empleabilidad_por_carrera AS 
SELECT 
    e.carrera, 
    e.anio_egreso, 
    COUNT(DISTINCT e.id) AS total_egresados, 
    COUNT(DISTINCT CASE WHEN p.estado = 'contratado' THEN p.egresado_id END) AS empleados, 
    ROUND(COUNT(DISTINCT CASE WHEN p.estado = 'contratado' THEN p.egresado_id END)::DECIMAL / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2) AS tasa_empleabilidad 
FROM egresados e 
LEFT JOIN postulaciones p ON e.id = p.egresado_id 
GROUP BY e.carrera, e.anio_egreso; 

CREATE MATERIALIZED VIEW mv_demanda_habilidades AS 
SELECT 
    h.nombre AS habilidad, 
    COUNT(DISTINCT ohl.oferta_id) AS ofertas_requieren, 
    AVG(ohl.importancia) AS importancia_promedio 
FROM habilidades h 
JOIN ofertas_habilidades ohl ON h.id = ohl.habilidad_id 
GROUP BY h.id, h.nombre 
ORDER BY ofertas_requieren DESC; 

CREATE TRIGGER trg_generate_code_users BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION generate_correlative_code('USER-');
CREATE TRIGGER trg_generate_code_egresados BEFORE INSERT ON egresados FOR EACH ROW EXECUTE FUNCTION generate_correlative_code('EGR-');
CREATE TRIGGER trg_generate_code_empresas BEFORE INSERT ON empresas FOR EACH ROW EXECUTE FUNCTION generate_correlative_code('EMP-');
CREATE TRIGGER trg_generate_code_ofertas BEFORE INSERT ON ofertas_laborales FOR EACH ROW EXECUTE FUNCTION generate_correlative_code('OFR-');
CREATE TRIGGER trg_generate_code_postulaciones BEFORE INSERT ON postulaciones FOR EACH ROW EXECUTE FUNCTION generate_correlative_code('POST-');

CREATE OR REPLACE FUNCTION update_updated_at_column() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW.updated_at = CURRENT_TIMESTAMP; 
    RETURN NEW; 
    END; 
$$ LANGUAGE plpgsql; 

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
CREATE TRIGGER update_egresados_updated_at BEFORE UPDATE ON egresados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
CREATE TRIGGER update_ofertas_updated_at BEFORE UPDATE ON ofertas_laborales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 

CREATE OR REPLACE FUNCTION refresh_dashboard_mviews() 
RETURNS VOID AS $$ 
BEGIN 
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_empleabilidad_por_carrera; 
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_demanda_habilidades; 
END; 
$$ LANGUAGE plpgsql;
