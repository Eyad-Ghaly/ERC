import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vstuopepeumykdziczme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3q4rnRS__FXgLYhZY3H-XA_daAWShey";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkUploadedData() {
  console.log("=== VOLUNTEERS BASE ===");
  const { data: vb } = await supabase.from('volunteers_base').select('id, full_name, membership_number, branch');
  console.log("Count in base:", vb?.length);
  console.log("Sample base:", vb?.slice(0, 5));

  console.log("=== VOLUNTEER TEAMS ===");
  const { data: vt } = await supabase.from('volunteer_teams').select('id, team_id, volunteer_id, teams(code)');
  console.log("Count in teams:", vt?.length);
  console.log("Sample teams:", vt?.slice(0, 5));
}

checkUploadedData();
