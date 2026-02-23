import apiService, { SCOPE_TEMPLATE_ENDPOINT, SCOPE_ENDPOINT } from './api.service';
import type { ScopeTemplate, Scope } from '@/types/models';
import type { ScopeTemplateCreateRequest, ScopeCreateRequest } from '@/types/api';

class ScopeService {
  async getScopeTemplates(): Promise<ScopeTemplate[]> {
    return apiService.get<ScopeTemplate[]>(SCOPE_TEMPLATE_ENDPOINT);
  }

  async getScopeTemplate(id: string): Promise<ScopeTemplate> {
    return apiService.get<ScopeTemplate>(`${SCOPE_TEMPLATE_ENDPOINT}/${id}`);
  }

  async createScopeTemplate(data: ScopeTemplateCreateRequest): Promise<ScopeTemplate> {
    return apiService.post<ScopeTemplate>(SCOPE_TEMPLATE_ENDPOINT, data);
  }

  async updateScopeTemplate(id: string, data: Partial<ScopeTemplateCreateRequest>): Promise<ScopeTemplate> {
    return apiService.put<ScopeTemplate>(`${SCOPE_TEMPLATE_ENDPOINT}/${id}`, data);
  }

  async deleteScopeTemplate(id: string): Promise<unknown> {
    return apiService.delete(`${SCOPE_TEMPLATE_ENDPOINT}/${id}`);
  }

  async getScopes(params?: { projectId?: string; clientId?: string; status?: string }): Promise<Scope[]> {
    const queryParams: Record<string, string> = {};
    if (params?.projectId) queryParams.projectId = params.projectId;
    if (params?.clientId) queryParams.clientId = params.clientId;
    if (params?.status) queryParams.status = params.status;
    return apiService.get<Scope[]>(SCOPE_ENDPOINT, queryParams);
  }

  async getScope(id: string): Promise<Scope> {
    return apiService.get<Scope>(`${SCOPE_ENDPOINT}/${id}`);
  }

  async createScope(data: ScopeCreateRequest): Promise<Scope> {
    return apiService.post<Scope>(SCOPE_ENDPOINT, data);
  }

  async createScopeFromTemplate(templateId: string, overrides?: Partial<ScopeCreateRequest>): Promise<Scope> {
    return apiService.post<Scope>(SCOPE_ENDPOINT, { ...overrides, templateId });
  }

  async updateScope(id: string, data: Partial<ScopeCreateRequest>): Promise<Scope> {
    return apiService.put<Scope>(`${SCOPE_ENDPOINT}/${id}`, data);
  }

  async deleteScope(id: string): Promise<unknown> {
    return apiService.delete(`${SCOPE_ENDPOINT}/${id}`);
  }
}

export default new ScopeService();
