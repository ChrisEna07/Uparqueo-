-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: migracion_organizaciones.sql
-- Uparqueo: Esquema Multitenant Formal Basado en Organizaciones
-- ==============================================================================

-- 1. Crear tabla de Organizaciones
CREATE TABLE IF NOT EXISTS public.organizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE,
    modulos_activos TEXT[] DEFAULT ARRAY['parqueadero', 'informal'],
    estado TEXT DEFAULT 'activo', -- 'activo', 'suspendido'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS en organizaciones
ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica o autenticada de organizaciones" ON public.organizaciones;
CREATE POLICY "Lectura publica o autenticada de organizaciones"
ON public.organizaciones FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Modificacion de organizaciones para autenticados" ON public.organizaciones;
CREATE POLICY "Modificacion de organizaciones para autenticados"
ON public.organizaciones FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Vincular tablas a organizacion_id
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfiles_organizacion_id ON public.perfiles (organizacion_id);

ALTER TABLE public.tenant_billing 
ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tenant_billing_organizacion_id ON public.tenant_billing (organizacion_id);

-- Vincular tablas operativas si existen
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cierres_caja') THEN
        ALTER TABLE public.cierres_caja ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_cierres_caja_organizacion_id ON public.cierres_caja (organizacion_id);
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'negocios_informales') THEN
        ALTER TABLE public.negocios_informales ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_negocios_informales_organizacion_id ON public.negocios_informales (organizacion_id);
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'egresos') THEN
        ALTER TABLE public.egresos ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_egresos_organizacion_id ON public.egresos (organizacion_id);
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidencias') THEN
        ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lista_negra') THEN
        ALTER TABLE public.lista_negra ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Crear la primera organización: "Parqueadero Moncho"
INSERT INTO public.organizaciones (nombre, slug, modulos_activos, estado)
VALUES ('Parqueadero Moncho', 'parqueadero-moncho', ARRAY['informal'], 'activo')
ON CONFLICT (slug) DO UPDATE
SET modulos_activos = EXCLUDED.modulos_activos;

-- Crear también organización base para parqueadero si se desea
INSERT INTO public.organizaciones (nombre, slug, modulos_activos, estado)
VALUES ('Uparqueo Central', 'uparqueo-central', ARRAY['parqueadero'], 'activo')
ON CONFLICT (slug) DO NOTHING;

-- 4. Asociar todos los datos y empleados actuales de informales a "Parqueadero Moncho"
DO $$
DECLARE
    org_moncho_id UUID;
    org_central_id UUID;
BEGIN
    SELECT id INTO org_moncho_id FROM public.organizaciones WHERE slug = 'parqueadero-moncho' LIMIT 1;
    SELECT id INTO org_central_id FROM public.organizaciones WHERE slug = 'uparqueo-central' LIMIT 1;
    
    IF org_moncho_id IS NOT NULL THEN
        -- Asignar empleados actuales de informales a la organización Moncho
        UPDATE public.perfiles
        SET organizacion_id = org_moncho_id
        WHERE modulo = 'informal' 
           OR rol ILIKE '%informal%' 
           OR username IN ('moncho', 'flaca', 'hamilton10');

        -- Asignar los puestos y negocios informales a la organización Moncho
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'negocios_informales') THEN
            UPDATE public.negocios_informales SET organizacion_id = org_moncho_id WHERE organizacion_id IS NULL;
        END IF;

        -- Asignar cierres de caja de informales
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cierres_caja') THEN
            UPDATE public.cierres_caja SET organizacion_id = org_moncho_id WHERE modulo = 'informal';
        END IF;
        
        -- Asignar configuración de cobro si existía
        UPDATE public.tenant_billing 
        SET organizacion_id = org_moncho_id 
        WHERE tenant_id = 'informales' OR tenant_id = 'parqueadero-moncho';
    END IF;

    -- Asignar resto de perfiles de parqueadero a Uparqueo Central
    IF org_central_id IS NOT NULL THEN
        UPDATE public.perfiles
        SET organizacion_id = org_central_id
        WHERE organizacion_id IS NULL AND modulo = 'parqueadero' AND rol NOT IN ('superadmin', 'dev');
    END IF;
END $$;
