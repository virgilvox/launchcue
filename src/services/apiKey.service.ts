import apiService, { API_KEY_ENDPOINT } from './api.service';
import type { ApiKey } from '@/types/models';
import type { ApiKeyCreateRequest, ApiKeyCreateResponse } from '@/types/api';

class ApiKeyService {
  async getKeys(): Promise<ApiKey[]> {
    try {
      return await apiService.get<ApiKey[]>(API_KEY_ENDPOINT);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      throw error;
    }
  }

  async createKey(data: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> {
    try {
      // The backend should return { name, prefix, apiKey (full key, one time) }
      return await apiService.post<ApiKeyCreateResponse>(API_KEY_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  }

  async deleteKey(keyPrefix: string): Promise<unknown> {
    try {
      // Use prefix in the URL for deletion
      return await apiService.delete(`${API_KEY_ENDPOINT}/${keyPrefix}`);
    } catch (error) {
      console.error(`Error deleting API key with prefix ${keyPrefix}:`, error);
      throw error;
    }
  }
}

export default new ApiKeyService();
