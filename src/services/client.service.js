import apiService, { CLIENT_ENDPOINT } from './api.service';

const clientService = {
  async getClients() {
    return apiService.get(CLIENT_ENDPOINT);
  },

  async getClient(id) {
    return apiService.get(`${CLIENT_ENDPOINT}/${id}`);
  },

  async createClient(clientData) {
    if (!clientData.contacts) {
      clientData.contacts = [];
    }
    return apiService.post(CLIENT_ENDPOINT, clientData);
  },

  async updateClient(id, clientData) {
    if (clientData.contacts && Array.isArray(clientData.contacts)) {
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
    return apiService.put(`${CLIENT_ENDPOINT}/${id}`, clientData);
  },

  async deleteClient(id) {
    return apiService.delete(`${CLIENT_ENDPOINT}/${id}`);
  },

  async getClientContacts(clientId) {
    const client = await this.getClient(clientId);
    if (client && Array.isArray(client.contacts)) {
      return client.contacts;
    }
    return [];
  },

  async addClientContact(clientId, contactData) {
    return apiService.post(`${CLIENT_ENDPOINT}/${clientId}?action=addContact`, contactData);
  },

  async updateClientContact(clientId, contactId, contactData) {
    return apiService.put(`${CLIENT_ENDPOINT}/${clientId}?action=updateContact&contactId=${contactId}`, contactData);
  },

  async deleteClientContact(clientId, contactId) {
    return apiService.delete(`${CLIENT_ENDPOINT}/${clientId}?action=deleteContact&contactId=${contactId}`);
  },

  async getClientProjects(clientId) {
    return apiService.get('/.netlify/functions/projects', { clientId });
  }
};

export default clientService;
