import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DropdownOption {
  id: string;
  field_key: string;
  value: string;
  label: string;
  active: boolean;
}

/**
 * Returns the dropdown options for a given field, restricted to the
 * user's allowed options if any restrictions are set, otherwise returns ALL active options.
 * Admins always see everything.
 */
export function useDropdownOptions(fieldKey: string) {
  const { user, profile, hasRole } = useAuth();
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      let query = supabase
        .from("dropdown_options")
        .select("*")
        .eq("field_key", fieldKey)
        .eq("active", true);

      if (profile?.team_id) {
        query = query.or(`team_id.is.null,team_id.eq.${profile.team_id}`);
      } else {
        query = query.is("team_id", null);
      }

      const { data: all } = await query.order("label");

      let filtered = (all ?? []) as DropdownOption[];

      if (user && !hasRole("admin")) {
        const { data: restrictions } = await supabase
          .from("user_dropdown_options")
          .select("option_id")
          .eq("user_id", user.id);

        const fieldRestrictions = (restrictions ?? [])
          .map((r) => r.option_id)
          .filter((id) => filtered.some((o) => o.id === id));

        if (fieldRestrictions.length > 0) {
          filtered = filtered.filter((o) => fieldRestrictions.includes(o.id));
        }
      }

      if (fieldKey === 'service_type') {
        let indQuery = supabase
          .from("department_indicators")
          .select("id, title")
          .eq("target_type", "service_type");

        if (profile?.team_id) {
          indQuery = indQuery.eq("team_id", profile.team_id);
        }

        const { data: indicators } = await indQuery;
        if (indicators) {
          const indOptions = indicators.map(ind => ({
            id: ind.id,
            field_key: 'service_type',
            value: ind.title,
            label: ind.title,
            active: true
          }));
          filtered = [...filtered, ...indOptions];
        }
      }

      if (active) {
        setOptions(filtered);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fieldKey, user, profile, hasRole]);

  return { options, loading };
}
