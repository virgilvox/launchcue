import { defineStore } from 'pinia';
import { ref } from 'vue';
import resourceService from '@/services/resource.service';
import { useTeamStore } from './team';

export const useResourceStore = defineStore('resource', () => {
  const resources = ref([]);
  const currentResource = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  
  const teamStore = useTeamStore();
  
  async function fetchResources() {
    try {
      isLoading.value = true;
      error.value = null;
      
      const currentTeam = teamStore.currentTeam;
      const teamId = currentTeam?.id;
      
      if (!teamId) {
        error.value = 'No team selected';
        return [];
      }
      
      const data = await resourceService.getResources(teamId);
      resources.value = data;
      return data;
    } catch (err) {
      console.error('Error fetching resources:', err);
      error.value = err.message || 'Failed to load resources';
      return [];
    } finally {
      isLoading.value = false;
    }
  }
  
  async function fetchResource(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const data = await resourceService.getResource(id);
      currentResource.value = data;
      return data;
    } catch (err) {
      console.error(`Error fetching resource ${id}:`, err);
      error.value = err.message || `Failed to load resource ${id}`;
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function createResource(resourceData) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const currentTeam = teamStore.currentTeam;
      
      // Add team ID if not provided
      if (!resourceData.teamId && currentTeam) {
        resourceData.teamId = currentTeam.id;
      }
      
      const data = await resourceService.createResource(resourceData);
      resources.value.push(data);
      return data;
    } catch (err) {
      console.error('Error creating resource:', err);
      error.value = err.message || 'Failed to create resource';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function updateResource(id, resourceData) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const data = await resourceService.updateResource(id, resourceData);
      
      // Update in the resources array
      const index = resources.value.findIndex(r => r.id === id);
      if (index !== -1) {
        resources.value[index] = data;
      }
      
      // Update current resource if it's the one being edited
      if (currentResource.value && currentResource.value.id === id) {
        currentResource.value = data;
      }
      
      return data;
    } catch (err) {
      console.error(`Error updating resource ${id}:`, err);
      error.value = err.message || `Failed to update resource ${id}`;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function deleteResource(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      await resourceService.deleteResource(id);
      
      // Remove from the resources array
      resources.value = resources.value.filter(r => r.id !== id);
      
      // Clear current resource if it's the one being deleted
      if (currentResource.value && currentResource.value.id === id) {
        currentResource.value = null;
      }
      
      return true;
    } catch (err) {
      console.error(`Error deleting resource ${id}:`, err);
      error.value = err.message || `Failed to delete resource ${id}`;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  return {
    resources,
    currentResource,
    isLoading,
    error,
    fetchResources,
    fetchResource,
    createResource,
    updateResource,
    deleteResource
  };
}); 