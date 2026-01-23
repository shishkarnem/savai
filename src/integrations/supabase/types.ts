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
      client_messages: {
        Row: {
          client_id: string
          created_at: string
          direction: string
          error_message: string | null
          id: string
          message: string
          sent_at: string
          status: string
          telegram_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          message: string
          sent_at?: string
          status?: string
          telegram_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          message?: string
          sent_at?: string
          status?: string
          telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          act_date: string | null
          ai_employee_cost: string | null
          ai_tokens_price: string | null
          avg_salary: string | null
          block_date: string | null
          bot_token: string | null
          calculator_date: string | null
          channel: string | null
          city: string | null
          comment: string | null
          contract_ip_url: string | null
          contract_ooo_url: string | null
          created_at: string
          department: string | null
          department_text: string | null
          employees_count: string | null
          expert_date: string | null
          expert_name: string | null
          expert_pseudonym: string | null
          full_name: string | null
          functionality: string | null
          id: string
          kp_text: string | null
          last_100_messages: string | null
          last_message: string | null
          payback: string | null
          payment_date: string | null
          product: string | null
          project: string | null
          project_code: string | null
          project_plan_url: string | null
          protalk_id: string | null
          protalk_name: string | null
          protalk_send_status: string | null
          real_salary: string | null
          refund_amount: string | null
          region_salary: string | null
          rejection_date: string | null
          reminder_text: string | null
          reminder_time: string | null
          sav_cost: string | null
          script_id: string | null
          selected_expert: string | null
          send_status: string | null
          service: string | null
          service_price: string | null
          service_start_date: string | null
          service_type: string | null
          sheet_row_id: string
          software_price: string | null
          software_text: string | null
          start_date: string | null
          status: string | null
          tariff: string | null
          tariff_date: string | null
          telegram_client: string | null
          telegram_id: string | null
          updated_at: string
          work_end_date: string | null
          work_start_date: string | null
        }
        Insert: {
          act_date?: string | null
          ai_employee_cost?: string | null
          ai_tokens_price?: string | null
          avg_salary?: string | null
          block_date?: string | null
          bot_token?: string | null
          calculator_date?: string | null
          channel?: string | null
          city?: string | null
          comment?: string | null
          contract_ip_url?: string | null
          contract_ooo_url?: string | null
          created_at?: string
          department?: string | null
          department_text?: string | null
          employees_count?: string | null
          expert_date?: string | null
          expert_name?: string | null
          expert_pseudonym?: string | null
          full_name?: string | null
          functionality?: string | null
          id?: string
          kp_text?: string | null
          last_100_messages?: string | null
          last_message?: string | null
          payback?: string | null
          payment_date?: string | null
          product?: string | null
          project?: string | null
          project_code?: string | null
          project_plan_url?: string | null
          protalk_id?: string | null
          protalk_name?: string | null
          protalk_send_status?: string | null
          real_salary?: string | null
          refund_amount?: string | null
          region_salary?: string | null
          rejection_date?: string | null
          reminder_text?: string | null
          reminder_time?: string | null
          sav_cost?: string | null
          script_id?: string | null
          selected_expert?: string | null
          send_status?: string | null
          service?: string | null
          service_price?: string | null
          service_start_date?: string | null
          service_type?: string | null
          sheet_row_id: string
          software_price?: string | null
          software_text?: string | null
          start_date?: string | null
          status?: string | null
          tariff?: string | null
          tariff_date?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          updated_at?: string
          work_end_date?: string | null
          work_start_date?: string | null
        }
        Update: {
          act_date?: string | null
          ai_employee_cost?: string | null
          ai_tokens_price?: string | null
          avg_salary?: string | null
          block_date?: string | null
          bot_token?: string | null
          calculator_date?: string | null
          channel?: string | null
          city?: string | null
          comment?: string | null
          contract_ip_url?: string | null
          contract_ooo_url?: string | null
          created_at?: string
          department?: string | null
          department_text?: string | null
          employees_count?: string | null
          expert_date?: string | null
          expert_name?: string | null
          expert_pseudonym?: string | null
          full_name?: string | null
          functionality?: string | null
          id?: string
          kp_text?: string | null
          last_100_messages?: string | null
          last_message?: string | null
          payback?: string | null
          payment_date?: string | null
          product?: string | null
          project?: string | null
          project_code?: string | null
          project_plan_url?: string | null
          protalk_id?: string | null
          protalk_name?: string | null
          protalk_send_status?: string | null
          real_salary?: string | null
          refund_amount?: string | null
          region_salary?: string | null
          rejection_date?: string | null
          reminder_text?: string | null
          reminder_time?: string | null
          sav_cost?: string | null
          script_id?: string | null
          selected_expert?: string | null
          send_status?: string | null
          service?: string | null
          service_price?: string | null
          service_start_date?: string | null
          service_type?: string | null
          sheet_row_id?: string
          software_price?: string | null
          software_text?: string | null
          start_date?: string | null
          status?: string | null
          tariff?: string | null
          tariff_date?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          updated_at?: string
          work_end_date?: string | null
          work_start_date?: string | null
        }
        Relationships: []
      }
      experts: {
        Row: {
          cases: string | null
          created_at: string
          description: string | null
          greeting: string | null
          id: string
          other_info: string | null
          photo_url: string | null
          pseudonym: string | null
          sheet_row_id: string
          spheres: string | null
          tools: string | null
          updated_at: string
        }
        Insert: {
          cases?: string | null
          created_at?: string
          description?: string | null
          greeting?: string | null
          id?: string
          other_info?: string | null
          photo_url?: string | null
          pseudonym?: string | null
          sheet_row_id: string
          spheres?: string | null
          tools?: string | null
          updated_at?: string
        }
        Update: {
          cases?: string | null
          created_at?: string
          description?: string | null
          greeting?: string | null
          id?: string
          other_info?: string | null
          photo_url?: string | null
          pseudonym?: string | null
          sheet_row_id?: string
          spheres?: string | null
          tools?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          photo_url: string | null
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      client_status:
        | "Заблокировано"
        | "Инфо"
        | "Расчет"
        | "Договор"
        | "Предоплата"
        | "Тариф"
        | "Подбор Эксперта"
        | "Отказ"
        | "Обслуживание"
        | "Не на связи"
        | "Дубль"
        | "Эксперт"
        | "Выполнено"
        | "В работе"
        | "Бот создан"
        | "Без напоминаний"
        | "Партнер"
      send_status: "Отправлено" | "Отправить" | "Ожидает"
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
      client_status: [
        "Заблокировано",
        "Инфо",
        "Расчет",
        "Договор",
        "Предоплата",
        "Тариф",
        "Подбор Эксперта",
        "Отказ",
        "Обслуживание",
        "Не на связи",
        "Дубль",
        "Эксперт",
        "Выполнено",
        "В работе",
        "Бот создан",
        "Без напоминаний",
        "Партнер",
      ],
      send_status: ["Отправлено", "Отправить", "Ожидает"],
    },
  },
} as const
