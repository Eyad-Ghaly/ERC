const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=\"(.*)\"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*)\"/);
if (urlMatch && keyMatch) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  async function check() {
    const { data } = await supabase.from('missions').select('*').limit(1);
    if(data) console.log(Object.keys(data[0]));
  }
  check();
}
