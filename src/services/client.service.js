// src/services/client.service.js
import apiService, { CLIENT_ENDPOINT } from './api.service';

const clientService = {
  /**
   * Get a list of all clients for the current team
   * @returns {Promise<Array>} List of clients
   */
  async getClients() {
    try {
      return await apiService.get(CLIENT_ENDPOINT);
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific client by ID
   * @param {string} id Client ID
   * @returns {Promise<Object>} Client data
   */
  async getClient(id) {
    try {
      return await apiService.get(`${CLIENT_ENDPOINT}/${id}`);
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  },
  
  /**
   * Create a new client
   * @param {Object} clientData Client data to create
   * @returns {Promise<Object>} Newly created client
   */
  async createClient(clientData) {
    try {
      // Initialize empty contacts array
      if (!clientData.contacts) {
        clientData.contacts = [];
      }
      return await apiService.post(CLIENT_ENDPOINT, clientData);
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },
  
  /**
   * Update a client
   * @param {string} id Client ID
   * @param {Object} clientData Updated client data
   * @returns {Promise<Object>} Updated client
   */
  async updateClient(id, clientData) {
    try {
      console.log(`Updating client ${id} with data:`, clientData);
      
      // If we're updating client with contacts, make sure those are properly formatted
      if (clientData.contacts && Array.isArray(clientData.contacts)) {
        // Ensure each contact has required fields
        clientData.contacts = clientData.contacts.map(contact => {
          if (!contact.id) {
            contact.id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          
          if (!contact.createdAt) {
            contact.createdAt = new Date().toISOString();
          }
          
          return contact;
        });
      }
      
      const response = await apiService.put(`${CLIENT_ENDPOINT}/${id}`, clientData);
      return response;
    } catch (error) {
      // Check if this is a 404 but the client was actually updated
      if (error.status === 404 && error.message === 'Client not found after update') {
        // Try to get the client again - it might have been updated but had an issue fetching
        try {
          console.log('Client update succeeded but fetch failed, getting client again');
          return await this.getClient(id);
        } catch (getError) {
          console.error('Error fetching client after update:', getError);
        }
      }
      
      console.error('Error updating client:', error);
      throw error;
    }
  },
  
  /**
   * Delete a client
   * @param {string} id Client ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteClient(id) {
    try {
      return await apiService.delete(`${CLIENT_ENDPOINT}/${id}`);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  },
  
  /**
   * Get all contacts for a client
   * @param {string} clientId Client ID
   * @returns {Promise<Array>} List of contacts
   */
  async getClientContacts(clientId) {
    try {
      // First try to get the client with embedded contacts
      const client = await this.getClient(clientId);
      
      // If client has contacts array, return it
      if (client && Array.isArray(client.contacts)) {
        return client.contacts;
      }
      
      // Fallback to old API for backward compatibility
      const response = await apiService.get(`${CLIENT_ENDPOINT}/${clientId}/contacts`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching client contacts:', error);
      throw error;
    }
  },
  
  /**
   * Add a contact to a client
   * @param {string} clientId Client ID
   * @param {Object} contactData Contact data to add
   * @returns {Promise<Object>} Newly created contact
   */
  async addClientContact(clientId, contactData) {
    try {
      // Use the server-side endpoint directly with action parameter
      return await apiService.post(`${CLIENT_ENDPOINT}/${clientId}`, contactData, {
        params: { action: 'addContact' }
      });
    } catch (error) {
      // If it's a silent error, just return the contact data as if it succeeded
      if (error.silent) {
        console.log('Contact add completed via client update');
        return {
          ...contactData,
          id: `contact_${Date.now()}`,
          createdAt: new Date().toISOString()
        };
      }
      console.error('Error adding client contact:', error);
      throw error;
    }
  },
  
  /**
   * Update a client contact
   * @param {string} clientId Client ID
   * @param {string} contactId Contact ID
   * @param {Object} contactData Updated contact data
   * @returns {Promise<Object>} Updated contact
   */
  async updateClientContact(clientId, contactId, contactData) {
    try {
      return await apiService.put(`${CLIENT_ENDPOINT}/${clientId}`, contactData, {
        params: { action: 'updateContact', contactId }
      });
    } catch (error) {
      // If it's a silent error, just return the contact data as if it succeeded
      if (error.silent) {
        console.log('Contact update completed via client update');
        return {
          ...contactData,
          id: contactId,
          updatedAt: new Date().toISOString()
        };
      }
      console.error('Error updating client contact:', error);
      throw error;
    }
  },
  
  /**
   * Delete a client contact
   * @param {string} clientId Client ID
   * @param {string} contactId Contact ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteClientContact(clientId, contactId) {
    try {
      // Make it absolutely clear this is a contact deletion
      console.log(`Deleting CONTACT ${contactId} from client ${clientId}`);
      return await apiService.delete(`${CLIENT_ENDPOINT}/${clientId}`, {
        params: { 
          action: 'deleteContact', 
          contactId 
        }
      });
    } catch (error) {
      // If it's a silent error, just return success as the client was already updated
      if (error.silent) {
        console.log('Contact deletion completed via client update');
        return { success: true };
      }
      console.error('Error deleting client contact:', error);
      throw error;
    }
  },
  
  /**
   * Run the contact migration to fix contacts structure
   * @returns {Promise<Object>} Migration result
   */
  async runContactMigration() {
    try {
      return await apiService.post('/.netlify/functions/migration-fix-contacts');
    } catch (error) {
      console.error('Error running migration:', error);
      throw error;
    }
  },
  
  /**
   * Get client projects (not used - project service handles this)
   * @param {string} clientId Client ID
   * @returns {Promise<Array>} List of projects
   */
  async getClientProjects(clientId) {
    try {
      // This should use the project service directly
      const response = await apiService.get(`/.netlify/functions/projects`, {
        params: { clientId }
      });

      // If we get a successful response
      if (response && Array.isArray(response)) {
        // Find the client and update its projects array
        try {
          const client = await this.getClient(clientId);
          if (client) {
            // Update client with projects
            client.projects = response;
            await this.updateClient(clientId, {
              ...client,
              projects: response
            });
          }
        } catch (clientError) {
          console.warn('Could not update client with projects:', clientError);
        }
        
        return response;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching client projects:', error);
      throw error;
    }
  }
};

export default clientService; 