// @ts-nocheck
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          assigned_rep_id: string | null
          author_id: string
          case_opened_at: string
          created_at: string
          email: string
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          last_contact_at: string | null
          name: string
          phone: string
          stage: Database["public"]["Enums"]["client_stage"]
          stage_entered_at: string
          state: string
          tags: string[]
          updated_at: string
          zip: string
        }
        Insert: {
          assigned_rep_id?: string | null
          author_id: string
          case_opened_at?: string
          created_at?: string
          email: string
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          last_contact_at?: string | null
          name: string
          phone: string
          stage?: Database["public"]["Enums"]["client_stage"]
          stage_entered_at?: string
          state: string
          tags?: string[]
          updated_at?: string
          zip: string
        }
        Update: {
          assigned_rep_id?: string | null
          author_id?: string
          case_opened_at?: string
          created_at?: string
          email?: string
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          last_contact_at?: string | null
          name?: string
          phone?: string
          stage?: Database["public"]["Enums"]["client_stage"]
          stage_entered_at?: string
          state?: string
          tags?: string[]
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string
          channel: Database["public"]["Enums"]["note_channel"]
          client_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          channel: Database["public"]["Enums"]["note_channel"]
          client_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          channel?: Database["public"]["Enums"]["note_channel"]
          client_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          client_id: string
          created_at: string
          document_reference: string | null
          fee_due_date: string | null
          id: string
          loan_balance: number | null
          maintenance_fee: number | null
          paid_off_at: string | null
          purchase_price: number | null
          resort_location: string
          resort_name: string
          status: Database["public"]["Enums"]["property_status"]
          unit_number: string | null
          updated_at: string
          value_eliminated: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          document_reference?: string | null
          fee_due_date?: string | null
          id?: string
          loan_balance?: number | null
          maintenance_fee?: number | null
          paid_off_at?: string | null
          purchase_price?: number | null
          resort_location: string
          resort_name: string
          status?: Database["public"]["Enums"]["property_status"]
          unit_number?: string | null
          updated_at?: string
          value_eliminated?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          document_reference?: string | null
          fee_due_date?: string | null
          id?: string
          loan_balance?: number | null
          maintenance_fee?: number | null
          paid_off_at?: string | null
          purchase_price?: number | null
          resort_location?: string
          resort_name?: string
          status?: Database["public"]["Enums"]["property_status"]
          unit_number?: string | null
          updated_at?: string
          value_eliminated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          author_id: string
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          author_id: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          due_time?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          author_id?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_metrics: {
        Args: { p_user_id: string }
        Returns: {
          active_cases: number
          at_risk_cases: number
          avg_time_to_resolution: string
          properties_under_mgmt: number
          resolution_rate: number
          resolved_cases: number
          total_cases: number
          total_debt_eliminated: number
        }[]
      }
    }
    Enums: {
      client_stage: "consultation" | "exit_plan" | "in_progress" | "resolved"
      health_status: "on_track" | "at_risk" | "stalled"
      note_channel: "call" | "email" | "sms" | "meeting" | "internal"
      property_status: "active" | "paid_off" | "foreclosed" | "relinquished"
      task_status: "pending" | "completed" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never