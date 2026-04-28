import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface VolunteerData {
  id: string;
  full_name: string;
  membership_number: string | null;
  branch: string | null;
}

interface VolunteerPickerProps {
  onSelect: (volunteer: VolunteerData) => void;
  className?: string;
}

export function VolunteerPicker({ onSelect, className }: VolunteerPickerProps) {
  const [volunteers, setVolunteers] = useState<VolunteerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(""); // selected volunteer id

  useEffect(() => {
    const fetchVolunteers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("volunteers_base")
        .select("id, full_name, membership_number, branch");
      
      if (!error && data) {
        setVolunteers(data);
      }
      setLoading(false);
    };
    fetchVolunteers();
  }, []);

  const branches = useMemo(() => {
    const bs = new Set(volunteers.map(v => v.branch).filter(Boolean) as string[]);
    return Array.from(bs).sort();
  }, [volunteers]);

  const filteredVolunteers = useMemo(() => {
    if (selectedBranch === "all") return volunteers;
    return volunteers.filter(v => v.branch === selectedBranch);
  }, [selectedBranch, volunteers]);

  const selectedVolunteer = volunteers.find(v => v.id === value);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="space-y-1.5">
        <Label className="text-xs">تصفية بالفرع</Label>
        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={loading}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="اختر الفرع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفروع</SelectItem>
            {branches.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 flex-1">
        <Label className="text-xs">اختر المتطوع (الاسم أو رقم العضوية)</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={loading}
              className="w-full justify-between h-9 font-normal"
            >
              {loading ? (
                <span className="flex items-center text-muted-foreground"><Loader2 className="w-3 h-3 me-2 animate-spin"/> جاري التحميل...</span>
              ) : selectedVolunteer ? (
                <span className="truncate">{selectedVolunteer.full_name} {selectedVolunteer.membership_number ? `(${selectedVolunteer.membership_number})` : ""}</span>
              ) : (
                <span className="text-muted-foreground">ابحث عن متطوع...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] md:w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="ابحث بالاسم أو رقم العضوية..." />
              <CommandList>
                <CommandEmpty>لم يتم العثور على متطوع.</CommandEmpty>
                <CommandGroup>
                  {filteredVolunteers.map((vol) => (
                    <CommandItem
                      key={vol.id}
                      value={`${vol.full_name} ${vol.membership_number || ""}`}
                      onSelect={() => {
                        setValue(vol.id);
                        setOpen(false);
                        onSelect(vol);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === vol.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col ms-2">
                        <span>{vol.full_name}</span>
                        {(vol.membership_number || vol.branch) && (
                          <span className="text-xs text-muted-foreground">
                            {vol.membership_number && `رقم: ${vol.membership_number}`} 
                            {vol.membership_number && vol.branch && " - "}
                            {vol.branch && `الفرع: ${vol.branch}`}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
