import apiService, { CAMPAIGN_ENDPOINT } from './api.service';
import type { Campaign, CampaignStep } from '@/types/models';
import type { CampaignCreateRequest } from '@/types/api';

interface CampaignFilter {
  clientId?: string;
  projectId?: string;
  status?: string;
  [key: string]: unknown;
}

class CampaignService {
  async getCampaigns(params: CampaignFilter = {}): Promise<Campaign[]> {
    try {
      return await apiService.get<Campaign[]>(CAMPAIGN_ENDPOINT, params as Record<string, unknown>);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getCampaign(id: string): Promise<Campaign> {
    try {
      return await apiService.get<Campaign>(`${CAMPAIGN_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error fetching campaign ${id}:`, error);
      throw error;
    }
  }

  async createCampaign(data: CampaignCreateRequest): Promise<Campaign> {
    try {
      return await apiService.post<Campaign>(CAMPAIGN_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async updateCampaign(id: string, data: Partial<CampaignCreateRequest>): Promise<Campaign> {
    try {
      return await apiService.put<Campaign>(`${CAMPAIGN_ENDPOINT}/${id}`, data);
    } catch (error) {
      console.error(`Error updating campaign ${id}:`, error);
      throw error;
    }
  }

  async deleteCampaign(id: string): Promise<unknown> {
    try {
      return await apiService.delete(`${CAMPAIGN_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error deleting campaign ${id}:`, error);
      throw error;
    }
  }

  // Added based on component usage
  async getCampaignSteps(campaignId: string): Promise<CampaignStep[]> {
    try {
      // Assuming an endpoint structure like /campaigns/{id}/steps
      return await apiService.get<CampaignStep[]>(`${CAMPAIGN_ENDPOINT}/${campaignId}/steps`);
    } catch (error) {
      console.error(`Error fetching steps for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  // Added based on component usage
  async exportCampaign(campaignId: string, format: string): Promise<unknown> {
     try {
       // Assuming an endpoint structure like /campaigns/{id}/export?format=markdown
       return await apiService.get(`${CAMPAIGN_ENDPOINT}/${campaignId}/export`, { format });
     } catch (error) {
       console.error(`Error exporting campaign ${campaignId}:`, error);
       throw error;
     }
  }
}

export default new CampaignService();
