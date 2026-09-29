const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
let url = '', key = '';
for(let line of env) {
  if(line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if(line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) key = line.split('=')[1].replace(/"/g, '').trim();
}
const supabase = createClient(url, key);
async function run() {
  const { data, error } = await supabase.from('department_indicators').select('id, title, target_type, objective_id, code');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
