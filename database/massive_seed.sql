
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SET client_encoding = 'UTF8';

DELETE FROM historial_estados;
DELETE FROM postulaciones;
DELETE FROM ofertas_habilidades;
DELETE FROM ofertas_laborales;
DELETE FROM egresados_habilidades;
DELETE FROM habilidades;
DELETE FROM administradores;
DELETE FROM egresados;
DELETE FROM empresas;
DELETE FROM notificaciones;
DELETE FROM reportes;
DELETE FROM metricas_dashboard;
DELETE FROM users;

ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE egresados_id_seq RESTART WITH 1;
ALTER SEQUENCE empresas_id_seq RESTART WITH 1;
ALTER SEQUENCE administradores_id_seq RESTART WITH 1;
ALTER SEQUENCE habilidades_id_seq RESTART WITH 1;
ALTER SEQUENCE ofertas_laborales_id_seq RESTART WITH 1;
ALTER SEQUENCE postulaciones_id_seq RESTART WITH 1;

-- Admin: admin@example.com / admin123
INSERT INTO users (email, password_hash, rol) VALUES 
('admin@example.com', '$2b$10$mlMLXgxbqVWkIgCgJgZnD.mE3g5BnVDHkc7F.kKsWU1BuMpL8E5vm', 'admin');
INSERT INTO administradores (user_id, nivel_acceso) VALUES (1, 'superadmin');

INSERT INTO habilidades (nombre, tipo) VALUES 
('React', 'tecnica'), ('Node.js', 'tecnica'), ('PostgreSQL', 'tecnica'), ('TypeScript', 'tecnica'), 
('Docker', 'tecnica'), ('AWS', 'tecnica'), ('Python', 'tecnica'), ('Java', 'tecnica'),
('Trabajo en Equipo', 'blanda'), ('Liderazgo', 'blanda'), ('Comunicación Asertiva', 'blanda'), ('Adaptación al Cambio', 'blanda');

DO $$
BEGIN
    FOR i IN 1..10 LOOP
        -- Empresa Pass: password123
        INSERT INTO users (email, password_hash, rol) 
        VALUES ('empresa' || i || '@example.com', '$2b$10$682VK7FISQ3nKFk1lqzB4uVaPlRkIzqHuLs3PdES5ufEkcTivD2HW', 'empresa');
        
        INSERT INTO empresas (user_id, nombre_empresa, sector, ubicacion, sitio_web) 
        VALUES (i + 1, 'Corporación Tecnológica ' || i, 
                (ARRAY['Tecnología', 'Banca y Finanzas', 'Educación Superior', 'Comercio y Retail'])[floor(random()*4)+1],
                (ARRAY['Lima Metropolitana', 'Remoto', 'Ciudad de Arequipa', 'Trujillo Centro'])[floor(random()*4)+1],
                'https://empresa' || i || '.com.pe');
    END LOOP;
END $$;

DO $$
BEGIN
    FOR i IN 1..50 LOOP
        -- Egresado Pass: egresado123
        INSERT INTO users (email, password_hash, rol) 
        VALUES ('egresado' || i || '@example.com', '$2b$10$4e2y5JZmS2RXRc3aLiwrW.IBpmYSSN6CXWkm3PQ20wishbO086afO', 'egresado');

        INSERT INTO egresados (user_id, nombre, apellido, carrera, anio_egreso, empleado_actualmente, horario_inicio, horario_fin) 
        VALUES (i + 11, 'Egresado_' || i, 'Apellido_' || i, 
                (ARRAY['Ingeniería de Sistemas', 'Ingeniería Industrial', 'Ingeniería Civil', 'Administración de Empresas', 'Derecho y Ciencias Políticas'])[floor(random()*5)+1],
                floor(random()*(2024-2018+1))+2018,
                (random() > 0.4),
                (ARRAY['08:00:00', '09:00:00', '07:00:00', '10:00:00'])[floor(random()*4)+1]::time,
                (ARRAY['16:00:00', '17:00:00', '18:00:00', '15:00:00'])[floor(random()*4)+1]::time
        ); 
    END LOOP;
END $$;

DO $$
BEGIN
    FOR i IN 1..25 LOOP
        INSERT INTO ofertas_laborales (empresa_id, titulo, descripcion, ubicacion, modalidad, tipo_contrato, salario_min, salario_max, horario_inicio, horario_fin, activa, fecha_publicacion) 
        VALUES (floor(random()*10)+1, 
                (ARRAY['Desarrollador Fullstack Senior', 'Analista de Datos y BI', 'Gerente de Proyectos TI', 'Ingeniero de Calidad (QA)', 'Arquitecto de Soluciones Cloud'])[floor(random()*5)+1] || ' ' || i,
                'Buscamos profesionales con sólida experiencia para integrarse a nuestro equipo de innovación y gestión tecnológica.',
                (ARRAY['Lima, Perú', 'Remoto (Latinoamérica)', 'Híbrido - San Isidro'])[floor(random()*3)+1],
                (ARRAY['remoto', 'hibrido', 'presencial'])[floor(random()*3)+1],
                'Contrato Indefinido',
                3500 + (floor(random()*2000)),
                7000 + (floor(random()*3000)),
                (ARRAY['08:00:00', '09:00:00', '07:00:00', '10:00:00'])[floor(random()*4)+1]::time,
                (ARRAY['17:00:00', '18:00:00', '16:00:00', '19:00:00'])[floor(random()*4)+1]::time,
                true,
                CURRENT_DATE - (floor(random()*120) || ' days')::interval);
    END LOOP;
END $$;

DO $$
BEGIN
    FOR i IN 1..50 LOOP
        FOR j IN 1..3 LOOP
            INSERT INTO egresados_habilidades (egresado_id, habilidad_id, nivel_experiencia)
            VALUES (i, floor(random()*12)+1, floor(random()*5)+1)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

DO $$
BEGIN
    FOR i IN 1..25 LOOP
        FOR j IN 1..3 LOOP
            INSERT INTO ofertas_habilidades (oferta_id, habilidad_id, importancia)
            VALUES (i, floor(random()*8)+1, floor(random()*5)+1)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

DO $$
BEGIN
    FOR i IN 1..60 LOOP
        INSERT INTO postulaciones (oferta_id, egresado_id, estado, fecha_postulacion)
        VALUES (floor(random()*25)+1, floor(random()*50)+1, 
                (ARRAY['postulado', 'revision', 'entrevista', 'contratado', 'rechazado'])[floor(random()*5)+1],
                CURRENT_DATE - (floor(random()*90) || ' days')::interval)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

INSERT INTO metricas_dashboard (tipo_metrica, fecha_referencia, valores) VALUES 
('empleabilidad', CURRENT_DATE, '{"tasa": 64.5, "total": 50}'),
('habilidades_demandadas', CURRENT_DATE, '{"React": 18, "Node.js": 14, "PostgreSQL": 11, "AWS": 9, "Docker": 8}');
