import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vstuopepeumykdziczme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3q4rnRS__FXgLYhZY3H-XA_daAWShey";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkAll() {
  console.log("=== TEAMS ===");
  const { data: teams, error: terr } = await supabase.from('teams').select('*');
  console.log("Teams err:", terr);
  console.log("Teams:", teams);

  console.log("=== VOLUNTEERS BASE ===");
  const { data: vb, error: vberr } = await supabase.from('volunteers_base').select('*');
  console.log("VolunteersBase err:", vberr);
  console.log("VolunteersBase:", vb);

  console.log("=== VOLUNTEER TEAMS ===");
  const { data: vt, error: vterr } = await supabase.from('volunteer_teams').select('*');
  console.log("VolunteerTeams err:", vterr);
  console.log("VolunteerTeams:", vt);
}

checkAll();
