import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const ENDPOINT = '/.netlify/functions/resources';

class ResourceService {
  async getResources(teamId) {
    try {
      const authStore = useAuthStore();
      const token = authStore.token;
      
      const params = teamId ? { teamId } : {};
      const response = await axios.get(ENDPOINT, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  }
  
  async getResource(id) {
    try {
      const authStore = useAuthStore();
      const token = authStore.token;
      
      const response = await axios.get(`${ENDPOINT}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching resource ${id}:`, error);
      throw error;
    }
  }
  
  async createResource(resourceData) {
    try {
      const authStore = useAuthStore();
      const token = authStore.token;
      
      const response = await axios.post(ENDPOINT, resourceData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  }
  
  async updateResource(id, resourceData) {
    try {
      const authStore = useAuthStore();
      const token = authStore.token;
      
      const response = await axios.put(`${ENDPOINT}/${id}`, resourceData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error updating resource ${id}:`, error);
      throw error;
    }
  }
  
  async deleteResource(id) {
    try {
      const authStore = useAuthStore();
      const token = authStore.token;
      
      const response = await axios.delete(`${ENDPOINT}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error deleting resource ${id}:`, error);
      throw error;
    }
  }
}

export default new ResourceService();