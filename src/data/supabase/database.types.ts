export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      attachment_upload_reservations: {
        Row: {
          completed_at: string | null;
          created_at: string;
          expected_mime: string;
          expected_size: number;
          expires_at: string;
          failed_at: string | null;
          failure_code: string | null;
          id: string;
          linked_entity_id: string | null;
          linked_entity_type: string | null;
          object_path: string;
          owner_id: string;
          request_id: string;
          status: string;
          updated_at: string;
          uploaded_at: string | null;
          vehicle_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          expected_mime: string;
          expected_size: number;
          expires_at: string;
          failed_at?: string | null;
          failure_code?: string | null;
          id?: string;
          linked_entity_id?: string | null;
          linked_entity_type?: string | null;
          object_path: string;
          owner_id: string;
          request_id: string;
          status?: string;
          updated_at?: string;
          uploaded_at?: string | null;
          vehicle_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          expected_mime?: string;
          expected_size?: number;
          expires_at?: string;
          failed_at?: string | null;
          failure_code?: string | null;
          id?: string;
          linked_entity_id?: string | null;
          linked_entity_type?: string | null;
          object_path?: string;
          owner_id?: string;
          request_id?: string;
          status?: string;
          updated_at?: string;
          uploaded_at?: string | null;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attachment_upload_reservations_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      body_part_conditions: {
        Row: {
          condition: Database['public']['Enums']['body_condition'];
          created_at: string;
          id: string;
          note: string | null;
          owner_id: string;
          part_key: string;
          schema_type: Database['public']['Enums']['body_type'];
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          condition?: Database['public']['Enums']['body_condition'];
          created_at?: string;
          id?: string;
          note?: string | null;
          owner_id: string;
          part_key: string;
          schema_type: Database['public']['Enums']['body_type'];
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          condition?: Database['public']['Enums']['body_condition'];
          created_at?: string;
          id?: string;
          note?: string | null;
          owner_id?: string;
          part_key?: string;
          schema_type?: Database['public']['Enums']['body_type'];
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'body_part_conditions_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      expertise_reports: {
        Row: {
          attachment_path: string | null;
          company_name: string | null;
          created_at: string;
          id: string;
          overall_note: string | null;
          owner_id: string;
          report_date: string | null;
          report_number: string | null;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          attachment_path?: string | null;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          overall_note?: string | null;
          owner_id: string;
          report_date?: string | null;
          report_number?: string | null;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          attachment_path?: string | null;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          overall_note?: string | null;
          owner_id?: string;
          report_date?: string | null;
          report_number?: string | null;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expertise_reports_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          due_date: string | null;
          due_kilometer: number | null;
          id: string;
          notification_id: string | null;
          notification_error_code: string | null;
          notification_last_attempt_at: string | null;
          notification_status: 'pending' | 'scheduled' | 'not_required' | 'permission_denied' | 'failed';
          owner_id: string;
          reminder_type: Database['public']['Enums']['reminder_type'];
          title: string;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          due_date?: string | null;
          due_kilometer?: number | null;
          id?: string;
          notification_id?: string | null;
          notification_error_code?: string | null;
          notification_last_attempt_at?: string | null;
          notification_status?: 'pending' | 'scheduled' | 'not_required' | 'permission_denied' | 'failed';
          owner_id: string;
          reminder_type: Database['public']['Enums']['reminder_type'];
          title: string;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          due_date?: string | null;
          due_kilometer?: number | null;
          id?: string;
          notification_id?: string | null;
          notification_error_code?: string | null;
          notification_last_attempt_at?: string | null;
          notification_status?: 'pending' | 'scheduled' | 'not_required' | 'permission_denied' | 'failed';
          owner_id?: string;
          reminder_type?: Database['public']['Enums']['reminder_type'];
          title?: string;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicle_documents: {
        Row: {
          attachment_path: string | null;
          created_at: string;
          document_number: string | null;
          document_type: Database['public']['Enums']['document_type'];
          expiry_date: string | null;
          id: string;
          issue_date: string | null;
          note: string | null;
          owner_id: string;
          title: string;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          attachment_path?: string | null;
          created_at?: string;
          document_number?: string | null;
          document_type: Database['public']['Enums']['document_type'];
          expiry_date?: string | null;
          id?: string;
          issue_date?: string | null;
          note?: string | null;
          owner_id: string;
          title: string;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          attachment_path?: string | null;
          created_at?: string;
          document_number?: string | null;
          document_type?: Database['public']['Enums']['document_type'];
          expiry_date?: string | null;
          id?: string;
          issue_date?: string | null;
          note?: string | null;
          owner_id?: string;
          title?: string;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_documents_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicle_notes: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          owner_id: string;
          title: string;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          owner_id: string;
          title: string;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          owner_id?: string;
          title?: string;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_notes_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicle_records: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          kilometer: number | null;
          liters: number | null;
          owner_id: string;
          record_date: string;
          record_type: Database['public']['Enums']['record_type'];
          source: 'manual' | 'receipt_ocr' | 'service' | 'obd' | 'connected_vehicle' | 'import';
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kilometer?: number | null;
          liters?: number | null;
          owner_id: string;
          record_date: string;
          record_type: Database['public']['Enums']['record_type'];
          source?: 'manual' | 'receipt_ocr' | 'service' | 'obd' | 'connected_vehicle' | 'import';
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kilometer?: number | null;
          liters?: number | null;
          owner_id?: string;
          record_date?: string;
          record_type?: Database['public']['Enums']['record_type'];
          source?: 'manual' | 'receipt_ocr' | 'service' | 'obd' | 'connected_vehicle' | 'import';
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_records_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_items: {
        Row: {
          cost: number | null;
          created_at: string;
          id: string;
          item_type: string;
          maintenance_record_id: string;
          note: string | null;
          owner_id: string;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          item_type: string;
          maintenance_record_id: string;
          note?: string | null;
          owner_id: string;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          item_type?: string;
          maintenance_record_id?: string;
          note?: string | null;
          owner_id?: string;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [];
      };
      maintenance_templates: {
        Row: {
          created_at: string;
          id: string;
          item_definitions: string[];
          owner_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_definitions: string[];
          owner_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_definitions?: string[];
          owner_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          archived_at: string | null;
          body_type: Database['public']['Enums']['body_type'];
          brand: string;
          color: string | null;
          created_at: string;
          current_km: number;
          fuel_type: Database['public']['Enums']['fuel_type'];
          id: string;
          model: string;
          owner_id: string;
          plate: string | null;
          updated_at: string;
          year: number | null;
        };
        Insert: {
          archived_at?: string | null;
          body_type: Database['public']['Enums']['body_type'];
          brand: string;
          color?: string | null;
          created_at?: string;
          current_km?: number;
          fuel_type: Database['public']['Enums']['fuel_type'];
          id?: string;
          model: string;
          owner_id: string;
          plate?: string | null;
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          archived_at?: string | null;
          body_type?: Database['public']['Enums']['body_type'];
          brand?: string;
          color?: string | null;
          created_at?: string;
          current_km?: number;
          fuel_type?: Database['public']['Enums']['fuel_type'];
          id?: string;
          model?: string;
          owner_id?: string;
          plate?: string | null;
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clear_vehicle_documents_consistent: {
        Args: { p_vehicle_id: string };
        Returns: number;
      };
      delete_expertise_report_consistent: {
        Args: { p_id: string };
        Returns: boolean;
      };
      delete_vehicle_document_consistent: {
        Args: { p_id: string };
        Returns: boolean;
      };
      delete_vehicle_consistent: {
        Args: { p_vehicle_id: string };
        Returns: boolean;
      };
      reconcile_my_attachment_metadata: { Args: Record<PropertyKey, never>; Returns: number };
      request_attachment_cleanup: { Args: { p_object_path: string }; Returns: boolean };
      reserve_attachment_upload: {
        Args: {
          p_mime_type: string;
          p_owner_id: string;
          p_request_id: string;
          p_size_bytes: number;
          p_vehicle_id: string;
        };
        Returns: { object_path: string; reservation_id: string; reservation_status: string }[];
      };
      save_expertise_report_consistent: {
        Args: {
          p_attachment_path: string | null;
          p_company_name: string | null;
          p_id: string | null;
          p_overall_note: string | null;
          p_report_date: string | null;
          p_report_number: string | null;
          p_vehicle_id: string;
        };
        Returns: Database['public']['Tables']['expertise_reports']['Row'];
      };
      save_vehicle_document_consistent: {
        Args: {
          p_attachment_path: string | null;
          p_document_number: string | null;
          p_document_type: Database['public']['Enums']['document_type'];
          p_expiry_date: string | null;
          p_id: string | null;
          p_issue_date: string | null;
          p_note: string | null;
          p_title: string;
          p_vehicle_id: string;
        };
        Returns: Database['public']['Tables']['vehicle_documents']['Row'];
      };
      save_vehicle_record_atomic: {
        Args: {
          p_amount: number;
          p_category: string;
          p_description: string | null;
          p_kilometer: number | null;
          p_liters: number | null;
          p_record_date: string;
          p_record_id: string | null;
          p_record_type: Database['public']['Enums']['record_type'];
          p_request_id: string;
          p_vehicle_id: string;
        };
        Returns: Database['public']['Tables']['vehicle_records']['Row'];
      };
      save_maintenance_record_atomic: {
        Args: {
          p_amount: number;
          p_category: string;
          p_description: string | null;
          p_item_types: string[];
          p_kilometer: number | null;
          p_record_date: string;
          p_record_id: string | null;
          p_request_id: string;
          p_vehicle_id: string;
        };
        Returns: Database['public']['Tables']['vehicle_records']['Row'];
      };
    };
    Enums: {
      body_condition:
        'original' | 'painted' | 'locally_painted' | 'replaced' | 'damaged' | 'unknown';
      body_type: 'sedan_hatchback' | 'suv_crossover' | 'pickup_light_commercial';
      document_type:
        | 'registration'
        | 'traffic_insurance'
        | 'comprehensive_insurance'
        | 'inspection'
        | 'tax'
        | 'service_document'
        | 'expertise_report'
        | 'invoice'
        | 'custom';
      fuel_type: 'gasoline' | 'diesel' | 'lpg' | 'electric' | 'hybrid';
      record_type: 'fuel' | 'maintenance' | 'expense';
      reminder_type:
        | 'inspection'
        | 'traffic_insurance'
        | 'comprehensive_insurance'
        | 'motor_vehicle_tax'
        | 'periodic_maintenance'
        | 'tire_change'
        | 'custom';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      body_condition: ['original', 'painted', 'locally_painted', 'replaced', 'damaged', 'unknown'],
      body_type: ['sedan_hatchback', 'suv_crossover', 'pickup_light_commercial'],
      document_type: [
        'registration',
        'traffic_insurance',
        'comprehensive_insurance',
        'inspection',
        'tax',
        'service_document',
        'expertise_report',
        'invoice',
        'custom',
      ],
      fuel_type: ['gasoline', 'diesel', 'lpg', 'electric', 'hybrid'],
      record_type: ['fuel', 'maintenance', 'expense'],
      reminder_type: [
        'inspection',
        'traffic_insurance',
        'comprehensive_insurance',
        'motor_vehicle_tax',
        'periodic_maintenance',
        'tire_change',
        'custom',
      ],
    },
  },
} as const;
