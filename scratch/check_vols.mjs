import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vstuopepeumykdziczme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3q4rnRS__FXgLYhZY3H-XA_daAWShey";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkVols() {
  const { data: vb, error: vbErr } = await supabase.from('volunteers_base').select('*');
  console.log("volunteers_base count:", vb?.length, "err:", vbErr);
  console.log("volunteers_base data:", vb);

  const { data: vt, error: vtErr } = await supabase.from('volunteer_teams').select('*');
  console.log("volunteer_teams count:", vt?.length, "err:", vtErr);
  console.log("volunteer_teams data:", vt);
}

checkVols();
