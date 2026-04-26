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
  const { user, hasRole } = useAuth();
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      const { data: all } = await supabase
        .from("dropdown_options")
        .select("*")
        .eq("field_key", fieldKey)
        .eq("active", true)
        .order("label");

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

      if (active) {
        setOptions(filtered);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fieldKey, user, hasRole]);

  return { options, loading };
}
