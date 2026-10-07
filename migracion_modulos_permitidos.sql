-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: migracion_modulos_permitidos.sql
-- Uparqueo: Soporte para asignación de módulos específicos a cuentas de admin
-- ==============================================================================

-- 1. Agregar columna modulos_permitidos a public.perfiles
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS modulos_permitidos TEXT[] DEFAULT ARRAY['parqueadero', 'informal'];

-- 2. Actualizar perfiles existentes para sincronizar modulos_permitidos con su columna modulo
UPDATE public.perfiles
SET modulos_permitidos = CASE 
    WHEN modulo = 'informal' THEN ARRAY['informal']
    WHEN modulo = 'parqueadero' THEN ARRAY['parqueadero']
    ELSE ARRAY['parqueadero', 'informal']
END
WHERE modulos_permitidos IS NULL;

-- 3. Crear índice para optimizar consultas de roles y permisos
CREATE INDEX IF NOT EXISTS idx_perfiles_modulos_permitidos ON public.perfiles USING GIN (modulos_permitidos);
