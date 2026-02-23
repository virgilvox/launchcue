import apiService, { RESOURCE_ENDPOINT } from './api.service';
import type { Resource } from '@/types/models';
import type { ResourceCreateRequest } from '@/types/api';

class ResourceService {
  async getResources(teamId?: string): Promise<Resource[]> {
    const params: Record<string, string> = teamId ? { teamId } : {};
    return apiService.get<Resource[]>(RESOURCE_ENDPOINT, params);
  }

  async getResource(id: string): Promise<Resource> {
    return apiService.get<Resource>(`${RESOURCE_ENDPOINT}/${id}`);
  }

  async createResource(resourceData: ResourceCreateRequest): Promise<Resource> {
    return apiService.post<Resource>(RESOURCE_ENDPOINT, resourceData);
  }

  async updateResource(id: string, resourceData: Partial<ResourceCreateRequest>): Promise<Resource> {
    return apiService.put<Resource>(`${RESOURCE_ENDPOINT}/${id}`, resourceData);
  }

  async deleteResource(id: string): Promise<unknown> {
    return apiService.delete(`${RESOURCE_ENDPOINT}/${id}`);
  }
}

export default new ResourceService();
