export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          company_id: string;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          before_state: Json | null;
          after_state: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          actor_user_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          before_state?: Json | null;
          after_state?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          actor_user_id?: string | null;
          entity_type?: string;
          entity_id?: string | null;
          action?: string;
          before_state?: Json | null;
          after_state?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      case_notes: {
        Row: {
          id: string;
          company_id: string;
          case_id: string;
          user_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id: string;
          user_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string;
          user_id?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      collection_cases: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          import_batch_id: string | null;
          external_case_id: string | null;
          case_fingerprint: string;
          case_identity_source: "external_id" | "fingerprint";
          contract_number: string | null;
          unit_code: string | null;
          project_name: string | null;
          amount_due: number;
          amount_paid: number;
          currency_code: string;
          payment_type: "delivery" | "installment" | "late_fee" | "other";
          due_date: string | null;
          status: "pending" | "paid" | "partial" | "overdue" | "invalid";
          assigned_to_user_id: string | null;
          last_contacted_at: string | null;
          raw_row: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          import_batch_id?: string | null;
          external_case_id?: string | null;
          case_fingerprint: string;
          case_identity_source?: "external_id" | "fingerprint";
          contract_number?: string | null;
          unit_code?: string | null;
          project_name?: string | null;
          amount_due?: number;
          amount_paid?: number;
          currency_code?: string;
          payment_type?: "delivery" | "installment" | "late_fee" | "other";
          due_date?: string | null;
          status?: "pending" | "paid" | "partial" | "overdue" | "invalid";
          assigned_to_user_id?: string | null;
          last_contacted_at?: string | null;
          raw_row?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          customer_id?: string;
          import_batch_id?: string | null;
          external_case_id?: string | null;
          case_fingerprint?: string;
          case_identity_source?: "external_id" | "fingerprint";
          contract_number?: string | null;
          unit_code?: string | null;
          project_name?: string | null;
          amount_due?: number;
          amount_paid?: number;
          currency_code?: string;
          payment_type?: "delivery" | "installment" | "late_fee" | "other";
          due_date?: string | null;
          status?: "pending" | "paid" | "partial" | "overdue" | "invalid";
          assigned_to_user_id?: string | null;
          last_contacted_at?: string | null;
          raw_row?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      company_users: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: "admin" | "manager" | "collector";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role: "admin" | "manager" | "collector";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          role?: "admin" | "manager" | "collector";
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          external_customer_id: string | null;
          name: string | null;
          phone_e164: string | null;
          alternate_phone: string | null;
          national_id: string | null;
          raw_identity: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          external_customer_id?: string | null;
          name?: string | null;
          phone_e164?: string | null;
          alternate_phone?: string | null;
          national_id?: string | null;
          raw_identity?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          external_customer_id?: string | null;
          name?: string | null;
          phone_e164?: string | null;
          alternate_phone?: string | null;
          national_id?: string | null;
          raw_identity?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      excel_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          file_kind: "xlsx" | "csv";
          header_row_index: number;
          mapping_rules: Json;
          matching_rules: Json | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          file_kind?: "xlsx" | "csv";
          header_row_index?: number;
          mapping_rules: Json;
          matching_rules?: Json | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          file_kind?: "xlsx" | "csv";
          header_row_index?: number;
          mapping_rules?: Json;
          matching_rules?: Json | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          company_id: string;
          uploaded_by_user_id: string;
          storage_path: string;
          source_filename: string | null;
          template_id: string | null;
          total_rows: number | null;
          valid_rows: number | null;
          invalid_rows: number | null;
          duplicate_rows: number | null;
          status:
            | "pending"
            | "processing"
            | "cancel_requested"
            | "cancelled"
            | "completed"
            | "failed";
          error_report: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          uploaded_by_user_id: string;
          storage_path: string;
          source_filename?: string | null;
          template_id?: string | null;
          total_rows?: number | null;
          valid_rows?: number | null;
          invalid_rows?: number | null;
          duplicate_rows?: number | null;
          status?:
            | "pending"
            | "processing"
            | "cancel_requested"
            | "cancelled"
            | "completed"
            | "failed";
          error_report?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          uploaded_by_user_id?: string;
          storage_path?: string;
          source_filename?: string | null;
          template_id?: string | null;
          total_rows?: number | null;
          valid_rows?: number | null;
          invalid_rows?: number | null;
          duplicate_rows?: number | null;
          status?:
            | "pending"
            | "processing"
            | "cancel_requested"
            | "cancelled"
            | "completed"
            | "failed";
          error_report?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      whatsapp_configs: {
        Row: {
          id: string;
          company_id: string;
          phone_number_id: string;
          business_account_id: string | null;
          access_token_encrypted: string;
          app_secret_encrypted: string;
          verify_token: string;
          display_phone_number: string | null;
          verified_name: string | null;
          quality_rating: string | null;
          is_active: boolean;
          connected_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          phone_number_id: string;
          business_account_id?: string | null;
          access_token_encrypted: string;
          app_secret_encrypted: string;
          verify_token: string;
          display_phone_number?: string | null;
          verified_name?: string | null;
          quality_rating?: string | null;
          is_active?: boolean;
          connected_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          phone_number_id?: string;
          business_account_id?: string | null;
          access_token_encrypted?: string;
          app_secret_encrypted?: string;
          verify_token?: string;
          display_phone_number?: string | null;
          verified_name?: string | null;
          quality_rating?: string | null;
          is_active?: boolean;
          connected_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      whatsapp_message_logs: {
        Row: {
          id: string;
          company_id: string;
          case_id: string;
          customer_id: string;
          sent_by_user_id: string | null;
          meta_message_id: string | null;
          template_name: string | null;
          template_variables: Json | null;
          message_type: "template" | "text";
          rendered_message: string | null;
          status: "queued" | "sent" | "delivered" | "read" | "failed";
          error_code: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id: string;
          customer_id: string;
          sent_by_user_id?: string | null;
          meta_message_id?: string | null;
          template_name?: string | null;
          template_variables?: Json | null;
          message_type: "template" | "text";
          rendered_message?: string | null;
          status?: "queued" | "sent" | "delivered" | "read" | "failed";
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string;
          customer_id?: string;
          sent_by_user_id?: string | null;
          meta_message_id?: string | null;
          template_name?: string | null;
          template_variables?: Json | null;
          message_type?: "template" | "text";
          rendered_message?: string | null;
          status?: "queued" | "sent" | "delivered" | "read" | "failed";
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_company_id: {
        Args: Record<never, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
