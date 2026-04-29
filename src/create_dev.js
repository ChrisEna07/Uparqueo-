import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsytgctqtsdrwvimfkop.supabase.co';
const supabaseAnonKey = 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createDeveloper() {
  const { data, error } = await supabase.from('admins').insert([
    {
      username: 'lordchriz',
      password: 'devpassword',
      rol: 'ambos',
      nombre_completo: 'Lord Chriz (Soporte Técnico)',
      foto_perfil: 'https://ui-avatars.com/api/?name=Lord+Chriz&background=0D8ABC&color=fff'
    }
  ]).select();

  if (error) {
    console.error('Error creating developer:', error);
  } else {
    console.log('Developer created successfully:', data[0].username);
  }
}

createDeveloper();
