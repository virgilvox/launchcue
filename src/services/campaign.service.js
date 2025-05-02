// src/services/campaign.service.js (Revised)
import apiService, { CAMPAIGN_ENDPOINT } from './api.service';

class CampaignService {
  async getCampaigns(params={}) {
    try {
      return await apiService.get(CAMPAIGN_ENDPOINT, params);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getCampaign(id) {
    try {
      return await apiService.get(`${CAMPAIGN_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error fetching campaign ${id}:`, error);
      throw error;
    }
  }

  async createCampaign(data) {
    try {
      return await apiService.post(CAMPAIGN_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async updateCampaign(id, data) {
    try {
      return await apiService.put(`${CAMPAIGN_ENDPOINT}/${id}`, data);
    } catch (error) {
      console.error(`Error updating campaign ${id}:`, error);
      throw error;
    }
  }

  async deleteCampaign(id) {
    try {
      return await apiService.delete(`${CAMPAIGN_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error deleting campaign ${id}:`, error);
      throw error;
    }
  }
  
  // Added based on component usage
  async getCampaignSteps(campaignId) {
    try {
      // Assuming an endpoint structure like /campaigns/{id}/steps
      return await apiService.get(`${CAMPAIGN_ENDPOINT}/${campaignId}/steps`);
    } catch (error) {
      console.error(`Error fetching steps for campaign ${campaignId}:`, error);
      throw error;
    }
  }
  
  // Added based on component usage
  async exportCampaign(campaignId, format) {
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