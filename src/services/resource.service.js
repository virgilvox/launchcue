import apiService, { RESOURCE_ENDPOINT } from './api.service';

class ResourceService {
  async getResources(teamId) {
    const params = teamId ? { teamId } : {};
    return apiService.get(RESOURCE_ENDPOINT, params);
  }

  async getResource(id) {
    return apiService.get(`${RESOURCE_ENDPOINT}/${id}`);
  }

  async createResource(resourceData) {
    return apiService.post(RESOURCE_ENDPOINT, resourceData);
  }

  async updateResource(id, resourceData) {
    return apiService.put(`${RESOURCE_ENDPOINT}/${id}`, resourceData);
  }

  async deleteResource(id) {
    return apiService.delete(`${RESOURCE_ENDPOINT}/${id}`);
  }
}

export default new ResourceService();
