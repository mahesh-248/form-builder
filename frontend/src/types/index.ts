export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'email' 
  | 'number' 
  | 'multiple_choice' 
  | 'checkbox' 
  | 'rating' 
  | 'date';

export interface ValidationRule {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
  validation: ValidationRule;
  order: number;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  is_published: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  responses: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface FormAnalytics {
  form_id: string;
  total_responses: number;
  responses_last_24h: number;
  responses_last_week: number;
  responses_last_month: number;
  field_analytics: Record<string, any>;
  updated_at: string;
}

export interface CreateFormRequest {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  fields?: FormField[];
  is_published?: boolean;
}

export interface SubmitResponseRequest {
  responses: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResponsesResponse {
  responses: FormResponse[];
  pagination: PaginationInfo;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  form_id?: string;
  data: any;
  event_id?: string;
}

// Form builder state types
export interface FormBuilderState {
  form: Partial<Form>;
  fields: FormField[];
  selectedField: FormField | null;
  isDirty: boolean;
  isLoading: boolean;
  errors: Record<string, string>;
}

// Form renderer state types
export interface FormRendererState {
  responses: Record<string, any>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  currentStep: number;
}

// Analytics chart types
export type ChartType = 'bar' | 'pie' | 'line' | 'area';

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface AnalyticsCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: string;
}
