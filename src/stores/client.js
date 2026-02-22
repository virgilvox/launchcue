import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';
import { useToast } from 'vue-toastification';
import clientService from '../services/client.service';

export const useClientStore = defineStore('client', () => {
  const clients = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const authStore = useAuthStore();
  const toast = useToast();
  
  async function fetchClients() {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' };
    
    loading.value = true;
    error.value = null;
    
    try {
      // Get clients from service
      const response = await clientService.getClients();
      
      // Store clients
      clients.value = response;
      loading.value = false;
      
      return response;
    } catch (err) {
      console.error('Error fetching clients:', err);
      error.value = err.message || 'Failed to fetch clients';
      loading.value = false;
      toast.error('Failed to fetch clients');
      return { success: false, error: error.value };
    }
  }
  
  async function getClient(id) {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' };
    
    try {
      // Check if we already have the client in state
      const cachedClient = clients.value.find(c => c.id === id);
      
      if (cachedClient) {
        return { success: true, client: cachedClient };
      }
      
      // Otherwise fetch from API
      const response = await clientService.getClient(id);
      return { success: true, client: response };
    } catch (err) {
      console.error('Error getting client:', err);
      toast.error('Failed to load client details');
      return { success: false, error: err.message || 'Failed to get client' };
    }
  }
  
  async function createClient(clientData) {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' };
    
    try {
      const response = await clientService.createClient({
        ...clientData,
        teamId: authStore.currentTeam.id
      });
      
      // Add to local state
      clients.value.push(response);
      
      toast.success('Client created successfully');
      return { success: true, client: response };
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error('Failed to create client');
      return { success: false, error: err.message || 'Failed to create client' };
    }
  }
  
  async function updateClient(id, clientData) {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' };
    
    try {
      const response = await clientService.updateClient(id, clientData);
      
      // Update in local state
      const index = clients.value.findIndex(c => c.id === id);
      
      if (index !== -1) {
        clients.value[index] = response;
      }
      
      toast.success('Client updated successfully');
      return { success: true, client: response };
    } catch (err) {
      console.error('Error updating client:', err);
      toast.error('Failed to update client');
      return { success: false, error: err.message || 'Failed to update client' };
    }
  }
  
  async function deleteClient(id) {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' };
    
    try {
      await clientService.deleteClient(id);
      
      // Remove from local state
      const index = clients.value.findIndex(c => c.id === id);
      
      if (index !== -1) {
        clients.value.splice(index, 1);
      }
      
      toast.success('Client deleted successfully');
      return { success: true };
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('Failed to delete client');
      return { success: false, error: err.message || 'Failed to delete client' };
    }
  }
  
  async function getClientContacts(clientId) {
    try {
      const response = await clientService.getClientContacts(clientId);
      return { success: true, contacts: response };
    } catch (err) {
      console.error('Error fetching client contacts:', err);
      toast.error('Failed to load client contacts');
      return { success: false, error: err.message || 'Failed to fetch client contacts' };
    }
  }
  
  async function getClientProjects(clientId) {
    try {
      const response = await clientService.getClientProjects(clientId);
      return { success: true, projects: response };
    } catch (err) {
      console.error('Error fetching client projects:', err);
      toast.error('Failed to load client projects');
      return { success: false, error: err.message || 'Failed to fetch client projects' };
    }
  }
  
  async function runContactMigration() {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await clientService.runContactMigration();
      
      toast.success('Contact migration completed successfully');
      console.log('Migration result:', response);
      
      // Reload clients to get updated list
      await fetchClients();
      
      return { success: true, result: response };
    } catch (err) {
      console.error('Error running contact migration:', err);
      error.value = err.message || 'Failed to run contact migration';
      toast.error('Failed to run contact migration');
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  }
  
  return {
    clients,
    loading,
    error,
    fetchClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getClientContacts,
    getClientProjects,
    runContactMigration
  };
}); 