-- ==========================================
-- SCRIPT PARA CORREGIR LAS CONTRASEÑAS EN AUTH.USERS
-- Ejecuta este script en el SQL Editor de Supabase
-- ==========================================

DO $$
DECLARE
    admin_record RECORD;
    user_email TEXT;
BEGIN
    -- Recorrer todos los usuarios de la tabla antigua 'admins'
    FOR admin_record IN SELECT * FROM public.admins LOOP
        
        -- Formatear el correo
        user_email := lower(trim(admin_record.username)) || '@uparqueo.com';
        
        -- Actualizar la contraseña en auth.users
        -- Usamos trim() para evitar espacios accidentales en la contraseña antigua
        -- Usamos gen_salt('bf', 10) porque Supabase Auth requiere un factor de costo de 10 por seguridad.
        UPDATE auth.users 
        SET encrypted_password = extensions.crypt(trim(admin_record.password), extensions.gen_salt('bf', 10))
        WHERE email = user_email;

        RAISE NOTICE 'Contraseña corregida para: %', user_email;
    END LOOP;
END $$;
