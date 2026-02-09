export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assigned_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          confirmed_at: string | null
          created_at: string
          drive_id: string
          duty_id: string
          id: string
          is_manual_override: boolean
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          volunteer_id: string
          waitlist_position: number | null
        }
        Insert: {
          assigned_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          drive_id: string
          duty_id: string
          id?: string
          is_manual_override?: boolean
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          volunteer_id: string
          waitlist_position?: number | null
        }
        Update: {
          assigned_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          drive_id?: string
          duty_id?: string
          id?: string
          is_manual_override?: boolean
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          volunteer_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_duty_id_fkey"
            columns: ["duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_log: {
        Row: {
          call_duration_seconds: number | null
          call_id: string | null
          call_provider: string | null
          call_result: Database["public"]["Enums"]["call_result"] | null
          call_transcript: Json | null
          channel: Database["public"]["Enums"]["comm_channel"]
          content: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          drive_id: string | null
          error: string | null
          id: string
          response_received_at: string | null
          sent_at: string | null
          volunteer_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          call_duration_seconds?: number | null
          call_id?: string | null
          call_provider?: string | null
          call_result?: Database["public"]["Enums"]["call_result"] | null
          call_transcript?: Json | null
          channel: Database["public"]["Enums"]["comm_channel"]
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          drive_id?: string | null
          error?: string | null
          id?: string
          response_received_at?: string | null
          sent_at?: string | null
          volunteer_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          call_duration_seconds?: number | null
          call_id?: string | null
          call_provider?: string | null
          call_result?: Database["public"]["Enums"]["call_result"] | null
          call_transcript?: Json | null
          channel?: Database["public"]["Enums"]["comm_channel"]
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          drive_id?: string | null
          error?: string | null
          id?: string
          response_received_at?: string | null
          sent_at?: string | null
          volunteer_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_duties: {
        Row: {
          calculated_capacity: number
          capacity_mode: Database["public"]["Enums"]["capacity_mode"]
          created_at: string
          current_assigned: number
          drive_id: string
          duty_id: string
          id: string
          manual_capacity_override: number | null
          updated_at: string
        }
        Insert: {
          calculated_capacity?: number
          capacity_mode?: Database["public"]["Enums"]["capacity_mode"]
          created_at?: string
          current_assigned?: number
          drive_id: string
          duty_id: string
          id?: string
          manual_capacity_override?: number | null
          updated_at?: string
        }
        Update: {
          calculated_capacity?: number
          capacity_mode?: Database["public"]["Enums"]["capacity_mode"]
          created_at?: string
          current_assigned?: number
          drive_id?: string
          duty_id?: string
          id?: string
          manual_capacity_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_duties_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_duties_duty_id_fkey"
            columns: ["duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
        ]
      }
      drives: {
        Row: {
          created_at: string
          daig_count: number
          drive_date: string
          id: string
          iftaar_time: string | null
          location_address: string | null
          location_name: string | null
          name: string
          notes: string | null
          season_id: string
          status: Database["public"]["Enums"]["drive_status"]
          sunset_source: string | null
          sunset_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daig_count?: number
          drive_date: string
          id?: string
          iftaar_time?: string | null
          location_address?: string | null
          location_name?: string | null
          name: string
          notes?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["drive_status"]
          sunset_source?: string | null
          sunset_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daig_count?: number
          drive_date?: string
          id?: string
          iftaar_time?: string | null
          location_address?: string | null
          location_name?: string | null
          name?: string
          notes?: string | null
          season_id?: string
          status?: Database["public"]["Enums"]["drive_status"]
          sunset_source?: string | null
          sunset_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drives_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      duties: {
        Row: {
          created_at: string
          display_order: number
          gender_restriction: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      duty_capacity_rules: {
        Row: {
          base_count: number | null
          capacity_mode: Database["public"]["Enums"]["capacity_mode"]
          created_at: string
          duty_id: string
          id: string
          per_daig_count: number | null
          tier_capacity: number | null
          tier_max_daigs: number | null
          tier_min_daigs: number | null
          updated_at: string
        }
        Insert: {
          base_count?: number | null
          capacity_mode?: Database["public"]["Enums"]["capacity_mode"]
          created_at?: string
          duty_id: string
          id?: string
          per_daig_count?: number | null
          tier_capacity?: number | null
          tier_max_daigs?: number | null
          tier_min_daigs?: number | null
          updated_at?: string
        }
        Update: {
          base_count?: number | null
          capacity_mode?: Database["public"]["Enums"]["capacity_mode"]
          created_at?: string
          duty_id?: string
          id?: string
          per_daig_count?: number | null
          tier_capacity?: number | null
          tier_max_daigs?: number | null
          tier_min_daigs?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_capacity_rules_duty_id_fkey"
            columns: ["duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheets_sync: {
        Row: {
          created_at: string
          id: string
          last_synced_at: string | null
          last_synced_row: number
          sheet_id: string
          sheet_name: string | null
          sync_errors: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          last_synced_row?: number
          sheet_id: string
          sheet_name?: string | null
          sync_errors?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          last_synced_row?: number
          sheet_id?: string
          sheet_name?: string | null
          sync_errors?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      reminder_schedules: {
        Row: {
          created_at: string
          drive_id: string
          hours_before_sunset: number | null
          id: string
          is_sent: boolean
          message_template: string | null
          reminder_type: string
          scheduled_at: string | null
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_id: string
          hours_before_sunset?: number | null
          id?: string
          is_sent?: boolean
          message_template?: string | null
          reminder_type: string
          scheduled_at?: string | null
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_id?: string
          hours_before_sunset?: number | null
          id?: string
          is_sent?: boolean
          message_template?: string | null
          reminder_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_schedules_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          hijri_year: number | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          hijri_year?: number | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          hijri_year?: number | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      volunteer_availability: {
        Row: {
          created_at: string
          drive_id: string
          id: string
          signed_up_at: string
          source: Database["public"]["Enums"]["volunteer_source"]
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          drive_id: string
          id?: string
          signed_up_at?: string
          source?: Database["public"]["Enums"]["volunteer_source"]
          volunteer_id: string
        }
        Update: {
          created_at?: string
          drive_id?: string
          id?: string
          signed_up_at?: string
          source?: Database["public"]["Enums"]["volunteer_source"]
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_availability_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_availability_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          created_at: string
          email: string | null
          gender: Database["public"]["Enums"]["gender"]
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization: string | null
          phone: string
          source: Database["public"]["Enums"]["volunteer_source"]
          total_drives_attended: number
          updated_at: string
          whatsapp_jid: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          gender: Database["public"]["Enums"]["gender"]
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization?: string | null
          phone: string
          source?: Database["public"]["Enums"]["volunteer_source"]
          total_drives_attended?: number
          updated_at?: string
          whatsapp_jid?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization?: string | null
          phone?: string
          source?: Database["public"]["Enums"]["volunteer_source"]
          total_drives_attended?: number
          updated_at?: string
          whatsapp_jid?: string | null
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          phone_number: string | null
          qr_code: string | null
          season_group_jid: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number?: string | null
          qr_code?: string | null
          season_group_jid?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string | null
          qr_code?: string | null
          season_group_jid?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_duty_capacity: {
        Args: {
          p_daig_count: number
          p_duty_id: string
          p_mode?: Database["public"]["Enums"]["capacity_mode"]
        }
        Returns: number
      }
    }
    Enums: {
      assignment_status:
        | "assigned"
        | "confirmed"
        | "en_route"
        | "arrived"
        | "completed"
        | "cancelled"
        | "no_show"
        | "waitlisted"
      call_result:
        | "confirmed"
        | "en_route"
        | "delayed"
        | "not_coming"
        | "no_answer"
        | "voicemail"
        | "failed"
      capacity_mode: "linear" | "tiered"
      comm_channel: "whatsapp" | "ai_call" | "manual"
      drive_status: "draft" | "open" | "in_progress" | "completed" | "cancelled"
      gender: "male" | "female"
      volunteer_source: "google_form" | "in_app_form" | "manual" | "bulk_import"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  TableName extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][TableName]["Row"]

export type TablesInsert<
  TableName extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][TableName]["Insert"]

export type TablesUpdate<
  TableName extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][TableName]["Update"]

export type Enums<
  EnumName extends keyof DefaultSchema["Enums"]
> = DefaultSchema["Enums"][EnumName]
