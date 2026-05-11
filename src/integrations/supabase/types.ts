export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          diff: Json | null
          id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          diff?: Json | null
          id?: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          diff?: Json | null
          id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      beneficiaries_group: {
        Row: {
          age_category: string | null
          count: number | null
          created_at: string
          daily_report_id: string | null
          gender: string | null
          id: string
          mission_id: string
          nationality: string | null
          service_type: string | null
          updated_at: string
        }
        Insert: {
          age_category?: string | null
          count?: number | null
          created_at?: string
          daily_report_id?: string | null
          gender?: string | null
          id?: string
          mission_id: string
          nationality?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          age_category?: string | null
          count?: number | null
          created_at?: string
          daily_report_id?: string | null
          gender?: string | null
          id?: string
          mission_id?: string
          nationality?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_group_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "mission_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_group_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries_individual: {
        Row: {
          birthdate: string | null
          created_at: string
          daily_report_id: string | null
          full_name: string
          id: string
          mission_id: string
          national_id: string | null
          nationality: string | null
          phone: string | null
          service_quantity: number | null
          service_type: string | null
          updated_at: string
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          daily_report_id?: string | null
          full_name: string
          id?: string
          mission_id: string
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          service_quantity?: number | null
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          daily_report_id?: string | null
          full_name?: string
          id?: string
          mission_id?: string
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          service_quantity?: number | null
          service_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_individual_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "mission_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_individual_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      dropdown_options: {
        Row: {
          active: boolean
          created_at: string
          field_key: string
          id: string
          label: string
          value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          field_key: string
          id?: string
          label: string
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          field_key?: string
          id?: string
          label?: string
          value?: string
        }
        Relationships: []
      }
      mission_code_sequences: {
        Row: {
          last_seq: number
          team_code: string
        }
        Insert: {
          last_seq?: number
          team_code: string
        }
        Update: {
          last_seq?: number
          team_code?: string
        }
        Relationships: []
      }
      mission_daily_reports: {
        Row: {
          beneficiaries_status: string | null
          created_at: string
          day_number: number
          id: string
          joker_notes: string | null
          joker_reviewed_at: string | null
          mission_id: string
          ops_closed_at: string | null
          ops_notes: string | null
          report_date: string
          status: string | null
          updated_at: string
          youth_notes: string | null
          youth_reviewed_at: string | null
        }
        Insert: {
          beneficiaries_status?: string | null
          created_at?: string
          day_number: number
          id?: string
          joker_notes?: string | null
          joker_reviewed_at?: string | null
          mission_id: string
          ops_closed_at?: string | null
          ops_notes?: string | null
          report_date: string
          status?: string | null
          updated_at?: string
          youth_notes?: string | null
          youth_reviewed_at?: string | null
        }
        Update: {
          beneficiaries_status?: string | null
          created_at?: string
          day_number?: number
          id?: string
          joker_notes?: string | null
          joker_reviewed_at?: string | null
          mission_id?: string
          ops_closed_at?: string | null
          ops_notes?: string | null
          report_date?: string
          status?: string | null
          updated_at?: string
          youth_notes?: string | null
          youth_reviewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_daily_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_drivers: {
        Row: {
          created_at: string
          driver_name: string
          id: string
          mission_id: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          driver_name: string
          id?: string
          mission_id: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          driver_name?: string
          id?: string
          mission_id?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_drivers_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_routes: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          place: string
          position: number
          route_time: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          place: string
          position?: number
          route_time?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          place?: string
          position?: number
          route_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_routes_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_volunteers: {
        Row: {
          added_in_ops: boolean
          arrival_time: string | null
          branch: string | null
          change_note: string | null
          change_reason:
          | Database["public"]["Enums"]["volunteer_change_reason"]
          | null
          created_at: string
          departure_time: string | null
          full_name: string
          hours: number | null
          id: string
          membership_number: string | null
          mission_id: string
          points: number | null
          removed: boolean
          updated_at: string
        }
        Insert: {
          added_in_ops?: boolean
          arrival_time?: string | null
          branch?: string | null
          change_note?: string | null
          change_reason?:
          | Database["public"]["Enums"]["volunteer_change_reason"]
          | null
          created_at?: string
          departure_time?: string | null
          full_name: string
          hours?: number | null
          id?: string
          membership_number?: string | null
          mission_id: string
          points?: number | null
          removed?: boolean
          updated_at?: string
        }
        Update: {
          added_in_ops?: boolean
          arrival_time?: string | null
          branch?: string | null
          change_note?: string | null
          change_reason?:
          | Database["public"]["Enums"]["volunteer_change_reason"]
          | null
          created_at?: string
          departure_time?: string | null
          full_name?: string
          hours?: number | null
          id?: string
          membership_number?: string | null
          mission_id?: string
          points?: number | null
          removed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_volunteers_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          activity_classification: string | null
          activity_date: string
          activity_details: string | null
          activity_type: string | null
          admin_code: string | null
          beneficiaries_status: string | null
          classification: string | null
          classification_name: string | null
          completing_volunteer: string | null
          created_at: string
          created_by: string
          data_sources: Database["public"]["Enums"]["data_source"][] | null
          execution_place: string | null
          filler_volunteer: string | null
          follow_up_phone: string | null
          follow_up_responsible: string | null
          governorate: string | null
          has_beneficiaries: boolean | null
          id: string
          is_open_mission: boolean | null
          joker_name: string | null
          latitude: number | null
          longitude: number | null
          mission_code: string
          mission_name: string
          mission_nature: string | null
          mission_type: Database["public"]["Enums"]["mission_type"] | null
          monitor_name: string | null
          monitored_at: string | null
          ops_entered_at: string | null
          project_code: string
          region: Database["public"]["Enums"]["region"] | null
          reviewed_at: string | null
          reviewer_volunteer: string | null
          reviewing_supervisor: string | null
          sent_to_supervisor_at: string | null
          sent_to_youth_at: string | null
          status: Database["public"]["Enums"]["mission_status"]
          submitted_at: string | null
          supervisor: string | null
          team_code: string
          transport_mode: Database["public"]["Enums"]["transport_mode"] | null
          type_name: string | null
          updated_at: string
          youth_notes: string | null
          youth_reviewer: string | null
        }
        Insert: {
          activity_classification?: string | null
          activity_date: string
          activity_details?: string | null
          activity_type?: string | null
          admin_code?: string | null
          beneficiaries_status?: string | null
          classification?: string | null
          classification_name?: string | null
          completing_volunteer?: string | null
          created_at?: string
          created_by: string
          data_sources?: Database["public"]["Enums"]["data_source"][] | null
          execution_place?: string | null
          filler_volunteer?: string | null
          follow_up_phone?: string | null
          follow_up_responsible?: string | null
          governorate?: string | null
          has_beneficiaries?: boolean | null
          id?: string
          is_open_mission?: boolean | null
          joker_name?: string | null
          latitude?: number | null
          longitude?: number | null
          mission_code: string
          mission_name: string
          mission_nature?: string | null
          mission_type?: Database["public"]["Enums"]["mission_type"] | null
          monitor_name?: string | null
          monitored_at?: string | null
          ops_entered_at?: string | null
          project_code: string
          region?: Database["public"]["Enums"]["region"] | null
          reviewed_at?: string | null
          reviewer_volunteer?: string | null
          reviewing_supervisor?: string | null
          sent_to_supervisor_at?: string | null
          sent_to_youth_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          submitted_at?: string | null
          supervisor?: string | null
          team_code: string
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          type_name?: string | null
          updated_at?: string
          youth_notes?: string | null
          youth_reviewer?: string | null
        }
        Update: {
          activity_classification?: string | null
          activity_date?: string
          activity_details?: string | null
          activity_type?: string | null
          admin_code?: string | null
          beneficiaries_status?: string | null
          classification?: string | null
          classification_name?: string | null
          completing_volunteer?: string | null
          created_at?: string
          created_by?: string
          data_sources?: Database["public"]["Enums"]["data_source"][] | null
          execution_place?: string | null
          filler_volunteer?: string | null
          follow_up_phone?: string | null
          follow_up_responsible?: string | null
          governorate?: string | null
          has_beneficiaries?: boolean | null
          id?: string
          is_open_mission?: boolean | null
          joker_name?: string | null
          latitude?: number | null
          longitude?: number | null
          mission_code?: string
          mission_name?: string
          mission_nature?: string | null
          mission_type?: Database["public"]["Enums"]["mission_type"] | null
          monitor_name?: string | null
          monitored_at?: string | null
          ops_entered_at?: string | null
          project_code?: string
          region?: Database["public"]["Enums"]["region"] | null
          reviewed_at?: string | null
          reviewer_volunteer?: string | null
          reviewing_supervisor?: string | null
          sent_to_supervisor_at?: string | null
          sent_to_youth_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          submitted_at?: string | null
          supervisor?: string | null
          team_code?: string
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          type_name?: string | null
          updated_at?: string
          youth_notes?: string | null
          youth_reviewer?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          department_code: string | null
          email: string
          full_name: string | null
          id: string
          region: Database["public"]["Enums"]["region"] | null
          team_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          department_code?: string | null
          email: string
          full_name?: string | null
          id?: string
          region?: Database["public"]["Enums"]["region"] | null
          team_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          department_code?: string | null
          email?: string
          full_name?: string | null
          id?: string
          region?: Database["public"]["Enums"]["region"] | null
          team_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_kpi_targets: {
        Row: {
          id: string
          team_code: string
          target_month: string
          target_missions: number
          target_unique_volunteers: number
          target_volunteer_participations: number
          target_beneficiaries: number
          custom_targets: Json | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_code: string
          target_month: string
          target_missions?: number
          target_unique_volunteers?: number
          target_volunteer_participations?: number
          target_beneficiaries?: number
          custom_targets?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_code?: string
          target_month?: string
          target_missions?: number
          target_unique_volunteers?: number
          target_volunteer_participations?: number
          target_beneficiaries?: number
          custom_targets?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_custom_kpis: {
        Row: {
          id: string
          team_code: string
          kpi_label: string
          kpi_key: string
          created_at: string
        }
        Insert: {
          id?: string
          team_code: string
          kpi_label: string
          kpi_key: string
          created_at?: string
        }
        Update: {
          id?: string
          team_code?: string
          kpi_label?: string
          kpi_key?: string
          created_at?: string
        }
        Relationships: []
      }
      feedback_custom_questions: {
        Row: {
          id: string
          team_code: string
          question_text: string
          question_key: string
          created_at: string
        }
        Insert: {
          id?: string
          team_code: string
          question_text: string
          question_key: string
          created_at?: string
        }
        Update: {
          id?: string
          team_code?: string
          question_text?: string
          question_key?: string
          created_at?: string
        }
        Relationships: []
      }
      mission_feedback: {
        Row: {
          id: string
          mission_id: string
          service_rating: number | null
          communication_rating: number | null
          importance_rating: number | null
          notes: string | null
          photos: string[] | null
          custom_answers: Json | null
          is_dismissed: boolean | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mission_id: string
          service_rating?: number | null
          communication_rating?: number | null
          importance_rating?: number | null
          notes?: string | null
          photos?: string[] | null
          custom_answers?: Json | null
          is_dismissed?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mission_id?: string
          service_rating?: number | null
          communication_rating?: number | null
          importance_rating?: number | null
          notes?: string | null
          photos?: string[] | null
          custom_answers?: Json | null
          is_dismissed?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_feedback_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
            referencedColumns: ["id"]
          }
        ]
      }
      user_dropdown_options: {
        Row: {
          created_at: string
          id: string
          option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dropdown_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "dropdown_options"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mission_id: string
          note: string | null
          note_type: Database["public"]["Enums"]["volunteer_note_type"]
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mission_id: string
          note?: string | null
          note_type: Database["public"]["Enums"]["volunteer_note_type"]
          volunteer_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mission_id?: string
          note?: string | null
          note_type?: Database["public"]["Enums"]["volunteer_note_type"]
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_notes_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_notes_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "mission_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_teams: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          join_date: string | null
          team_code: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          join_date?: string | null
          team_code: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          join_date?: string | null
          team_code?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_teams_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers_base"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_teams: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          join_date: string | null
          team_code: string
          volunteer_id: string
          team_phone: string | null
          team_national_id: string | null
          team_notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          join_date?: string | null
          team_code: string
          volunteer_id: string
          team_phone?: string | null
          team_national_id?: string | null
          team_notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          join_date?: string | null
          team_code?: string
          volunteer_id?: string
          team_phone?: string | null
          team_national_id?: string | null
          team_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_teams_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers_base"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers_base: {
        Row: {
          birthdate: string | null
          branch: string | null
          created_at: string
          full_name: string
          id: string
          membership_number: string | null
          national_id: string | null
          nationality: string | null
          phone_number: string | null
          residence: string | null
        }
        Insert: {
          birthdate?: string | null
          branch?: string | null
          created_at?: string
          full_name: string
          id?: string
          membership_number?: string | null
          national_id?: string | null
          nationality?: string | null
          phone_number?: string | null
          residence?: string | null
        }
        Update: {
          birthdate?: string | null
          branch?: string | null
          created_at?: string
          full_name?: string
          id?: string
          membership_number?: string | null
          national_id?: string | null
          nationality?: string | null
          phone_number?: string | null
          residence?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_mission_code: {
        Args: { _project_code: string; _team_code: string }
        Returns: string
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
      | "admin"
      | "data_manager"
      | "department_entry"
      | "operations_room"
      | "operations_supervisor"
      | "youth_room"
      | "branch_youth"
      | "stakeholder"
      data_source: "whatsapp" | "wireless" | "phone"
      mission_status:
      | "planned"
      | "coded"
      | "entered"
      | "reviewed"
      | "sent_to_youth"
      | "sent_to_supervisor"
      | "monitored"
      | "open_active"
      mission_type: "internal" | "external"
      region: "delta" | "saaid" | "qanal" | "markaz_3am"
      transport_mode: "public" | "driver"
      volunteer_change_reason:
      | "apologized"
      | "redirected"
      | "unavailable"
      | "other"
      volunteer_note_type:
      | "not_renewed"
      | "not_present"
      | "membership_number"
      | "base_not_updated"
      | "separated"
      | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "data_manager",
        "department_entry",
        "operations_room",
        "operations_supervisor",
        "joker",
        "youth_room",
        "branch_youth",
        "stakeholder",
      ],
      data_source: ["whatsapp", "wireless", "phone"],
      mission_status: [
        "planned",
        "coded",
        "entered",
        "reviewed",
        "sent_to_youth",
        "sent_to_supervisor",
        "monitored",
        "open_active",
      ],
      mission_type: ["internal", "external"],
      region: ["delta", "saaid", "qanal", "markaz_3am"],
      transport_mode: ["public", "driver"],
      volunteer_change_reason: [
        "apologized",
        "redirected",
        "unavailable",
        "other",
      ],
      volunteer_note_type: [
        "not_renewed",
        "not_present",
        "membership_number",
        "base_not_updated",
        "separated",
        "suspended",
      ],
    },
  },
} as const
