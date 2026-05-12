import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsytgctqtsdrwvimfkop.supabase.co';
const supabaseAnonKey = 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: admins } = await supabase.from('admins').select('*');
  console.log('Admins encontrados:', admins);
  
  if (!admins) return;
  
  for (const admin of admins) {
    const email = `${admin.username.trim().toLowerCase()}@uparqueo.com`;
    console.log(`Migrando usuario: ${admin.username} -> ${email}`);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: admin.password,
    });
    
    if (authError) {
      if (authError.message.includes('User already registered')) {
         console.log(`El usuario ${admin.username} ya estaba registrado en Auth.`);
      } else {
         console.error(`Error migrando ${admin.username}:`, authError.message);
      }
      continue;
    }
    
    console.log(`Usuario migrado con éxito: ${admin.username}. Se creó el perfil base.`);
    
    if (authData?.user) {
        const { error: profileError } = await supabase.from('perfiles').update({
            nombre_completo: admin.nombre_completo,
            rol: admin.rol,
            foto_perfil: admin.foto_perfil,
            // Guardamos el username real sin el @uparqueo.com
            username: admin.username 
        }).eq('id', authData.user.id);
        
        if (profileError) {
            console.error(`Error actualizando el perfil de ${admin.username}:`, profileError.message);
        } else {
            console.log(`Perfil actualizado para ${admin.username} con rol ${admin.rol}`);
        }
    }
  }
}

run();
