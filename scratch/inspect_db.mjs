import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vstuopepeumykdziczme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3q4rnRS__FXgLYhZY3H-XA_daAWShey";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function inspect() {
  console.log("=== DEPARTMENTS ===");
  const { data: depts } = await supabase.from('departments').select('*');
  console.log("Departments:", depts);

  console.log("=== PROFILES ===");
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log("Profiles:", profs);

  console.log("=== TEAMS ===");
  const { data: teams } = await supabase.from('teams').select('*');
  console.log("Teams:", teams);
}

inspect();
