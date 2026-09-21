const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=\"(.*)\"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*)\"/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  async function fix() {
    const { data: mList } = await supabase.from('missions').select('id, mission_code, mission_name').ilike('mission_name', '%تنمية معرفية%');
    console.log(mList);
    if (!mList || mList.length === 0) return console.log('Mission not found');
    const m = mList[0];
    
    const { data: p } = await supabase.from('continuous_programs').select('name').eq('mission_id', m.id).single();
    if (!p) return console.log('Program not found');
    
    // Check how many have null/empty/غير محدد
    const { count: c1 } = await supabase.from('beneficiaries_individual').select('*', {count: 'exact', head: true}).eq('mission_id', m.id).is('service_type', null);
    const { count: c2 } = await supabase.from('beneficiaries_individual').select('*', {count: 'exact', head: true}).eq('mission_id', m.id).eq('service_type', '');
    const { count: c3 } = await supabase.from('beneficiaries_individual').select('*', {count: 'exact', head: true}).eq('mission_id', m.id).eq('service_type', 'غير محدد');

    console.log(`Found ${c1} null, ${c2} empty, ${c3} غير محدد`);

    await supabase.from('beneficiaries_individual').update({ service_type: p.name }).eq('mission_id', m.id).is('service_type', null);
    await supabase.from('beneficiaries_individual').update({ service_type: p.name }).eq('mission_id', m.id).eq('service_type', '');
    await supabase.from('beneficiaries_individual').update({ service_type: p.name }).eq('mission_id', m.id).eq('service_type', 'غير محدد');

    console.log('Fixed old records to:', p.name);
  }
  fix();
} else {
  console.log('Env not parsed correctly');
}
