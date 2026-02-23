import apiService, { CLIENT_ENDPOINT } from './api.service';
import type { Client, Contact, Project } from '@/types/models';
import type { ClientCreateRequest, ClientUpdateRequest } from '@/types/api';

interface ClientServiceInterface {
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client>;
  createClient(clientData: ClientCreateRequest & { contacts?: Contact[] }): Promise<Client>;
  updateClient(id: string, clientData: Partial<ClientUpdateRequest> & { contacts?: Partial<Contact>[] }): Promise<Client>;
  deleteClient(id: string): Promise<unknown>;
  getClientContacts(clientId: string): Promise<Contact[]>;
  addClientContact(clientId: string, contactData: Partial<Contact>): Promise<Client>;
  updateClientContact(clientId: string, contactId: string, contactData: Partial<Contact>): Promise<Client>;
  deleteClientContact(clientId: string, contactId: string): Promise<unknown>;
  getClientProjects(clientId: string): Promise<Project[]>;
}

const clientService: ClientServiceInterface = {
  async getClients(): Promise<Client[]> {
    return apiService.get<Client[]>(CLIENT_ENDPOINT);
  },

  async getClient(id: string): Promise<Client> {
    return apiService.get<Client>(`${CLIENT_ENDPOINT}/${id}`);
  },

  async createClient(clientData: ClientCreateRequest & { contacts?: Contact[] }): Promise<Client> {
    if (!clientData.contacts) {
      clientData.contacts = [];
    }
    return apiService.post<Client>(CLIENT_ENDPOINT, clientData);
  },

  async updateClient(id: string, clientData: Partial<ClientUpdateRequest> & { contacts?: Partial<Contact>[] }): Promise<Client> {
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
    return apiService.put<Client>(`${CLIENT_ENDPOINT}/${id}`, clientData);
  },

  async deleteClient(id: string): Promise<unknown> {
    return apiService.delete(`${CLIENT_ENDPOINT}/${id}`);
  },

  async getClientContacts(clientId: string): Promise<Contact[]> {
    const client = await this.getClient(clientId);
    if (client && Array.isArray(client.contacts)) {
      return client.contacts;
    }
    return [];
  },

  async addClientContact(clientId: string, contactData: Partial<Contact>): Promise<Client> {
    return apiService.post<Client>(`${CLIENT_ENDPOINT}/${clientId}?action=addContact`, contactData);
  },

  async updateClientContact(clientId: string, contactId: string, contactData: Partial<Contact>): Promise<Client> {
    return apiService.put<Client>(`${CLIENT_ENDPOINT}/${clientId}?action=updateContact&contactId=${contactId}`, contactData);
  },

  async deleteClientContact(clientId: string, contactId: string): Promise<unknown> {
    return apiService.delete(`${CLIENT_ENDPOINT}/${clientId}?action=deleteContact&contactId=${contactId}`);
  },

  async getClientProjects(clientId: string): Promise<Project[]> {
    return apiService.get<Project[]>('/.netlify/functions/projects', { clientId });
  }
};

export default clientService;
