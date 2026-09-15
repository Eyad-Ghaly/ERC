const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: teams } = await supabase.from('teams').select('id').ilike('code', 'P19');
  const teamId = teams[0].id;
  
  const { data: missions } = await supabase.from('missions').select('activity_date, is_canceled, status, beneficiaries_individual(id, registry_id, full_name, id_hash), beneficiaries_group(count, is_repeated)').eq('team_id', teamId);
  
  let dashboardBens = 0;
  let sqlBens = 0;
  let indivIds = new Set();
  let indivRegs = new Set();
  let dashboardSet = new Set();

  missions.forEach(m => {
    if (m.is_canceled || m.status === 'canceled') return;
    
    // sql view logic
    if (m.activity_date >= '2025-01-01' && m.activity_date <= '2026-12-31') {
      m.beneficiaries_individual.forEach(b => {
        if (b.registry_id) indivRegs.add(b.registry_id);
        else indivIds.add(b.id);
      });
    }
    
    // dashboard logic
    m.beneficiaries_individual.forEach(b => {
      if (b.id_hash) dashboardSet.add(`hash::${b.id_hash}`);
      else if (b.full_name && b.full_name.trim()) dashboardSet.add(`name::${b.full_name.trim().toLowerCase()}`);
      else if (b.registry_id) dashboardSet.add(`reg::${b.registry_id}`);
      else dashboardSet.add(`id::${b.id}`);
    });
  });
  
  console.log("SQL Unique count:", indivRegs.size + indivIds.size);
  console.log("Dashboard Unique count:", dashboardSet.size);
  
  // Also check if any group beneficiaries
  let sqlGroup = 0;
  let dashGroup = 0;
  missions.forEach(m => {
    if (m.is_canceled || m.status === 'canceled') return;
    m.beneficiaries_group.forEach(g => {
      dashGroup += (g.is_repeated ? 0 : g.count);
      if (m.activity_date >= '2025-01-01' && m.activity_date <= '2026-12-31') {
        sqlGroup += g.count;
      }
    });
  });
  
  console.log("SQL Group count:", sqlGroup);
  console.log("Dashboard Group count:", dashGroup);
  
  console.log("Total SQL:", indivRegs.size + indivIds.size + sqlGroup);
  console.log("Total Dashboard:", dashboardSet.size + dashGroup);
}
run();
