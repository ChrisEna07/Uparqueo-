import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsytgctqtsdrwvimfkop.supabase.co';
const supabaseAnonKey = 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdmins() {
  const { data, error } = await supabase.from('admins').select('*');
  if (error) {
    console.error('Error fetching admins:', error);
  } else {
    console.log('Admins found:', data.length);
    data.forEach(u => {
      console.log(`- ID: ${u.id}, Username: ${u.username}, Role: ${u.rol}`);
    });
  }
}

checkAdmins();
