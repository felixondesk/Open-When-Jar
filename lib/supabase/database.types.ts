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
      attachments: {
        Row: {
          byte_size: number
          created_at: string
          envelope_id: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type: string
          owner_id: string
          storage_path: string
        }
        Insert: {
          byte_size: number
          created_at?: string
          envelope_id: string
          id?: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type: string
          owner_id: string
          storage_path: string
        }
        Update: {
          byte_size?: number
          created_at?: string
          envelope_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string
          owner_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelope_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_connections: {
        Row: {
          addressee_display_name_snapshot: string
          addressee_id: string
          addressee_username_snapshot: string
          created_at: string
          id: string
          requester_display_name_snapshot: string
          requester_id: string
          requester_username_snapshot: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_display_name_snapshot: string
          addressee_id: string
          addressee_username_snapshot: string
          created_at?: string
          id?: string
          requester_display_name_snapshot: string
          requester_id: string
          requester_username_snapshot: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_display_name_snapshot?: string
          addressee_id?: string
          addressee_username_snapshot?: string
          created_at?: string
          id?: string
          requester_display_name_snapshot?: string
          requester_id?: string
          requester_username_snapshot?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      envelope_contents: {
        Row: {
          created_at: string
          envelope_id: string
          text_body: string
          transcript: string | null
        }
        Insert: {
          created_at?: string
          envelope_id: string
          text_body?: string
          transcript?: string | null
        }
        Update: {
          created_at?: string
          envelope_id?: string
          text_body?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envelope_contents_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: true
            referencedRelation: "envelope_headers"
            referencedColumns: ["id"]
          },
        ]
      }
      envelope_headers: {
        Row: {
          created_at: string
          id: string
          jar_id: string
          label: string
          position: number
          unlock_at: string | null
          unlock_timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          jar_id: string
          label: string
          position: number
          unlock_at?: string | null
          unlock_timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          jar_id?: string
          label?: string
          position?: number
          unlock_at?: string | null
          unlock_timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "envelope_headers_jar_id_fkey"
            columns: ["jar_id"]
            isOneToOne: false
            referencedRelation: "jars"
            referencedColumns: ["id"]
          },
        ]
      }
      jar_credits: {
        Row: {
          amount_cents: number
          created_at: string
          granted_count: number
          id: string
          plan_code: string
          provider_order_id: string | null
          recipient_limit: number
          source: Database["public"]["Enums"]["credit_source"]
          used_count: number
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          granted_count?: number
          id?: string
          plan_code?: string
          provider_order_id?: string | null
          recipient_limit?: number
          source: Database["public"]["Enums"]["credit_source"]
          used_count?: number
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          granted_count?: number
          id?: string
          plan_code?: string
          provider_order_id?: string | null
          recipient_limit?: number
          source?: Database["public"]["Enums"]["credit_source"]
          used_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jar_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jar_recipients: {
        Row: {
          created_at: string
          creator_id: string
          jar_id: string
          position: number
          recipient_id: string
          revealed_at: string | null
          username_snapshot: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          jar_id: string
          position: number
          recipient_id: string
          revealed_at?: string | null
          username_snapshot: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          jar_id?: string
          position?: number
          recipient_id?: string
          revealed_at?: string | null
          username_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "jar_recipients_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jar_recipients_jar_id_fkey"
            columns: ["jar_id"]
            isOneToOne: false
            referencedRelation: "jars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jar_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jars: {
        Row: {
          amount_cents: number
          cover_note: string
          created_at: string
          creator_id: string
          entitlement_source:
            | Database["public"]["Enums"]["credit_source"]
            | null
          hosting_ends_at: string | null
          id: string
          plan_code: string
          recipient_id: string
          recipient_limit: number
          recipient_username_snapshot: string
          sealed_at: string | null
          status: Database["public"]["Enums"]["jar_status"]
          theme: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          cover_note?: string
          created_at?: string
          creator_id: string
          entitlement_source?:
            | Database["public"]["Enums"]["credit_source"]
            | null
          hosting_ends_at?: string | null
          id?: string
          plan_code?: string
          recipient_id: string
          recipient_limit?: number
          recipient_username_snapshot: string
          sealed_at?: string | null
          status?: Database["public"]["Enums"]["jar_status"]
          theme?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          cover_note?: string
          created_at?: string
          creator_id?: string
          entitlement_source?:
            | Database["public"]["Enums"]["credit_source"]
            | null
          hosting_ends_at?: string | null
          id?: string
          plan_code?: string
          recipient_id?: string
          recipient_limit?: number
          recipient_username_snapshot?: string
          sealed_at?: string | null
          status?: Database["public"]["Enums"]["jar_status"]
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jars_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jars_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          jar_id: string | null
          plan_code: string
          provider: string
          provider_order_id: string | null
          recipient_limit: number
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          jar_id?: string | null
          plan_code?: string
          provider?: string
          provider_order_id?: string | null
          recipient_limit?: number
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          jar_id?: string | null
          plan_code?: string
          provider?: string
          provider_order_id?: string | null
          recipient_limit?: number
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_jar_id_fkey"
            columns: ["jar_id"]
            isOneToOne: false
            referencedRelation: "jars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
          username: string
          username_finalized: boolean
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
          username: string
          username_finalized?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          username?: string
          username_finalized?: boolean
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          id: string
          requester_id: string | null
          category: string
          details: string
          source: string
          status: string
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          requester_id?: string | null
          category: string
          details: string
          source?: string
          status?: string
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          requester_id?: string | null
          category?: string
          details?: string
          source?: string
          status?: string
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipient_envelope_state: {
        Row: {
          envelope_id: string
          favourite: boolean
          opened_at: string | null
          recipient_id: string
          updated_at: string
        }
        Insert: {
          envelope_id: string
          favourite?: boolean
          opened_at?: string | null
          recipient_id: string
          updated_at?: string
        }
        Update: {
          envelope_id?: string
          favourite?: boolean
          opened_at?: string | null
          recipient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipient_envelope_state_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelope_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipient_envelope_state_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_support_request_history: {
        Args: { p_request_id: string }
        Returns: Json
      }
      support_request_conversation: {
        Args: { p_request_id: string }
        Returns: Json
      }
      reply_to_support_request: {
        Args: { p_request_id: string; p_message: string }
        Returns: undefined
      }
      admin_update_support_request_with_message: {
        Args: { p_request_id: string; p_status: string; p_note: string; p_message?: string }
        Returns: undefined
      }
      admin_operational_analytics: {
        Args: { p_days?: number }
        Returns: Json
      }
      admin_browse_records: {
        Args: { p_kind: string; p_status?: string | null; p_query?: string | null; p_offset?: number }
        Returns: Json
      }
      submit_support_request: {
        Args: { p_category: string; p_details: string }
        Returns: string
      }
      admin_list_support_requests: {
        Args: { p_status?: string | null; p_offset?: number; p_category?: string | null }
        Returns: Json
      }
      ingest_support_email: {
        Args: {
          p_source_reference: string
          p_sender_email: string
          p_subject: string | null
          p_details: string
        }
        Returns: Json
      }
      admin_update_support_request: {
        Args: { p_request_id: string; p_status: string; p_note: string }
        Returns: undefined
      }
      cancel_plan_invitation: {
        Args: { p_email: string }
        Returns: boolean
      }
      claim_plan_invitation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_dodo_test_payment_intent: {
        Args: {
          p_currency: string
          p_intent_id: string
          p_invite_emails: string[]
          p_plan_code: string | null
          p_purchase_type: string
        }
        Returns: {
          expected_amount_minor: number
          intent_id: string
          product_id: string
        }[]
      }
      fail_dodo_test_payment_intent: {
        Args: { p_intent_id: string }
        Returns: boolean
      }
      fulfill_dodo_test_payment: {
        Args: {
          p_currency: string
          p_event_id: string
          p_intent_id: string
          p_payment_id: string
          p_product_id: string
          p_tax: number
          p_total_amount: number
        }
        Returns: Json
      }
      get_plan_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      find_circle_user: {
        Args: { p_username: string }
        Returns: Json
      }
      invite_plan_member: {
        Args: { p_email: string }
        Returns: boolean
      }
      claim_invitation_delivery: {
        Args: { p_email: string }
        Returns: boolean
      }
      respond_circle_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: Database["public"]["Tables"]["circle_connections"]["Row"]
      }
      send_circle_request: {
        Args: { p_username: string }
        Returns: Database["public"]["Tables"]["circle_connections"]["Row"]
      }
      admin_dashboard_snapshot: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      claim_username: {
        Args: { p_display_name: string; p_username: string }
        Returns: boolean
      }
      create_jar_with_first_envelope: {
        Args: {
          p_cover_note: string
          p_label: string
          p_message: string
          p_plan_code: string
          p_recipient_usernames: string[]
          p_theme: string
          p_unlock_at?: string
          p_unlock_timezone?: string
        }
        Returns: string
      }
      seal_jar: {
        Args: { p_jar_id: string }
        Returns: {
          entitlement_source: Database["public"]["Enums"]["credit_source"]
          hosting_ends_at: string
          id: string
          status: Database["public"]["Enums"]["jar_status"]
        }[]
      }
    }
    Enums: {
      attachment_kind: "image" | "audio"
      credit_source: "free" | "paid" | "test"
      jar_status: "draft" | "sealed" | "hosting_ended" | "deleted"
      order_status:
        | "created"
        | "pending"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      attachment_kind: ["image", "audio"],
      credit_source: ["free", "paid", "test"],
      jar_status: ["draft", "sealed", "hosting_ended", "deleted"],
      order_status: [
        "created",
        "pending",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
      ],
    },
  },
} as const
