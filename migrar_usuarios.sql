-- ==========================================
-- SCRIPT DE MIGRACIÓN: DE 'admins' A 'auth.users'
-- Ejecuta este script en el SQL Editor de Supabase
-- ==========================================

-- 1. Asegurarnos de que la tabla perfiles tenga TODAS las columnas necesarias
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'username') THEN
        ALTER TABLE public.perfiles ADD COLUMN username TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'foto_perfil') THEN
        ALTER TABLE public.perfiles ADD COLUMN foto_perfil TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'nombre_completo') THEN
        ALTER TABLE public.perfiles ADD COLUMN nombre_completo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'rol') THEN
        ALTER TABLE public.perfiles ADD COLUMN rol TEXT;
    END IF;
END $$;

-- 2. Migrar los usuarios
DO $$
DECLARE
    admin_record RECORD;
    new_user_id UUID;
    user_email TEXT;
BEGIN
    -- Recorrer todos los usuarios de la tabla antigua 'admins'
    FOR admin_record IN SELECT * FROM public.admins LOOP
        
        -- Formatear un correo ficticio válido para Supabase Auth
        user_email := lower(trim(admin_record.username)) || '@uparqueo.com';
        
        -- Verificar si el usuario ya existe en auth.users para evitar duplicados
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
            
            -- Generar un nuevo UUID para el usuario
            new_user_id := extensions.uuid_generate_v4();
            
            -- 1. Insertar el usuario en auth.users con su clave encriptada antigua
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                new_user_id,
                'authenticated',
                'authenticated',
                user_email,
                extensions.crypt(admin_record.password, extensions.gen_salt('bf')),
                current_timestamp, -- Autoconfirmar correo
                '{"provider":"email","providers":["email"]}',
                jsonb_build_object('username', admin_record.username, 'rol', admin_record.rol),
                current_timestamp,
                current_timestamp,
                '', '', '', ''
            );
            
            -- Nota: Como creaste un trigger, al insertar en auth.users se creará 
            -- automáticamente un registro en public.perfiles con valores por defecto.
            
            -- 2. Actualizar el perfil recién creado por el trigger con los datos reales
            UPDATE public.perfiles
            SET 
                username = admin_record.username,
                nombre_completo = admin_record.nombre_completo,
                rol = admin_record.rol,
                foto_perfil = admin_record.foto_perfil
            WHERE id = new_user_id;

            RAISE NOTICE 'Usuario migrado exitosamente: %', admin_record.username;
        ELSE
            RAISE NOTICE 'El usuario % ya existe en Supabase Auth.', admin_record.username;
        END IF;
    END LOOP;
END $$;
