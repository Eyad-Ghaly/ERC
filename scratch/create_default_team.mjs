import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vstuopepeumykdziczme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3q4rnRS__FXgLYhZY3H-XA_daAWShey";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function ensureDefaultTeam() {
  const { data: depts } = await supabase.from('departments').select('*');
  console.log("Departments count:", depts?.length);
  if (!depts || depts.length === 0) return;

  const defaultDeptId = depts[0].id;
  const { data: teams } = await supabase.from('teams').select('*');
  if (!teams || teams.length === 0) {
    console.log("Creating default team P01...");
    const { data: newTeam, error } = await supabase.from('teams').insert({
      code: "P01",
      name: "الفريق الرئيسي",
      department_id: defaultDeptId
    }).select().single();
    console.log("New team res:", newTeam, "error:", error);
  } else {
    console.log("Teams already exist:", teams);
  }
}

ensureDefaultTeam();
