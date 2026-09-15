import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const VITE_SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const VITE_SUPABASE_ANON_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: teams } = await supabase.from('teams').select('id').ilike('code', 'P19');
  const teamId = teams[0].id;
  
  const { data: missions } = await supabase.from('missions')
    .select('id, activity_date, is_canceled, status, beneficiaries_individual(id, registry_id, full_name, id_hash), beneficiaries_group(count, is_repeated)')
    .eq('team_id', teamId);
    
  let earlyMissions = missions.filter(m => m.activity_date < '2025-01-01');
  let earlyBens = 0;
  earlyMissions.forEach(m => {
    earlyBens += m.beneficiaries_individual.length;
    m.beneficiaries_group.forEach(g => earlyBens += g.count);
  });
  console.log("Missions before 2025:", earlyMissions.length, "Beneficiaries:", earlyBens);
}
run();
