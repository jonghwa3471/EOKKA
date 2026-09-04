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
      analysis_snapshots: {
        Row: {
          analysis_mode: string
          analysis_snapshot_id: number
          created_at: string
          current_value: number
          goal_amount: number
          goal_month: number | null
          managed_portfolio_id: number | null
          monthly_contribution: number
          profit: number
          result: Json
          return_rate: number
          saved_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_mode?: string
          analysis_snapshot_id?: never
          created_at?: string
          current_value: number
          goal_amount: number
          goal_month?: number | null
          managed_portfolio_id?: number | null
          monthly_contribution?: number
          profit: number
          result: Json
          return_rate: number
          saved_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_mode?: string
          analysis_snapshot_id?: never
          created_at?: string
          current_value?: number
          goal_amount?: number
          goal_month?: number | null
          managed_portfolio_id?: number | null
          monthly_contribution?: number
          profit?: number
          result?: Json
          return_rate?: number
          saved_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_snapshots_managed_portfolio_id_managed_portfolios_mana"
            columns: ["managed_portfolio_id"]
            isOneToOne: false
            referencedRelation: "managed_portfolios"
            referencedColumns: ["managed_portfolio_id"]
          },
        ]
      }
      managed_portfolios: {
        Row: {
          created_at: string
          managed_portfolio_id: number
          name: string
          status: string
          transitioned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          managed_portfolio_id?: never
          name?: string
          status?: string
          transitioned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          managed_portfolio_id?: never
          name?: string
          status?: string
          transitioned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          approved_at: string
          created_at: string
          metadata: Json
          order_id: string
          order_name: string
          payment_id: number
          payment_key: string
          raw_data: Json
          receipt_url: string
          requested_at: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at: string
          created_at?: string
          metadata: Json
          order_id: string
          order_name: string
          payment_id?: never
          payment_key: string
          raw_data: Json
          receipt_url: string
          requested_at: string
          status: string
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string
          created_at?: string
          metadata?: Json
          order_id?: string
          order_name?: string
          payment_id?: never
          payment_key?: string
          raw_data?: Json
          receipt_url?: string
          requested_at?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portfolio_transactions: {
        Row: {
          created_at: string
          currency: string
          exchange_rate: number
          fee_krw: number
          managed_portfolio_id: number
          memo: string | null
          portfolio_transaction_id: number
          quantity: number
          stock_id: number
          tax_krw: number
          traded_on: string
          transaction_type: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          exchange_rate?: number
          fee_krw?: number
          managed_portfolio_id: number
          memo?: string | null
          portfolio_transaction_id?: never
          quantity: number
          stock_id: number
          tax_krw?: number
          traded_on: string
          transaction_type: string
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          exchange_rate?: number
          fee_krw?: number
          managed_portfolio_id?: number
          memo?: string | null
          portfolio_transaction_id?: never
          quantity?: number
          stock_id?: number
          tax_krw?: number
          traded_on?: string
          transaction_type?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_transactions_managed_portfolio_id_managed_portfolios_"
            columns: ["managed_portfolio_id"]
            isOneToOne: false
            referencedRelation: "managed_portfolios"
            referencedColumns: ["managed_portfolio_id"]
          },
          {
            foreignKeyName: "portfolio_transactions_stock_id_stocks_stock_id_fk"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["stock_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          marketing_consent: boolean
          name: string
          preferred_goal_amount: number | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          marketing_consent?: boolean
          name: string
          preferred_goal_amount?: number | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          marketing_consent?: boolean
          name?: string
          preferred_goal_amount?: number | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_prices: {
        Row: {
          close: number
          created_at: string
          high: number | null
          low: number | null
          open: number | null
          stock_id: number
          stock_price_id: number
          trading_date: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          close: number
          created_at?: string
          high?: number | null
          low?: number | null
          open?: number | null
          stock_id: number
          stock_price_id?: never
          trading_date: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          close?: number
          created_at?: string
          high?: number | null
          low?: number | null
          open?: number | null
          stock_id?: number
          stock_price_id?: never
          trading_date?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_prices_stock_id_stocks_stock_id_fk"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["stock_id"]
          },
        ]
      }
      stocks: {
        Row: {
          country: string
          created_at: string
          currency: string
          exchange: string
          is_active: boolean
          name: string
          name_en: string | null
          security_type: string
          stock_id: number
          ticker: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          currency: string
          exchange: string
          is_active?: boolean
          name: string
          name_en?: string | null
          security_type: string
          stock_id?: never
          ticker: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          exchange?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          security_type?: string
          stock_id?: never
          ticker?: string
          updated_at?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
