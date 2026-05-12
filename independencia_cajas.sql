-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN: INDEPENDENCIA DE CAJAS
-- Ejecuta este script en el SQL Editor de Supabase
-- ==========================================

DO $$
BEGIN
    -- Añadir columna 'modulo' a la tabla cierres_caja si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'cierres_caja' AND column_name = 'modulo'
    ) THEN
        ALTER TABLE public.cierres_caja ADD COLUMN modulo TEXT DEFAULT 'parqueadero';
    END IF;
END $$;
