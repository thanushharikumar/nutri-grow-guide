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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      crop_analysis: {
        Row: {
          analysis_date: string
          confidence: number
          created_at: string
          crop_health: string
          deficiencies: Json
          id: string
          image_url: string | null
          recommendations: string[]
        }
        Insert: {
          analysis_date?: string
          confidence: number
          created_at?: string
          crop_health: string
          deficiencies?: Json
          id?: string
          image_url?: string | null
          recommendations?: string[]
        }
        Update: {
          analysis_date?: string
          confidence?: number
          created_at?: string
          crop_health?: string
          deficiencies?: Json
          id?: string
          image_url?: string | null
          recommendations?: string[]
        }
        Relationships: []
      }
      fertilizer_recommendations: {
        Row: {
          application_schedule: Json
          cost_estimate: number
          created_at: string
          crop_analysis_id: string | null
          crop_type: string
          expected_yield_increase: number
          id: string
          nitrogen_recommendation: number
          phosphorus_recommendation: number
          potassium_recommendation: number
          products: Json
          soil_data: Json
          sustainability_score: number
          weather_considerations: string[]
          weather_data: Json
        }
        Insert: {
          application_schedule?: Json
          cost_estimate: number
          created_at?: string
          crop_analysis_id?: string | null
          crop_type: string
          expected_yield_increase: number
          id?: string
          nitrogen_recommendation: number
          phosphorus_recommendation: number
          potassium_recommendation: number
          products?: Json
          soil_data: Json
          sustainability_score: number
          weather_considerations?: string[]
          weather_data: Json
        }
        Update: {
          application_schedule?: Json
          cost_estimate?: number
          created_at?: string
          crop_analysis_id?: string | null
          crop_type?: string
          expected_yield_increase?: number
          id?: string
          nitrogen_recommendation?: number
          phosphorus_recommendation?: number
          potassium_recommendation?: number
          products?: Json
          soil_data?: Json
          sustainability_score?: number
          weather_considerations?: string[]
          weather_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fertilizer_recommendations_crop_analysis_id_fkey"
            columns: ["crop_analysis_id"]
            isOneToOne: false
            referencedRelation: "crop_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      fertilizer_rules: {
        Row: {
          crop: string
          id: number
          k_min: number | null
          n_min: number | null
          p_min: number | null
          recommendation: string | null
        }
        Insert: {
          crop: string
          id?: never
          k_min?: number | null
          n_min?: number | null
          p_min?: number | null
          recommendation?: string | null
        }
        Update: {
          crop?: string
          id?: never
          k_min?: number | null
          n_min?: number | null
          p_min?: number | null
          recommendation?: string | null
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          input_data: Json
          model_version: string
          prediction_result: Json
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          input_data: Json
          model_version?: string
          prediction_result: Json
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          input_data?: Json
          model_version?: string
          prediction_result?: Json
        }
        Relationships: []
      }
      recommendation_logs: {
        Row: {
          crop: string | null
          id: number
          k: number | null
          n: number | null
          oc: number | null
          output: Json | null
          p: number | null
          ph: number | null
          ts: string | null
        }
        Insert: {
          crop?: string | null
          id?: never
          k?: number | null
          n?: number | null
          oc?: number | null
          output?: Json | null
          p?: number | null
          ph?: number | null
          ts?: string | null
        }
        Update: {
          crop?: string | null
          id?: never
          k?: number | null
          n?: number | null
          oc?: number | null
          output?: Json | null
          p?: number | null
          ph?: number | null
          ts?: string | null
        }
        Relationships: []
      }
      soil_health: {
        Row: {
          created_at: string
          electrical_conductivity: number | null
          id: string
          last_updated: string
          latitude: number
          longitude: number
          nitrogen: number
          organic_carbon: number
          ph: number
          phosphorus: number
          potassium: number
          region: string
          soil_type: string
        }
        Insert: {
          created_at?: string
          electrical_conductivity?: number | null
          id?: string
          last_updated?: string
          latitude: number
          longitude: number
          nitrogen?: number
          organic_carbon?: number
          ph: number
          phosphorus?: number
          potassium?: number
          region: string
          soil_type: string
        }
        Update: {
          created_at?: string
          electrical_conductivity?: number | null
          id?: string
          last_updated?: string
          latitude?: number
          longitude?: number
          nitrogen?: number
          organic_carbon?: number
          ph?: number
          phosphorus?: number
          potassium?: number
          region?: string
          soil_type?: string
        }
        Relationships: []
      }
      weather_data: {
        Row: {
          created_at: string
          description: string
          humidity: number
          id: string
          latitude: number
          location: string
          longitude: number
          rainfall: number
          recorded_at: string
          temperature: number
          wind_speed: number
        }
        Insert: {
          created_at?: string
          description: string
          humidity: number
          id?: string
          latitude: number
          location: string
          longitude: number
          rainfall?: number
          recorded_at?: string
          temperature: number
          wind_speed?: number
        }
        Update: {
          created_at?: string
          description?: string
          humidity?: number
          id?: string
          latitude?: number
          location?: string
          longitude?: number
          rainfall?: number
          recorded_at?: string
          temperature?: number
          wind_speed?: number
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
    Enums: {},
  },
} as const
