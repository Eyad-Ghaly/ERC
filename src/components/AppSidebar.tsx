import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Home, FilePlus, Radio, Sparkles, ShieldCheck, Users2, BarChart3, Database, Settings, LogOut, UserPlus, Target, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLES, type AppRole } from "@/lib/constants";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: (AppRole | "*")[];
}

const items: NavItem[] = [
  { title: "الرئيسية", url: "/", icon: Home, roles: ["*"] },
  { title: "لوحة معلومات فريقي", url: "/department-dashboard", icon: BarChart3, roles: ["department_entry", "admin"] },
  { title: "مستهدفات فريقي", url: "/team-targets", icon: Target, roles: ["department_entry", "data_manager", "admin"] },
  { title: "تقييم وتوثيق المهام", url: "/mission-feedback", icon: Star, roles: ["department_entry", "data_manager", "admin"] },
  { title: "إدخال مهمة جديدة", url: "/department-entry", icon: FilePlus, roles: ["department_entry", "admin"] },
  { title: "تسجيل المستفيدين", url: "/beneficiaries-registration", icon: UserPlus, roles: ["department_entry", "admin"] },
  { title: "طلب إمداد بالمتطوعين", url: "/volunteer-supply-request/new", icon: UserPlus, roles: ["department_entry", "management", "admin"] },
  { title: "غرفة العمليات", url: "/operations-room", icon: Radio, roles: ["operations_room", "operations_supervisor", "admin"] },
  { title: "الجوكر", url: "/joker", icon: Sparkles, roles: ["joker", "admin"] },
  { title: "مشرف غرفة العمليات", url: "/supervisor", icon: ShieldCheck, roles: ["operations_supervisor", "admin"] },
  { title: "غرفة الشباب والتطوع", url: "/youth", icon: Users2, roles: ["youth_room", "admin"] },
  { title: "مسؤولي شباب الفروع", url: "/branch-youth", icon: Users2, roles: ["branch_youth", "admin"] },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, roles: ["stakeholder", "data_manager", "admin"] },
  { title: "إدارة وتحليل البيانات", url: "/data-manager", icon: Database, roles: ["data_manager", "admin"] },
  { title: "لوحة المدير", url: "/admin", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { roles, profile, signOut } = useAuth();

  const visible = items.filter((it) => it.roles.includes("*") || it.roles.some((r) => roles.includes(r as AppRole)));
  const primaryRole = roles[0];

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sidebar-foreground text-sm">منظومة المهام</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>القوائم</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} end>
                        <item.icon className="w-4 h-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && primaryRole && (
          <div className="text-xs text-sidebar-foreground/70 px-2">
            الدور: <span className="font-semibold text-sidebar-foreground">{ROLES[primaryRole]}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
          <LogOut className="w-4 h-4 ms-2" />
          {!collapsed && "تسجيل الخروج"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
