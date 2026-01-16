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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          session_id: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_states: {
        Row: {
          created_at: string
          current_state: string | null
          id: string
          last_transition_at: string | null
          state_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_state?: string | null
          id?: string
          last_transition_at?: string | null
          state_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_state?: string | null
          id?: string
          last_transition_at?: string | null
          state_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      behavioral_events: {
        Row: {
          created_at: string
          device_id: string | null
          event_data: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          processed: boolean | null
          screen_name: string | null
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          processed?: boolean | null
          screen_name?: string | null
          session_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          processed?: boolean | null
          screen_name?: string | null
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioral_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_identifier: string
          device_name: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          os_version: string | null
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_identifier: string
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          os_version?: string | null
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_identifier?: string
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          os_version?: string | null
          platform?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          parent_id: string
          youth_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          parent_id: string
          youth_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          parent_id?: string
          youth_id?: string
        }
        Relationships: []
      }
      feedback_events: {
        Row: {
          context: Json | null
          created_at: string
          feedback_type: string
          id: string
          intervention_id: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          feedback_type: string
          id?: string
          intervention_id?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          intervention_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_templates: {
        Row: {
          action_label: string | null
          action_url: string | null
          cooldown_minutes: number | null
          created_at: string
          id: string
          is_active: boolean | null
          message: string
          min_risk_level: Database["public"]["Enums"]["risk_level"] | null
          name: string
          priority: number | null
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message: string
          min_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          name: string
          priority?: number | null
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string
          min_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          name?: string
          priority?: number | null
          title?: string
          type?: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
        }
        Relationships: []
      }
      interventions: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          delivered_at: string | null
          dismissed_at: string | null
          escalated_at: string | null
          id: string
          message: string
          risk_level_at_trigger: Database["public"]["Enums"]["risk_level"]
          risk_score_at_trigger: number | null
          session_id: string | null
          status: Database["public"]["Enums"]["intervention_status"] | null
          template_id: string | null
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at: string
          user_id: string
          user_response: Json | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dismissed_at?: string | null
          escalated_at?: string | null
          id?: string
          message: string
          risk_level_at_trigger: Database["public"]["Enums"]["risk_level"]
          risk_score_at_trigger?: number | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["intervention_status"] | null
          template_id?: string | null
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
          user_id: string
          user_response?: Json | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dismissed_at?: string | null
          escalated_at?: string | null
          id?: string
          message?: string
          risk_level_at_trigger?: Database["public"]["Enums"]["risk_level"]
          risk_score_at_trigger?: number | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["intervention_status"] | null
          template_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
          user_id?: string
          user_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "intervention_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          bedtime_end: string | null
          bedtime_start: string | null
          created_at: string
          daily_limit_minutes: number | null
          escalation_delay_minutes: number | null
          escalation_enabled: boolean | null
          id: string
          is_active: boolean | null
          is_system_default: boolean | null
          name: string
          owner_id: string | null
          parent_alert_threshold:
            | Database["public"]["Enums"]["risk_level"]
            | null
          reopen_threshold: number | null
          scroll_velocity_threshold: number | null
          session_limit_minutes: number | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          bedtime_end?: string | null
          bedtime_start?: string | null
          created_at?: string
          daily_limit_minutes?: number | null
          escalation_delay_minutes?: number | null
          escalation_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_system_default?: boolean | null
          name: string
          owner_id?: string | null
          parent_alert_threshold?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          reopen_threshold?: number | null
          scroll_velocity_threshold?: number | null
          session_limit_minutes?: number | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          bedtime_end?: string | null
          bedtime_start?: string | null
          created_at?: string
          daily_limit_minutes?: number | null
          escalation_delay_minutes?: number | null
          escalation_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_system_default?: boolean | null
          name?: string
          owner_id?: string | null
          parent_alert_threshold?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          reopen_threshold?: number | null
          scroll_velocity_threshold?: number | null
          session_limit_minutes?: number | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_history: {
        Row: {
          created_at: string
          factors: Json | null
          id: string
          new_level: Database["public"]["Enums"]["risk_level"]
          previous_level: Database["public"]["Enums"]["risk_level"] | null
          score: number
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json | null
          id?: string
          new_level: Database["public"]["Enums"]["risk_level"]
          previous_level?: Database["public"]["Enums"]["risk_level"] | null
          score: number
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          factors?: Json | null
          id?: string
          new_level?: Database["public"]["Enums"]["risk_level"]
          previous_level?: Database["public"]["Enums"]["risk_level"] | null
          score?: number
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      risk_states: {
        Row: {
          created_at: string
          current_level: Database["public"]["Enums"]["risk_level"] | null
          id: string
          last_evaluated_at: string | null
          late_night_factor: number | null
          reopen_frequency_factor: number | null
          score: number | null
          scroll_velocity_factor: number | null
          session_duration_factor: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: Database["public"]["Enums"]["risk_level"] | null
          id?: string
          last_evaluated_at?: string | null
          late_night_factor?: number | null
          reopen_frequency_factor?: number | null
          score?: number | null
          scroll_velocity_factor?: number | null
          session_duration_factor?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: Database["public"]["Enums"]["risk_level"] | null
          id?: string
          last_evaluated_at?: string | null
          late_night_factor?: number | null
          reopen_frequency_factor?: number | null
          score?: number | null
          scroll_velocity_factor?: number | null
          session_duration_factor?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          device_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          reopen_count: number | null
          started_at: string
          state: Database["public"]["Enums"]["session_state"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          reopen_count?: number | null
          started_at?: string
          state?: Database["public"]["Enums"]["session_state"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          reopen_count?: number | null
          started_at?: string
          state?: Database["public"]["Enums"]["session_state"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _parent_id: string; _youth_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_type:
        | "orchestrator"
        | "risk_agent"
        | "intervention_agent"
        | "feedback_agent"
      app_role: "admin" | "parent" | "youth"
      event_type:
        | "app_open"
        | "app_close"
        | "screen_view"
        | "scroll"
        | "tap"
        | "session_start"
        | "session_end"
        | "reopen"
        | "background"
        | "foreground"
      intervention_status:
        | "pending"
        | "delivered"
        | "acknowledged"
        | "dismissed"
        | "escalated"
      intervention_type:
        | "soft_nudge"
        | "medium_friction"
        | "hard_block"
        | "parent_alert"
      risk_level: "low" | "medium" | "high" | "critical"
      session_state: "active" | "paused" | "ended"
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
      agent_type: [
        "orchestrator",
        "risk_agent",
        "intervention_agent",
        "feedback_agent",
      ],
      app_role: ["admin", "parent", "youth"],
      event_type: [
        "app_open",
        "app_close",
        "screen_view",
        "scroll",
        "tap",
        "session_start",
        "session_end",
        "reopen",
        "background",
        "foreground",
      ],
      intervention_status: [
        "pending",
        "delivered",
        "acknowledged",
        "dismissed",
        "escalated",
      ],
      intervention_type: [
        "soft_nudge",
        "medium_friction",
        "hard_block",
        "parent_alert",
      ],
      risk_level: ["low", "medium", "high", "critical"],
      session_state: ["active", "paused", "ended"],
    },
  },
} as const
