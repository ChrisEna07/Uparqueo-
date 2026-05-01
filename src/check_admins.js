import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsytgctqtsdrwvimfkop.supabase.co';
const supabaseAnonKey = 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('admins').select('*');
  if (error) console.error(error);
  else {
    console.log(`Admins found: ${data.length}`);
    data.forEach(a => {
      console.log(`- ID: ${a.id}, Username: ${a.username}, Name: ${a.nombre_completo}, Role: ${a.rol}`);
    });
  }
}
check();
