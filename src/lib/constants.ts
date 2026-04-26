export const ROLES = {
  admin: "مدير النظام",
  data_manager: "مسؤول إدارة وتحليل البيانات",
  department_entry: "مسؤول الفريق (إدخال)",
  operations_room: "غرفة العمليات",
  operations_supervisor: "مشرف غرفة العمليات",
  joker: "الجوكر",
  youth_room: "غرفة الشباب والتطوع",
  stakeholder: "Dashboard - أصحاب المصلحة",
} as const;

export type AppRole = keyof typeof ROLES;

export const STATUS_LABELS: Record<string, string> = {
  planned: "مخطط لها",
  coded: "تم التكويد من الفريق",
  entered: "تم مراجعة الغرفة",
  reviewed: "تم مراجعة الجوكر",
  sent_to_youth: "تم مراجعة الشباب",
  sent_to_supervisor: "تم الإرسال للمشرف",
  monitored: "مكتملة",
  open_active: "مهمة مفتوحة ونشطة",
};

export const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  coded: "bg-info/15 text-info",
  entered: "bg-warning/15 text-warning",
  reviewed: "bg-primary/15 text-primary",
  sent_to_youth: "bg-accent/15 text-accent-foreground",
  sent_to_supervisor: "bg-info/15 text-info",
  monitored: "bg-success/15 text-success",
  open_active: "bg-primary/20 text-primary border border-primary/30",
};

export const REGIONS: Record<string, string> = {
  delta: "الدلتا",
  saaid: "الصعيد",
  qanal: "القنال",
  markaz_3am: "المركز العام",
};

export const MISSION_TYPES = { internal: "داخلي", external: "خارجي" } as const;
export const TRANSPORT_MODES = { public: "مواصلات", driver: "سائق + عربية" } as const;

export const DATA_SOURCES = { whatsapp: "واتس", wireless: "لاسلكي", phone: "تليفون" } as const;

export const VOLUNTEER_CHANGE_REASONS = {
  apologized: "اعتذر",
  redirected: "تم توجيهه",
  unavailable: "غير متاح",
  other: "أخرى",
} as const;

export const VOLUNTEER_NOTE_TYPES = {
  not_renewed: "غير مجدد",
  not_present: "غير موجود",
  membership_number: "رقم العضوية",
  base_not_updated: "قاعدة غير محدثة",
  separated: "مفصول",
  suspended: "موقوف",
} as const;

export const POINTS_OPTIONS = [0, 5, 10, 20];

export const DROPDOWN_FIELD_LABELS: Record<string, string> = {
  project_code: "كود المشروع",
  governorate: "محافظة التنفيذ",
  admin_code: "كود الإدارة",
  activity_classification: "تصنيف النشاط",
  activity_type: "نوع النشاط",
  activity_details: "تفاصيل النشاط",
  mission_nature: "طبيعة المهمة",
  type_name: "اسم النوع",
  classification: "التصنيف",
  classification_name: "اسم التصنيف",
};
