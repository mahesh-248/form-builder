import { 
  Form, 
  FormResponse, 
  FormAnalytics, 
  CreateFormRequest, 
  UpdateFormRequest, 
  SubmitResponseRequest,
  ResponsesResponse 
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api/v1${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Form endpoints
  async getForms(): Promise<Form[]> {
    return this.request<Form[]>('/forms');
  }

  async getForm(id: string): Promise<Form> {
    return this.request<Form>(`/forms/${id}`);
  }

  async getFormByToken(token: string): Promise<Form> {
    return this.request<Form>(`/public/${token}`);
  }

  async createForm(data: CreateFormRequest): Promise<Form> {
    return this.request<Form>('/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateForm(id: string, data: UpdateFormRequest): Promise<Form> {
    return this.request<Form>(`/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteForm(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/forms/${id}`, {
      method: 'DELETE',
    });
  }

  async publishForm(id: string, publish: boolean = true): Promise<{ message: string; form: Form }> {
    return this.request<{ message: string; form: Form }>(`/forms/${id}/publish?publish=${publish}`, {
      method: 'POST',
    });
  }

  async duplicateForm(id: string): Promise<Form> {
    return this.request<Form>(`/forms/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // Response endpoints
  async submitResponse(formId: string, data: SubmitResponseRequest): Promise<{ message: string; response: FormResponse }> {
    return this.request<{ message: string; response: FormResponse }>(`/forms/${formId}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getResponses(formId: string, page: number = 1, limit: number = 50): Promise<ResponsesResponse> {
    return this.request<ResponsesResponse>(`/forms/${formId}/responses?page=${page}&limit=${limit}`);
  }

  async getAnalytics(formId: string): Promise<FormAnalytics> {
    return this.request<FormAnalytics>(`/forms/${formId}/analytics`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
