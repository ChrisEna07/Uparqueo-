-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: separar_modulos.sql
-- Uparqueo: Aislamiento Multitenant de Módulos & Sistema de Suscripción / Cobro
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. AISLAMIENTO EN TABLA public.perfiles
-- Añadir columna 'modulo' ('parqueadero', 'informal', 'ambos', 'todos')
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';

-- Asignar valores coherentes para registros existentes basados en su rol si modulo es nulo o default
UPDATE public.perfiles
SET modulo = CASE 
    WHEN rol IN ('ambos', 'admin_master', 'superadmin', 'dev') THEN 'ambos'
    WHEN rol = 'informales' OR rol LIKE '%informal%' THEN 'informal'
    ELSE 'parqueadero'
END
WHERE modulo IS NULL OR modulo = 'parqueadero';

-- Índices para búsquedas optimizadas por módulo y rol
CREATE INDEX IF NOT EXISTS idx_perfiles_modulo ON public.perfiles (modulo);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol_modulo ON public.perfiles (rol, modulo);

-- 2. AISLAMIENTO EN TABLA public.cierres_caja
ALTER TABLE public.cierres_caja 
ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';

CREATE INDEX IF NOT EXISTS idx_cierres_caja_modulo ON public.cierres_caja (modulo);

-- 3. AISLAMIENTO EN TABLAS OPERATIVAS SI EXISTEN
DO $$
BEGIN
    -- egresos (gastos)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'egresos') THEN
        ALTER TABLE public.egresos ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';
        CREATE INDEX IF NOT EXISTS idx_egresos_modulo ON public.egresos (modulo);
    END IF;

    -- evidencias
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidencias') THEN
        ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';
        CREATE INDEX IF NOT EXISTS idx_evidencias_modulo ON public.evidencias (modulo);
    END IF;

    -- lista_negra
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lista_negra') THEN
        ALTER TABLE public.lista_negra ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';
        CREATE INDEX IF NOT EXISTS idx_lista_negra_modulo ON public.lista_negra (modulo);
    END IF;

    -- puestos (si existe)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'puestos') THEN
        ALTER TABLE public.puestos ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'informal';
        CREATE INDEX IF NOT EXISTS idx_puestos_modulo ON public.puestos (modulo);
    END IF;

    -- tarifas (si existe)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarifas') THEN
        ALTER TABLE public.tarifas ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';
    END IF;

    -- turnos (si existe)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'turnos') THEN
        ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS modulo TEXT DEFAULT 'parqueadero';
    END IF;
END $$;

-- 4. TABLA DE CONFIGURACIÓN DE SUSCRIPCIÓN / COBRO (public.tenant_billing)
CREATE TABLE IF NOT EXISTS public.tenant_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT DEFAULT 'default' UNIQUE,
    banner_activo BOOLEAN DEFAULT false,
    tipo_aviso TEXT DEFAULT 'modal', -- 'modal' o 'banner'
    es_bloqueante BOOLEAN DEFAULT false, -- false = tiene botón [X] para cerrar; true = bloqueo total sin cerrar
    mensaje TEXT DEFAULT 'Su mensualidad ha vencido. Por favor realice el pago para continuar utilizando el sistema.',
    datos_pago TEXT DEFAULT 'Nequi / Daviplata: 300 000 0000 - A nombre de: Administrador',
    fecha_vencimiento DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS en tenant_billing
ALTER TABLE public.tenant_billing ENABLE ROW LEVEL SECURITY;

-- Insertar configuración inicial por defecto si no existe
INSERT INTO public.tenant_billing (tenant_id, banner_activo, es_bloqueante, tipo_aviso, mensaje, datos_pago)
VALUES (
    'default',
    false,
    false,
    'modal',
    'Su mensualidad del sistema ha vencido. Por favor realice el pago para continuar utilizando el sistema.',
    'Nequi / Daviplata: 300 000 0000 - A nombre de: Administrador'
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Políticas de seguridad RLS
DROP POLICY IF EXISTS "Lectura publica o autenticada de tenant_billing" ON public.tenant_billing;
CREATE POLICY "Lectura publica o autenticada de tenant_billing"
ON public.tenant_billing FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Actualizacion de tenant_billing para autenticados" ON public.tenant_billing;
CREATE POLICY "Actualizacion de tenant_billing para autenticados"
ON public.tenant_billing FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar publicación para suscripciones en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_billing;
