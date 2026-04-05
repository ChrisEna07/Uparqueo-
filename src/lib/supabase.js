import { createClient } from '@supabase/supabase-js';

// Tus credenciales del proyecto
const supabaseUrl = 'https://gsytgctqtsdrwvimfkop.supabase.co';
const supabaseAnonKey = 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);