import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vstuopepeumykdziczme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3q4rnRS__FXgLYhZY3H-XA_daAWShey";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkTeams() {
  const { data: teams, error } = await supabase.from('teams').select('*');
  console.log("Teams error:", error);
  console.log("Teams count:", teams?.length);
  console.log("Teams data:", teams);
  
  const { data: depts } = await supabase.from('departments').select('*');
  console.log("Depts count:", depts?.length);
}

checkTeams();
