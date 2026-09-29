const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.from('department_indicators').select('id, title, objective_id');
  if (error) console.log(error);
  else console.log(data.filter(d => d.title && d.title.includes('دعم نفسي')));
}
run();
